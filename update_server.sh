#!/bin/bash
# ============================================================
# NSIA — Script de mise à jour complète du serveur
# Exécuter sur le VM avec : sudo bash update_server.sh
# ============================================================
set -euo pipefail

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   NSIA — Mise à jour Backend & Frontend (Git Pull)       ║"
echo "╚══════════════════════════════════════════════════════════╝"

PROJECT_DIR="$(pwd)"
echo "📁 Répertoire de travail : $PROJECT_DIR"

# === 1. Pull des nouvelles sources ===
echo ""
echo "📥 [1/6] Récupération des dernières sources depuis GitHub..."
git pull origin main
echo "   ✓ Sources mises à jour"

# === 2. Résoudre la permission K3s ===
echo ""
echo "🔐 [2/6] Correction des permissions K3s..."
if [ -f /etc/rancher/k3s/k3s.yaml ]; then
    sudo chmod 644 /etc/rancher/k3s/k3s.yaml
    export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
    echo "   ✓ Permissions K3s corrigées"
else
    echo "   ⚠️  k3s.yaml non trouvé — K3s est-il installé ?"
fi

# === 3. Build de l'image Docker Backend ===
echo ""
echo "🐳 [3/6] Build de l'image Docker Backend..."

# Trouver le répertoire bancassurance
if [ -d "./bancassurance" ]; then
    BACKEND_DIR="./bancassurance"
elif [ -d "../bancassurance" ]; then
    BACKEND_DIR="../bancassurance"
else
    # Peut-être que le contenu est à la racine (Dockerfile présent)
    if [ -f "./Dockerfile" ]; then
        BACKEND_DIR="."
    else
        echo "   ❌ Répertoire bancassurance ou Dockerfile introuvable !"
        echo "   Structure actuelle:"
        ls -la
        exit 1
    fi
fi

echo "   Utilisation du répertoire: $BACKEND_DIR"
docker build -t nsia-backend:latest "$BACKEND_DIR"
echo "   ✓ Image nsia-backend:latest construite"

# === 4. Import de l'image dans K3s (containerd) ===
echo ""
echo "📦 [4/6] Import de l'image dans K3s (containerd)..."
docker save nsia-backend:latest | sudo k3s ctr images import -
echo "   ✓ Image importée dans containerd"

# === 5. Redémarrage du déploiement Backend (rolling update) ===
echo ""
echo "🔄 [5/6] Redémarrage du déploiement Backend..."
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Forcer le rechargement du pod (rolling restart)
kubectl rollout restart deployment/backend -n nsia-backend
echo "   ⏳ Attente du déploiement..."
kubectl rollout status deployment/backend -n nsia-backend --timeout=120s
echo "   ✓ Backend redémarré"

# === 6. Exécution des migrations Django (dont le seeding automatique) ===
echo ""
echo "🗄️  [6/6] Exécution des migrations Django (seeding inclus)..."
BACKEND_POD=$(kubectl get pod -n nsia-backend -l app=backend -o jsonpath='{.items[0].metadata.name}')
echo "   Pod: $BACKEND_POD"

# Exécuter les migrations
kubectl exec -n nsia-backend "$BACKEND_POD" -- python manage.py migrate --noinput
echo "   ✓ Migrations Django exécutées (incluant le seeding Ecobank)"

# Vérifier les taux emprunteur Ecobank
echo ""
echo "🔍 Vérification des taux Ecobank dans la base..."
kubectl exec -n nsia-backend "$BACKEND_POD" -- python manage.py shell -c "
from apps.tarification.models import TableTauxEmprunteur
from apps.core.models import Banque
try:
    b = Banque.objects.get(code_banque='ECOBANK')
    count = TableTauxEmprunteur.objects.filter(banque=b).count()
    print(f'✅ Ecobank: {count} taux emprunteur trouvés')
    if count == 0:
        print('⚠️  Aucun taux — lancement manuel du chargement...')
        from django.core.management import call_command
        call_command('load_taux_emprunteur')
        count2 = TableTauxEmprunteur.objects.filter(banque=b).count()
        print(f'✅ Ecobank après chargement: {count2} taux')
except Banque.DoesNotExist:
    print('❌ Banque ECOBANK non trouvée — lancement load_fixtures...')
    from django.core.management import call_command
    call_command('load_fixtures')
    call_command('load_taux_emprunteur')
    call_command('load_parametres_produit')
"

# === Résumé ===
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║              MISE À JOUR TERMINÉE ✓                      ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  ✅ Sources mises à jour depuis GitHub                   ║"
echo "║  ✅ Image Docker nsia-backend:latest reconstruite        ║"
echo "║  ✅ Image importée dans K3s (containerd)                 ║"
echo "║  ✅ Backend redémarré avec rolling update                ║"
echo "║  ✅ Migrations Django exécutées (seeding Ecobank)        ║"
echo "║                                                          ║"
echo "║  🌐 API: https://4.223.87.112:30843                    ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"

echo ""
echo "📋 État des pods Backend:"
kubectl get pods -n nsia-backend -o wide
