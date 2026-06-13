# 🛡️ NSIA Bancassurance — Architecture Globale de Sécurité & IAM

Ce dépôt rassemble les composants clés du Projet de Fin d'Études (PFE) de **Pierre Christivie LANDZI** (Élève-Ingénieur en Cybersécurité et DevSecOps) dédié à la **sécurisation by Design** d'un écosystème de Bancassurance pour **NSIA Assurance** en République du Congo.

L'objectif principal du projet est de mettre en œuvre une architecture de sécurité moderne, décentralisée et conforme aux réglementations nationales en s'appuyant sur :
1. **Un plan de contrôle IAM centralisé (Control Plane)** reposant sur Keycloak pour la gestion de l'identité multi-tenant.
2. **Une API Security Fabric** s'appuyant sur Kong Gateway pour l'enforcement des politiques de sécurité (Rate Limiting, mTLS, OIDC, ACL) et un workflow GitOps (via decK).

---

## 🏛️ Conformité Réglementaire (République du Congo)

L'ensemble de l'architecture a été pensé pour s'aligner sur le cadre légal congolais :
* **Loi n° 26-2019 sur la cybersécurité** : Durcissement préventif des infrastructures critiques, gestion des accès et traçabilité non-répudiable.
* **Loi n° 29-2019 sur la protection des données à caractère personnel (PII)** : Chiffrement des flux (TLS 1.3), cloisonnement étanche des données d'identification et de santé, et contrôle strict de l'accès aux données des partenaires bancaires.

---

## 📁 Schéma complet de l'arborescence

Voici la structure générale du projet et le rôle de chaque dossier et fichier clé :

```text
PFE_NSIA_IAM/
├── docker-compose.yml           # Configuration Docker Compose du socle (Keycloak, Postgres, Kong Gateway)
├── NSIA Assurances API.yaml      # Spécification OpenAPI v3 d'origine de l'API de Bancassurance
├── Dev_api-security-fabric.md   # Notes techniques, architecture et directives pour la Phase 3 (Zero Trust)
├── dfd.drawio                   # Diagramme de flux de données (Data Flow Diagram) du système
├── onboard_bankassurance.sh     # Script bash d'onboarding automatisé d'une banque partenaire dans Keycloak
├── create_agency.sh             # Script bash de provisionnement d'agences au sein d'une banque partenaire
├── secrets_BANK_NAME.txt        # Fichier temporaire généré contenant le mot de passe temporaire admin banque
│
├── themes/                      # Thèmes Keycloak personnalisés pour NSIA
│   └── nsia-platform-theme/     # Thème d'UI (Login, e-mail) personnalisé pour l'intégration de marque
│
├── nsia_iam_central_enforcer/   # Rôle Ansible pour l'automatisation & durcissement IAM (Keycloak)
│   ├── defaults/main.yml        # Paramètres de sécurité (durées, mots de passe, etc.) & Baseline de Sécurité
│   ├── vars/main.yml            # Constantes de l'API Keycloak & Configuration endpoints
│   ├── tasks/                   # Tâches d'automatisation Ansible
│   │   ├── main.yml             # Orchestration de la boucle d'onboarding
│   │   ├── onboard_bank.yml     # Provisionnement idempotent d'une banque (Realm Keycloak autonome)
│   │   └── fgap_lockdown.yml    # Isolation de l'administration via FGAP V2 (Fine-Grained Admin Permissions)
│   ├── templates/               # Modèles de politiques d'autorisation JSON (FGAP V2)
│   └── README.md                # Documentation spécifique de l'IAM Enforcer
│
└── api-security-fabric/         # Projet GitOps d'exposition sécurisée des APIs (Kong Gateway & decK)
    ├── .github/workflows/       # Pipelines CI/CD pour la validation et le déploiement de la configuration
    ├── config/                  # Configuration déclarative et profils de sécurité Kong
    │   ├── kong.yaml            # Fichier d'état généré et synchronisé via decK
    │   └── security-profiles/   # Modèles de profils de sécurité (Public, Partner, Internal)
    ├── contracts/
    │   └── api-spec.yaml        # Fichier OpenAPI enrichi avec les attributs de sécurité (x-security-profile)
    ├── scripts/
    │   └── transform.py         # Script Python convertissant la spécification OpenAPI enrichie en fichier kong.yaml
    ├── infrastructure/          # Orchestration Ansible pour le déploiement de Kong
    └── README.md                # Documentation de gouvernance et guide de tests de sécurité (curl)
```

---

## 🛠️ Description des Composants Majeurs

