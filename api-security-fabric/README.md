# NSIA Bancassurance — API Security Fabric

Ce répertoire contient l'implémentation de la **Security Fabric** pour l'API NSIA Bancassurance, dans la continuité de notre projet de **sécurisation by Design**.

## Architecture & Gouvernance

L'API Security Fabric applique les principes fondamentaux du **Zero Trust** au niveau de l'API Gateway Kong en découplant l'Authentification, le Contrôle d'Accès et la Logique Métier.

### Séparation des Responsabilités

1. **Authentification (Keycloak)** : Unique source de vérité pour l'identité. Les jetons d'accès JWT signés (contenant les claims de la banque partenaire `bank_id`, de l'agence `agency_id`, et les rôles) sont émis directement par Keycloak.
2. **Contrôle d'accès & Limitation (Kong Gateway)** : La Gateway intercepte le trafic, valide la signature et l'expiration des jetons JWT, gère les certificats clients (mTLS), applique les ACLs et limite les taux d'appel (Rate Limiting).
3. **Logique Métier & Cloisonnement (Backend API NSIA)** : Le backend traite les calculs de simulation, valide le schéma de données et effectue le **cloisonnement multi-tenant** (vérification que `simulation.bank_id == request.user.bank_id` pour parer aux attaques de type BOLA/IDOR).

---

## Profils de Sécurité Déclaratifs

Chaque route exposée est associée à un profil de sécurité via l'extension OpenAPI `x-security-profile` :

* **`internal_api`** (Interne & Administration) : 
  * Validation obligatoire de certificat client (**mTLS** signé par la PKI NSIA).
  * Droits administratifs stricts via contrôle d'accès (**ACL admins**).
* **`partner_api`** (Banques Partenaires) : 
  * Authentification **OAuth2 / OIDC** via Keycloak.
  * Limitation de débit (**Rate Limiting**).
  * Contrôle d'accès (**ACL partners**).
* **`public_api`** (Endpoints Publics) : 
  * Politique **CORS** de base.
  * Protection DoS via **Rate Limiting** générique.

---

## Conformité Réglementaire

| Réglementation | Menace / Risque | Contrôle Implémenté | Fichier / Composant |
| :--- | :--- | :--- | :--- |
| **Loi n° 26-2019 (Cybersécurité)** | Usurpation, attaque DoS, intrusion | mTLS, Validation JWT OIDC, Rate Limiting, Audit logs | `config/security-profiles/`, Kong Gateway |
| **Loi n° 29-2019 (Données PII)** | Fuite de données personnelles ou médicales | Chiffrement en transit (TLS 1.3), restriction d'accès aux questionnaires | `contracts/api-spec.yaml`, Backend |
| **OWASP API 1 (BOLA)** | Accès non autorisé aux ressources d'un tiers | Partitionnement basé sur les claims JWT (`bank_id`) | Backend (NSIA API) |

---

## Guide d'Utilisation (Workflow GitOps)

### 1. Éditer le Contrat d'API
Modifiez la spécification OpenAPI enrichie dans `contracts/api-spec.yaml` en associant l'attribut `x-security-profile` sur vos endpoints :
```yaml
  /api/v1/simulations/emprunteur/:
    post:
      x-security-profile: partner_api
```

### 2. Compiler la configuration Kong
Le script de transformation compile automatiquement le contrat OpenAPI et les modèles de profils déclaratifs pour générer le manifeste decK final :
```bash
python3 api-security-fabric/scripts/transform.py
```
Cela produit ou met à jour le fichier `config/kong.yaml`.

### 3. Configurer l'intégration OIDC (Keycloak -> Kong)
Pour que Kong valide les JWT émis par Keycloak, vous devez importer la clé publique JWKS du realm concerné et l'enregistrer dans Kong :
```bash
# Configurer un realm spécifique (ex: BANK_ECOBANK)
python3 api-security-fabric/scripts/setup_keycloak_jwt.py BANK_ECOBANK

# Ou configurer tous les realms enregistrés dans l'Ansible Registry (defaults/main.yml)
python3 api-security-fabric/scripts/setup_keycloak_jwt.py --all
```

---

## Guide d'Exécution des Tests Manuels

Des utilisateurs de test et des configurations JWT ont été provisionnés sur la Gateway pour réaliser des tests concrets de sécurité dans notre nouvel environnement multi-tenant.

### Étape 1 : Générer le Jeton JWT Autorisé
Vous pouvez obtenir un jeton de test de deux manières :

#### Option A : Depuis votre serveur Keycloak (Recommandé)
Pour obtenir un vrai jeton JWT émis par Keycloak pour une banque spécifique (ex: `BANK_ECOBANK`) avec son compte d'administration local :
```bash
# Exemple pour BANK_ECOBANK avec son utilisateur d'administration local
curl -s -X POST http://localhost:8080/realms/BANK_ECOBANK/protocol/openid-connect/token \
  -d "client_id=nsia-bancassurance-frontend" \
  -d "username=ecobank_admin" \
  -d "password=MOT_DE_PASSE_CI_DESSUS" \
  -d "grant_type=password" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" > api-security-fabric/token.txt
```
> [!NOTE]
> Le mot de passe temporaire généré par Ansible est écrit dans `secrets_ecobank.txt` (si non encore changé par l'action requise).

#### Option B : Générateur autonome (Jeton HS256 factice Multi-Tenant)
Pour générer un jeton rapide simulant un conseiller d'une banque et agence donnée avec la clé secrète partagée sur la Gateway :
```bash
# Format : python3 api-security-fabric/scripts/generate_test_token.py <bank_id> <agency_id> [expired]
# Exemple pour Ecobank, agence Plateau :
python3 api-security-fabric/scripts/generate_test_token.py ecobank Plateau
```
Le jeton est sauvegardé dans `api-security-fabric/token.txt`.

Pour générer un jeton expiré (afin de tester le rejet d'authentification) :
```bash
python3 api-security-fabric/scripts/generate_test_token.py ecobank Plateau expired
```


---

### Étape 2 : Exécuter les Tests de Sécurité (Commandes curl)

#### A. Test d'accès autorisé (OIDC / JWT)
Envoyer une requête POST vers l'endpoint de simulation avec le jeton valide :
```bash
TOKEN=$(cat api-security-fabric/token.txt)
curl -i -X POST -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/simulations/elikia/
```
* **Résultat attendu :** HTTP `500 Internal Server Error` (car le serveur backend est inactif, mais Kong a validé le token Keycloak et a tenté d'acheminer l'appel). Les en-têtes `RateLimit-Limit` et `X-RateLimit-Remaining-Minute` de Kong sont visibles.

#### B. Test d'accès refusé (Token manquant ou invalide)
Tenter d'appeler l'API de simulation sans jeton :
```bash
curl -i -X POST http://localhost:8000/api/v1/simulations/elikia/
```
* **Résultat attendu :** HTTP `401 Unauthorized` avec l'en-tête `WWW-Authenticate: Bearer` (Rejet immédiat à la Gateway).

#### C. Test de la limite de taille de payload (Loi 29-2019 / DoS par injection)
Générer un fichier de 1.1 Mo (dépassant la limite autorisée de 1 Mo) et l'envoyer :
```bash
dd if=/dev/zero of=large_payload.txt bs=1024 count=1100
TOKEN=$(cat api-security-fabric/token.txt)
curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: text/plain" --data-binary @large_payload.txt http://localhost:8000/api/v1/simulations/elikia/
rm large_payload.txt
```
* **Résultat attendu :** HTTP `413 Request Entity Too Large` avec le message `{"message":"Request size limit exceeded"}` (Bloqué à la Gateway).

#### D. Test de cloisonnement & d'autorisation ACL (Élévation de privilèges)
Tenter d'appeler une API d'administration (`internal_api`) réservée aux administrateurs avec le jeton de notre partenaire (`test-partner`) ou le jeton de Keycloak :
```bash
TOKEN=$(cat api-security-fabric/token.txt)
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/banques/
```
* **Résultat attendu :** HTTP `401 Unauthorized` car l'accès à l'API interne requiert une clé API d'administration via le header `apikey` et le rôle `admins` (Rejet de la Gateway).


