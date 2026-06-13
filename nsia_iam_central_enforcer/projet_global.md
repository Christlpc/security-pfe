# NSIA Central IAM Enforcer (`nsia_iam_central_enforcer`)

Rôle Ansible de niveau institutionnel conçu pour le provisionnement automatisé, idempotent et sécurisé de l'infrastructure d'identité souveraine multi-banques de **NSIA Assurance**, s'inscrivant dans le cadre d'un Projet de Fin d'Études (PFE) DevSecOps et Cybersécurité.

Ce rôle applique une stratégie **Central Bank IAM Fabric** sur un cluster **Keycloak 26+** : NSIA Assurance agit comme le plan de contrôle central (*Control Plane*) édictant les politiques de sécurité globales, tandis que chaque banque conventionnée partenaire est isolée de manière étanche au sein d'un domaine d'identité autonome (*Hard Tenant Isolation* via une approche Multi-Realm native).

---

## 🛡️ Enjeux de Sécurité & Conformité Légale

Ce rôle n'est pas un simple script de déploiement applicatif, c'est un moteur d'application de politiques réglementaires (*Policy Enforcement Engine*) conforme au cadre juridique de la **République du Congo** :
* **Loi n° 29-2019 (Protection des données à caractère personnel) :** Isolation cryptographique et logique absolue des identités et des Données d'Identification Personnelles (PII). Aucun croisement ni fuite inter-banques n'est mathématiquement possible au niveau du noyau de l'IAM.
* **Loi n° 26-2019 (Cybersécurité et Cybercriminalité) :** Durcissement des accès sur les infrastructures critiques (OIV) via l'imposition automatique d'une *Security Baseline* centralisée (détection de brute-force, politique de complexité stricte des secrets).
* **Principe de Non-Répudiation & Moindre Privilège :** Génération cryptographique de mots de passe éphémères à l'onboarding avec obligation système de renouvellement immédiat (`UPDATE_PASSWORD`). NSIA Assurance provisionne la structure mais ne connaît jamais les secrets finaux des banques partenaires.

---

## ✨ Fonctionnalités Clés

* **Idempotence Absolue (Desired State Configuration) :** Peut être exécuté indéfiniment. Ansible valide l'état actuel de l'infrastructure Keycloak et n'applique des mutations que si un écart est détecté avec la configuration cible, éliminant les alertes de conflits HTTP 409.
* **Hard Multi-Tenancy (1 Realm = 1 Banque) :** Cloisonnement total des domaines de sécurité, des clés de signature de jetons (JWKS) et des sessions utilisateurs.
* **Matrice RBAC Réglementaire :** Injection automatique de la pyramide des rôles métiers de la bancassurance (`BANK_SUPER_ADMIN`, `BANK_AUDITOR`, `BANK_AGENCY_MANAGER`, etc.).
* **Contrôle d'Accès Contextuel (ABAC) :** Marquage dynamique des attributs de sécurité (`bank`, `scope`) au niveau des profils pour les évaluations dynamiques par l'API Gateway (Phase 3).
* **Lockdown FGAP V2 (Fine-Grained Admin Permissions) :** Bridation totale des administrateurs locaux via l'API REST d'autorisation de Keycloak et l'injection de modèles Jinja2, interdisant toute élévation de privilèges.

---

## 📁 Arborescence du Rôle

```text
roles/nsia_iam_central_enforcer/
├── defaults/
│   └── main.yml         # Variables globales et Baseline de Sécurité NSIA
├── vars/
│   └── main.yml         # Constantes du Control Plane NSIA et Endpoints API
├── tasks/
│   ├── main.yml         # Point d'entrée et orchestration de la boucle d'onboarding
│   ├── onboard_bank.yml # Provisionning idempotent du cycle de vie d'un Tenant
│   └── fgap_lockdown.yml# Isolation granulaire et bridation de l'admin banque (FGAP V2)
└── templates/
    ├── fgap_policy.json.j2      # Gabarit d'autorisation Jinja2 pour l'utilisateur admin
    └── fgap_permission.json.j2  # Gabarit d'autorisation Jinja2 pour l'isolation du périmètre