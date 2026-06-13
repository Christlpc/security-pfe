Ton analyse est excellente. Tu as mis le doigt sur la distinction entre une "API Gateway configurée" et une véritable **"API Security Fabric"**. Pour un jury de fin d'études, cette distinction est le marqueur d'un ingénieur qui pense en termes d'architecture d'entreprise plutôt qu'en termes de simple "assemblage d'outils".

Voici comment nous allons structurer la Phase 3 pour qu'elle soit non seulement technique, mais aussi **défensive et conforme** aux menaces identifiées en Phase 0-2.

### 1. La "Security Fabric" : Intégration du Swagger enrichi

Pour répondre à ton besoin de **Zero Trust**, nous allons utiliser des extensions OpenAPI (`x-security-profile`). Cela permet de lier contractuellement la sécurité au code métier.

* **Fichier `NSIA-Security-Contract.yaml**` (ton OpenAPI enrichi) :

```yaml
paths:
  /api/v1/souscription:
    post:
      x-security-profile: partner_api  # Définit le socle : OIDC + mTLS + Rate Limit
      security:
        - jwtAuth: []

```

### 2. La Défense en Profondeur (Réponse aux menaces Phase 0-2)

Pour satisfaire l'exigence de défense en profondeur, chaque couche doit vérifier l'identité métier (le `bank_id`). Voici le mapping entre tes menaces et les contrôles :

| Menace (Phase 0/1) | Contrôle Gateway (Kong) | Contrôle Applicatif (Backend) |
| --- | --- | --- |
| **Vol de session / usurpation** | Validation JWT + OIDC | Vérification `sub` (User ID) |
| **Exfiltration PII (Loi 29-2019)** | DLP Plugin (Kong) | Filtre SQL sur `bank_id` |
| **BOLA (OWASP API1)** | ACL Plugin (Keycloak Role) | Vérification `owner_id == bank_id` |
| **Attaque DoS** | Rate Limiting Plugin | Timeout agressif |

### 3. Industrialisation avec `decK` (Le remplaçant d'Ansible pour la conf)

Ton approche est juste : Ansible déploie l'infra, `decK` gère la config. Pour ton mémoire, tu présenteras ceci comme un **pipeline de validation de conformité** :

* **Le Workflow de Sûreté :**
1. **Build :** Le développeur modifie le Swagger (`x-security-profile`).
2. **Linting de sécurité :** Un script `spectral` vérifie que chaque endpoint possède un `x-security-profile`. Si non, la CI échoue (Gate de sécurité).
3. **Sync :** `deck` synchronise la configuration.
4. **Audit :** Les logs (Wazuh) valident que le trafic respecte le profil.



### 4. Vers un Zero Trust complet

Pour convaincre le jury sur le point du Zero Trust :

* **mTLS (Mutual TLS) :** Entre la banque partenaire et NSIA, on ne se contente pas du JWT. La Gateway Kong exige un certificat client (mTLS). **Si le certificat n'est pas signé par la PKI NSIA, la requête n'arrive même pas jusqu'au plugin JWT.** C'est la base du Zero Trust bancaire.
* **Moindre privilège :** Le backend ne doit *jamais* faire confiance à la Gateway. Le backend doit vérifier la signature du JWT (ou un en-tête signé par Kong) pour s'assurer que le trafic a bien été inspecté.

### 5. Centralisation de l'Identité & Externalisation de l'Authentification

Pour garantir une architecture IAM moderne et solide, aucun mécanisme d'authentification ou session locale n'est implémenté au sein de l'API NSIA (pas de gestion directe de mot de passe, de session locale ou de jetons custom via des endpoints comme `/api/v1/auth/me` ou `/api/v1/token`). 

* **Délégation totale à Keycloak :** Keycloak agit comme l'unique fournisseur d'identité (IdP). Toutes les requêtes d'authentification, de rafraîchissement de jeton et de déconnexion transitent directement par les endpoints standard d'OIDC de Keycloak (ex: `/realms/nsia/protocol/openid-connect/token` et `/logout`).
* **Rôle de la Gateway (Kong) :** Kong valide les jetons JWT émis par Keycloak (signature, expiration, audience) à l'entrée de la plateforme et rejette immédiatement toute requête non valide.
* **Séparation des Responsabilités :**
  - **Authentification :** Keycloak (Source de vérité)
  - **Contrôle d'accès & Limitation :** Kong Gateway (Politique globale)
  - **Logique métier :** API NSIA (Backend)
  - **Cloisonnement (Multi-tenant) :** Backend & Base de données (vérification du `bank_id` contenu dans le JWT)

---

### **Synthèse pour ton mémoire**

Tu vas présenter ton architecture sous l'angle de la **"Gouvernance API-Centric"** :

1. **Le Contrat (OpenAPI) :** Le "Security-as-Code" (extensions `x-`).
2. **Le Policy Engine (decK + Git) :** L'état de sécurité désiré est versionné.
3. **La Validation (IAM + mTLS) :** Le Zero Trust appliqué à la couche transport et identité.
4. **La Preuve (Wazuh/SIEM) :** La traçabilité exigée par la **Loi n° 26-2019**.


Pour ton mémoire et ta soutenance, voici l'arborescence recommandée pour ton dossier **`api-security-fabric`**. Cette structure est conçue selon les meilleures pratiques **GitOps** et **Infrastructure-as-Code**, montrant une séparation claire entre le contrat métier, la configuration déclarative et l'orchestration.

