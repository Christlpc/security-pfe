#!/bin/bash
# ============================================================
# NSIA Bancassurance — Script de Déploiement K8s
# Security Fabric complète sur K3s
# ============================================================
set -euo pipefail

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   NSIA Security Fabric — Déploiement Kubernetes (K3s)   ║"
echo "╚══════════════════════════════════════════════════════════╝"

K8S_DIR="$(cd "$(dirname "$0")" && pwd)"

# === Pré-requis ===
echo ""
echo "🔧 [PRÉ-REQUIS] Configuration du système..."
sudo sysctl -w vm.max_map_count=262144 2>/dev/null || true
grep -q "vm.max_map_count=262144" /etc/sysctl.conf || \
  echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf

# === Phase 0 : Namespaces + NetworkPolicies ===
echo ""
echo "🏗️  [PHASE 0] Création des Namespaces et NetworkPolicies..."
kubectl apply -f "$K8S_DIR/00-namespaces.yaml"
kubectl apply -f "$K8S_DIR/01-network-policies/"
echo "   ✓ 4 namespaces créés (nsia-ingress, nsia-iam, nsia-backend, nsia-security)"
echo "   ✓ 4 NetworkPolicies Zero Trust appliquées"

# === Phase 1 : Vault ===
echo ""
echo "🔐 [PHASE 1] Déploiement de HashiCorp Vault..."
kubectl apply -f "$K8S_DIR/nsia-security/vault/"
echo "   ⏳ Attente du pod Vault..."
kubectl wait --for=condition=ready pod -l app=vault -n nsia-security --timeout=120s
echo "   ✓ Vault déployé"
echo ""
echo "   ⚠️  IMPORTANT : Initialiser Vault manuellement :"
echo "   kubectl exec -n nsia-security deployment/vault -- vault operator init -key-shares=3 -key-threshold=2"
echo "   Puis unseal avec 2 des 3 clés."

# === Phase 2a : IAM Database ===
echo ""
echo "🗄️  [PHASE 2a] Déploiement PostgreSQL (Keycloak)..."
kubectl apply -f "$K8S_DIR/nsia-iam/secret-keycloak.yaml"
kubectl apply -f "$K8S_DIR/nsia-iam/pvc-iam-db.yaml"
kubectl apply -f "$K8S_DIR/nsia-iam/deployment-iam-db.yaml"
kubectl apply -f "$K8S_DIR/nsia-iam/service-iam-db.yaml"
echo "   ⏳ Attente du pod PostgreSQL IAM..."
kubectl wait --for=condition=ready pod -l app=iam-db -n nsia-iam --timeout=120s
echo "   ✓ PostgreSQL (IAM) déployé"

# === Phase 2b : Keycloak ===
echo ""
echo "🔑 [PHASE 2b] Déploiement de Keycloak..."
kubectl apply -f "$K8S_DIR/nsia-iam/pvc-keycloak-themes.yaml"
kubectl apply -f "$K8S_DIR/nsia-iam/deployment-keycloak.yaml"
kubectl apply -f "$K8S_DIR/nsia-iam/service-keycloak.yaml"
echo "   ⏳ Attente du pod Keycloak (peut prendre 2-3 min)..."
kubectl wait --for=condition=ready pod -l app=keycloak -n nsia-iam --timeout=300s
echo "   ✓ Keycloak déployé (ClusterIP — accès via Kong)"

# Copier les thèmes
echo "   📦 Copie des thèmes NSIA..."
KC_POD=$(kubectl get pod -n nsia-iam -l app=keycloak -o jsonpath='{.items[0].metadata.name}')
if [ -d "../security-pfe/themes" ]; then
  kubectl cp ../security-pfe/themes/ "nsia-iam/$KC_POD:/opt/keycloak/themes/" 2>/dev/null || \
    echo "   ⚠️  Copie des thèmes échouée — à faire manuellement"
fi

# === Phase 2c : Kong + WAF ===
echo ""
echo "🛡️  [PHASE 2c] Déploiement de Kong Gateway + WAF ModSecurity..."
# Créer le Secret TLS si les certificats existent
if [ -f "../security-pfe/kong.crt" ] && [ -f "../security-pfe/kong.key" ]; then
  kubectl create secret tls kong-tls \
    --cert=../security-pfe/kong.crt \
    --key=../security-pfe/kong.key \
    -n nsia-ingress --dry-run=client -o yaml | kubectl apply -f -
  echo "   ✓ Secret TLS créé"
else
  echo "   ⚠️  Certificats TLS non trouvés — créer manuellement le Secret kong-tls"
