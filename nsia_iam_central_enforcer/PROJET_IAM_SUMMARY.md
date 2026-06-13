# Synthèse d'Implémentation & Guide des Tests - IAM Fabric NSIA

Ce document récapitule l'ensemble des travaux réalisés sur la configuration et la sécurisation du rôle Ansible `nsia_iam_central_enforcer` pour piloter l'architecture **IAM centralisée Multi-Tenant** de la plateforme de Bancassurance NSIA.

---

## 💻 1. Ce qui a été accompli

Nous avons restructuré et durci le rôle Ansible pour Keycloak 26+ afin de répondre aux exigences DevSecOps et réglementaires (Loi n° 26-2019 et Loi n° 29-2019 sur la protection des données) :

### A. Résolution des anomalies critiques
* **Résolution de l'expiration du Token (HTTP 401)** : Ajout d'une tâche d'authentification unique et d'extraction de jeton au début de [onboard_bank.yml](file:///Users/precieuxntsala/Documents/Christ%20LANDZI/PFE_NSIA_IAM/nsia_iam_central_enforcer/tasks/onboard_bank.yml) pour renouveler le token d'administration à chaque itération de banque, évitant les coupures lors de boucles de provisioning longues.
* **Résolution de l'envoi d'e-mail (HTTP 500)** : 
  * Clônage dynamique de la configuration SMTP active du Realm `master` (qui fonctionne) vers chaque nouveau Realm de banque.
  * Création d'une variable d'override `nsia_smtp_config` dans [defaults/main.yml](file:///Users/precieuxntsala/Documents/Christ%20LANDZI/PFE_NSIA_IAM/nsia_iam_central_enforcer/defaults/main.yml) pour injecter de façon sécurisée le mot de passe d'authentification SMTP (qui est masqué et non retourné par défaut par l'API REST de Keycloak).

### B. Endurcissement et Sécurité (Zero-Trust)
* **Disjonction Stricte des Clients** : Séparation complète entre le client public (`nsia-bancassurance-frontend` pour les utilisateurs) et le client confidentiel système (`nsia-iam-core-broker` avec Flow Service Account activé) pour limiter les surfaces d'attaque.
* **MFA (TOTP) Forcé** : Enrôlement obligatoire d'un deuxième facteur (OTP) pour tous les super-administrateurs de banque créés.
* **Idempotence des Secrets** : Le broker système n'est reconfiguré et son secret régénéré que s'il n'existe pas déjà, protégeant ainsi l'infrastructure contre l'écrasement des secrets en production lors de rejeux du playbook.
* **Architecture Zéro-Flush** : Pousse directe du secret d'onboarding vers l'API de coffre-fort de production **HashiCorp Vault**, évitant de stocker des fichiers secrets en clair localement.
* **Fine-Grained Authorization Policies (FGAP V2)** : Mise en œuvre d'une isolation logique complète au niveau du client `realm-management` via l'activation des services d'autorisation, la définition de scopes (`view`, `manage`), de ressources d'organisation et d'une politique d'accès Jinja2.
* **Liaison automatique des thèmes** : Intégration du thème graphique personnalisé **`nsia-platform-theme`** pour l'interface de connexion (`login_theme`) et l'habillage des e-mails (`email_theme`) afin d'assurer l'identité visuelle souveraine.

---

## 🛠️ 2. Guide d'Exécution et Tests

### A. Prérequis
1. **Démarrage de Keycloak** avec montage des volumes de thèmes locaux. Votre fichier `docker-compose.yml` doit inclure :
   ```yaml
   services:
     keycloak:
       environment:
         KC_THEME_CACHE_THEMES: "false"      # Désactive le cache en développement
         KC_THEME_CACHE_TEMPLATES: "false"   # Désactive le cache des fichiers FTL
       volumes:
         - ./themes:/opt/keycloak/themes     # Monte l'ensemble des thèmes personnalisés
   ```
   *Pensez à recréer les conteneurs si le volume vient d'être configuré : `docker compose down && docker compose up -d`.*

2. ** PKI et Réseau** : Assurez-vous que l'URL d'administration de Keycloak (`keycloak_admin_url` dans `defaults/main.yml`) est accessible depuis la machine exécutant le playbook.

---

### B. Commandes de Test et Déploiement

#### 1. Validation de la syntaxe Ansible
Vérifiez qu'aucune erreur YAML ou de structure n'existe dans le rôle :
```bash
ansible-playbook -i tests/inventory tests/test.yml --syntax-check
```

#### 2. Lancement du déploiement global (Mode `all` par défaut)
Déploie l'intégralité des 12 banques définies dans le registre centralisé avec propagation du SMTP et mot de passe de messagerie :
```bash
ansible-playbook -i tests/inventory tests/test.yml \
  -e "keycloak_admin_password=222_Jme_0075" \
  -e '{"nsia_smtp_config": {"password": "VOTRE_MOT_DE_PASSE_SMTP"}}'
```

#### 3. Lancement du déploiement ciblé (Mode `single`)
Utile pour provisionner ou mettre à jour une seule banque spécifique rapidement (ex: `ecobank`) :
```bash
ansible-playbook -i tests/inventory tests/test.yml \
  -e "keycloak_admin_password=222_Jme_0075 nsia_run_mode=single target_bank_name=ecobank" \
  -e '{"nsia_smtp_config": {"password": "VOTRE_MOT_DE_PASSE_SMTP"}}'
```

#### 4. Lancement du déploiement guidé (Mode `interactive`)
Ansible vous posera des questions interactives dans le terminal pour enregistrer et configurer une banque à la volée :
```bash
ansible-playbook -i tests/inventory tests/test.yml \
  -e "keycloak_admin_password=222_Jme_0075 nsia_run_mode=interactive" \
  -e '{"nsia_smtp_config": {"password": "VOTRE_MOT_DE_PASSE_SMTP"}}'
```

---

### C. Vérifications attendues

* **Dans la Console Keycloak** :
  1. Un nouveau Realm `BANK_[BANQUE]` est visible.
  2. Sous **Realm Settings -> Themes**, les thèmes `nsia-platform-theme` sont bien assignés.
  3. Sous **Realm Settings -> Email**, la configuration du serveur SMTP est copiée avec le mot de passe opérationnel.
  4. L'utilisateur administrateur local (ex: `ecobank_admin`) est présent dans le groupe `ECOBANK-SIEGE`, possède le rôle `BANK_SUPER_ADMIN`, et a le drapeau de configuration MFA (TOTP) actif.
* **E-mail d'onboarding** : L'administrateur de la banque reçoit un e-mail au design du thème NSIA contenant un lien sécurisé d'initialisation de mot de passe.