```text
api-security-fabric/
├── .github/workflows/         # Pipelines CI/CD (Validation & Sync)
│   ├── lint-security.yml      # Validation Specter/Spectral (x-security-profile)
│   └── deploy-gateway.yml     # deck sync déclenché sur Merge Request
├── config/
│   ├── kong.yaml              # État déclaratif global (généré ou manuel)
│   └── security-profiles/     # Modèles de sécurité réutilisables
│       ├── public.yaml        # Profil Public (CORS, Rate Limit)
│       ├── partner.yaml       # Profil Partenaire (OIDC, ACL)
│       └── internal.yaml      # Profil Interne (mTLS, ACL strict)
├── contracts/
│   └── api-spec.yaml          # Ton fichier OpenAPI enrichi (x-security-profile)
├── scripts/
│   └── transform.py           # Script (optionnel) pour convertir Swagger -> kong.yaml
├── infrastructure/            # Orchestration Ansible (Provisioning)
│   ├── group_vars/
│   │   └── all.yml            # Variables globales (Vault secrets, endpoints)
│   ├── roles/
│   │   ├── kong_install/      # Installation et config système
│   │   └── vault_config/      # Gestion des secrets et certificats mTLS
│   └── deploy.yml             # Playbook principal de l'infra
└── README.md                  # Documentation de gouvernance (conforme Loi 26-2019)

```

### **Pourquoi cette structure impressionnera ton jury :**

1. **Sépare le "Quoi" du "Comment" :** * Le **Contrat (`contracts/`)** définit *ce que* fait l'API.
* Le **Policy Engine (`config/`)** définit *comment* elle est sécurisée.
* L'**Orchestration (`infrastructure/`)** définit *où* elle tourne.


2. **Validation Automatisée :** Ton pipeline CI/CD (`.github/workflows/`) valide que tout changement dans le contrat API respecte les profils de sécurité définis. C'est la preuve ultime du **Security by Design**.
3. **Gestion des Secrets :** En isolant `infrastructure/roles/vault_config/`, tu démontres que les clés cryptographiques et les certificats mTLS ne sont jamais codés en dur dans le dépôt, garantissant une conformité stricte avec les standards bancaires de sécurité au repos et en transit.


Pour finaliser ton **API Security Fabric**, voici des exemples concrets basés sur ton architecture NSIA. Ces fichiers sont conçus pour être mis dans ton arborescence et servir de base à ton `decK sync` et ton CI/CD.

### 1. Le Contrat Enrichi : `contracts/api-spec.yaml`

On ajoute l'extension `x-security-profile` pour que l'automatisation sache quoi appliquer.

```yaml
openapi: 3.0.3
info:
  title: NSIA Bancassurance API
  version: 1.0.0
paths:
  /api/v1/souscription:
    post:
      x-security-profile: partner_api # Lien automatique vers le profil sécurité
      summary: "Souscription temps réel"
      security:
        - jwtAuth: []
      responses:
        '200':
          description: "Souscription validée"

```

### 2. Le Profil de Sécurité : `config/security-profiles/partner.yaml`

C'est ici que tu définis les plugins de manière déclarative.

```yaml
_format_version: "3.0"
_transform: true

plugins:
  - name: oidc
    config:
      issuer: "https://keycloak.nsia.com/realms/partner-realm"
      client_id: "nsia-gateway"
  - name: rate-limiting
    config:
      minute: 5
      policy: local
  - name: acl
    config:
      allow: ["partners"] # Keycloak mappera les rôles vers ce groupe

```

### 3. Le Manifeste Final pour decK : `config/kong.yaml`

C'est ce fichier qui est "poussé" à Kong. Il combine tes services, tes routes et tes profils.

```yaml
_format_version: "3.0"
services:
  - name: nsia-backend
    url: http://backend-service:3000
    routes:
      - name: souscription-route
        paths:
          - /api/v1/souscription
        plugins:
          - name: partner_api_profile # Référence au profil de sécurité

```

### 4. Le Workflow de Validation : `.github/workflows/deploy-gateway.yml`

Pour montrer au jury que le système est "Zero Trust" et auditable :

```yaml
name: Deploy Security Fabric
on: [push]
jobs:
  validate-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # 1. Validation de conformité (Security-as-Code)
      - name: Lint Security Profiles
        run: deck validate -s config/kong.yaml
      # 2. Synchronisation GitOps (Idempotence)
      - name: Sync to Kong
        run: deck sync --kong-addr ${{ secrets.KONG_ADMIN_URL }}

```

### **Conseils pour ton mémoire (La "touche finale") :**

1. **Explique le `transform` :** Dans ton mémoire, explique que le fichier `kong.yaml` est généré automatiquement depuis ton Swagger (via un script Python ou un outil de transformation). Cela montre que tu as automatisé la couche d'interface entre le besoin métier et la réalité technique.
2. **L'auditabilité :** Mentionne que le dossier `config/security-profiles/` est le cœur de la gouvernance : si la direction technique décide de durcir le Rate Limiting pour toutes les banques partenaires, il suffit de modifier `partner.yaml` et de pousser un commit. Le CI/CD se charge de la mise à jour en quelques secondes sur toute la plateforme.
3. **Défense en profondeur :** N'oublie pas de préciser dans ton mémoire que ces profils de sécurité sont le **premier rempart** (Gateway), mais que la validation finale du `bank_id` (clashé dans le JWT) est effectuée au **second rempart** (Backend/Base de données) pour respecter le principe de défense en profondeur contre les attaques BOLA.


Parfait ! Mettons en place ce **système de gouvernance décentralisé (Decentralized Governance)** pour Kong. L'objectif est de montrer au jury que la sécurité est pilotée par la métier (via Git) et appliquée automatiquement (via decK), tout en respectant la loi.