fi
kubectl apply -f "$K8S_DIR/nsia-ingress/configmap-modsecurity.yaml"
kubectl apply -f "$K8S_DIR/nsia-ingress/configmap-kong.yaml"
kubectl apply -f "$K8S_DIR/nsia-ingress/deployment-kong.yaml"
kubectl apply -f "$K8S_DIR/nsia-ingress/service-kong.yaml"
echo "   ⏳ Attente du pod Kong..."
kubectl wait --for=condition=ready pod -l app=kong -n nsia-ingress --timeout=120s
echo "   ✓ Kong + WAF ModSecurity déployés (NodePort 30800/30843)"

# === Phase 3 : Backend ===
echo ""
echo "🏢 [PHASE 3] Déploiement du Backend Métier..."
kubectl apply -f "$K8S_DIR/nsia-backend/secret-backend.yaml"
kubectl apply -f "$K8S_DIR/nsia-backend/configmap-backend.yaml"
kubectl apply -f "$K8S_DIR/nsia-backend/pvc-backend-db.yaml"
kubectl apply -f "$K8S_DIR/nsia-backend/deployment-db.yaml"
kubectl apply -f "$K8S_DIR/nsia-backend/service-db.yaml"
echo "   ⏳ Attente du pod PostgreSQL Backend..."
kubectl wait --for=condition=ready pod -l app=backend-db -n nsia-backend --timeout=120s
echo "   ✓ PostgreSQL (Backend) déployé"

# Build + import de l'image backend
if command -v docker &>/dev/null && [ -d "../backend" ]; then
  echo "   🐳 Build de l'image backend..."
  docker build -t nsia-backend:latest ../backend/
  echo "   📦 Import dans K3s (containerd)..."
  docker save nsia-backend:latest | sudo k3s ctr images import -
  echo "   ✓ Image nsia-backend:latest importée"
else
  echo "   ⚠️  Docker ou backend/ non trouvé — builder manuellement"
fi

kubectl apply -f "$K8S_DIR/nsia-backend/deployment-backend.yaml"
kubectl apply -f "$K8S_DIR/nsia-backend/service-backend.yaml"
echo "   ✓ Backend Django déployé (2 replicas)"

# === Phase 4 : SOC ===
echo ""
echo "🔍 [PHASE 4] Déploiement du SOC (Wazuh + Suricata)..."

# Wazuh Manager
echo "   📊 Wazuh Manager..."
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/configmap-wazuh.yaml"
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/pvc-wazuh.yaml"
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/deployment-wazuh.yaml"
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/service-wazuh.yaml"
echo "   ⏳ Attente du Wazuh Manager..."
kubectl wait --for=condition=ready pod -l app=wazuh-manager -n nsia-security --timeout=180s
echo "   ✓ Wazuh Manager déployé"

# OpenSearch Indexer
echo "   🗂️  OpenSearch Indexer..."
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/pvc-indexer.yaml"
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/deployment-indexer.yaml"
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/service-indexer.yaml"
echo "   ⏳ Attente de l'Indexer (peut prendre 1-2 min)..."
kubectl wait --for=condition=ready pod -l app=indexer -n nsia-security --timeout=180s
echo "   ✓ OpenSearch Indexer déployé"

# Wazuh Dashboard
echo "   📺 Wazuh Dashboard..."
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/deployment-dashboard.yaml"
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/service-dashboard.yaml"
echo "   ✓ Dashboard déployé (NodePort 30601)"

# Wazuh Agent
echo "   🕵️  Wazuh Agent (DaemonSet)..."
kubectl apply -f "$K8S_DIR/nsia-security/wazuh/daemonset-wazuh-agent.yaml"
echo "   ✓ Agent déployé sur chaque nœud"

# Suricata IDS
echo "   🔬 Suricata IDS (DaemonSet + suricata-update)..."
kubectl apply -f "$K8S_DIR/nsia-security/suricata/"
echo "   ✓ Suricata IDS déployé"

# === Résumé ===
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              DÉPLOIEMENT TERMINÉ ✓                       ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  🌐 API Gateway:  https://4.223.87.112:30843            ║"
echo "║  🔑 Keycloak:     https://4.223.87.112:30843/admin/     ║"
echo "║  📊 Wazuh SOC:    http://4.223.87.112:30601             ║"
echo "║                                                          ║"
echo "║  ⚠️  N'oubliez pas :                                    ║"
echo "║  1. Initialiser + Unseal Vault                           ║"
echo "║  2. Ouvrir les ports 30800,30843,30601 dans Azure NSG    ║"
echo "║  3. Exécuter le playbook Ansible pour les 12 banques     ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"

echo ""
echo "📋 État des pods :"
kubectl get pods --all-namespaces -l "nsia.cg/component" -o wide