### 1. Socle d'Infrastructure ([docker-compose.yml](./docker-compose.yml))
Ce fichier orchestre quatre conteneurs majeurs pour simuler et tester localement l'environnement de production :
* **`nsia_postgres`** : Base de données PostgreSQL v15 dédiée au stockage Keycloak.
* **`nsia_keycloak`** : Fournisseur d'identité (IdP) central exécutant Keycloak.
* **`kong_database`** : Base de données PostgreSQL v13 dédiée à Kong Gateway.
* **`nsia_kong`** : L'API Gateway qui sert de premier rempart réseau (écoute du proxy sur `:8000` et administration sur `:8001`).

### 2. Le Moteur d'Identité : Central IAM Enforcer ([nsia_iam_central_enforcer](./nsia_iam_central_enforcer))
Ce composant s'assure que chaque banque partenaire est cloisonnée hermétiquement au niveau de l'IAM.
* **Cloisonnement Fort (Multi-Tenant)** : Chaque banque conventionnée dispose de son propre **Realm** Keycloak indépendant. Les sessions, clés de signatures (JWKS) et utilisateurs sont strictement cloisonnés.
* **Durcissement Baseline** : Application automatique d'une protection contre les attaques de force brute et d'une politique de mot de passe stricte (Loi 26-2019).
* **Bridage FGAP V2** : Restriction des administrateurs des banques partenaires au strict périmètre de leur organisation, interdisant toute élévation de privilège globale.
* **Scripts d'administration rapide** :
  * [`onboard_bankassurance.sh`](./onboard_bankassurance.sh) : Configure automatiquement l'organisation, provisionne la structure de rôles RBAC de la bancassurance, génère un mot de passe temporaire avec l'action obligatoire `UPDATE_PASSWORD` (non-répudiation) et injecte les attributs ABAC de la banque.
  * [`create_agency.sh`](./create_agency.sh) : Rattache dynamiquement une nouvelle agence à la banque partenaire.

### 3. La Passerelle de Sécurité : API Security Fabric ([api-security-fabric](./api-security-fabric))
Ce projet gère la sécurité des endpoints de manière déclarative et automatisée (Security-as-Code).
* **Contrats d'API enrichis** : Les endpoints de l'API NSIA sont décrits dans [`api-security-fabric/contracts/api-spec.yaml`](./api-security-fabric/contracts/api-spec.yaml) et portent des attributs personnalisés comme `x-security-profile: partner_api`.
* **Profils de sécurité** :
  * `partner_api` : Authentification Keycloak OIDC, Rate Limiting, contrôle d'accès ACL.
  * `internal_api` : Mutuel TLS (**mTLS** via certificat signé par la PKI NSIA), ACL stricts.
  * `public_api` : CORS basique, Rate Limiting.
* **Workflow GitOps** : Le script [`api-security-fabric/scripts/transform.py`](./api-security-fabric/scripts/transform.py) traduit le fichier OpenAPI et applique les profils associés pour générer [`api-security-fabric/config/kong.yaml`](./api-security-fabric/config/kong.yaml). Ce fichier d'état est ensuite validé (`deck validate`) et poussé à Kong Gateway (`deck sync`) dans les pipelines CI/CD.

---

## 🔄 Flux de Requête & Défense en Profondeur

Le système utilise le principe de **Défense en Profondeur** (Zero Trust) :

```text
[Banque Partenaire] 
       │
       ▼
 1. Transport Sécurisé ──► [ Kong API Gateway ] ◄── 2. Authentification OIDC (Keycloak JWT)
                                │
                                ▼  (Si valide, routage avec claims bank_id)
                                │
                         [ API NSIA Backend ]
                                │
                                └───► 3. Validation Métier & Cloisonnement BOLA
                                         (Vérification bank_id dans la base de données)
```

1. **Premier rempart (Gateway)** : Kong intercepte la requête, vérifie l'identité au transport (mTLS/TLS 1.3), applique le Rate Limiting pour contrer les DoS, et valide la signature cryptographique du jeton JWT émis par Keycloak.
2. **Second rempart (Backend)** : L'API NSIA Backend ne fait pas aveuglément confiance à la Gateway. Elle récupère le claim `bank_id` injecté par Keycloak dans le jeton d'accès et vérifie que la ressource demandée appartient bien à cette banque pour bloquer les attaques de type **BOLA (OWASP API 1)**.

---

## 🚦 Démarrage Rapide

1. **Lancement de l'infrastructure** :
   ```bash
   docker compose up -d
   ```
2. **Onboarding d'une banque partenaire (ex. Ecobank)** :
   ```bash
   ./onboard_bankassurance.sh ecobank ecobank_admin
   ```
   *Le script va configurer Keycloak, créer l'organisation Ecobank, et sauvegarder le mot de passe temporaire dans `secrets_ecobank.txt`.*

3. **Génération de configuration de la Gateway & Sync** :
   *Consultez le guide détaillé dans le [README de l'API Security Fabric](./api-security-fabric/README.md) pour compiler et déployer la configuration via decK, puis exécuter les tests de sécurité (JWT, injection de gros payload, blocage ACL).*
