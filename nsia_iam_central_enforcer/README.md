Voici le fichier `README.md` rédigé et structuré en respectant scrupuleusement le canevas standard généré par Ansible Galaxy, adapté précisément aux exigences DevSecOps, fonctionnelles et juridiques de ton projet de fin d'études pour NSIA Assurance.

---

# Ansible Role: nsia_iam_central_enforcer

=========

Ce rôle Ansible de niveau institutionnel orchestre et déploie de façon strictement idempotente l'architecture **"Central Bank IAM Fabric"** sur un cluster **Keycloak 26+**.

Dans cet écosystème de bancassurance, **NSIA Assurance** se positionne comme l'autorité de gouvernance centrale (*Control Plane*). Le rôle applique de manière automatisée une stratégie de cloisonnement fort multi-banques (*Hard Tenant Isolation*) : chaque banque partenaire conventionnée est isolée cryptographiquement et logiquement dans un **Realm Keycloak autonome**. Le rôle pousse la *Security Baseline* globale de NSIA (détection brute-force, complexité des secrets), provisionne la matrice RBAC réglementaire des agences, et applique un verrouillage administratif par permissions fines (**FGAP V2**) via des templates JSON.

Cette ingénierie de sécurité garantit une conformité totale avec le cadre légal de la **République du Congo** :

* **Loi n° 29-2019** (Protection des données à caractère personnel) : Étanchéité absolue des Données d'Identification Personnelles (PII) inter-banques.
* **Loi n° 26-2019** (Cybersécurité) : Durcissement préventif des infrastructures critiques et gestion non-répudiable des enrôlements (`UPDATE_PASSWORD` obligatoire au premier login).

## Requirements

Le nœud de contrôle exécutant Ansible doit disposer des pré-requis suivants :

* **Ansible** >= 2.15
* **Collection Ansible Galaxy :** `community.general` installée (`ansible-galaxy collection install community.general`).
* **Utilitaires hôtes :** `jq`, `openssl` et `curl` doivent être installés et disponibles dans le `$PATH` pour la manipulation des flux d'API REST.
* **Serveur Cible :** Une instance Keycloak 26+ (locale, conteneurisée, ou distante) en cours d'exécution et accessible par le réseau.

## Role Variables

Les variables de ce rôle sont réparties de manière à séparer la gouvernance métier des constantes techniques internes.

### 1. Politiques Métiers et Baseline de Sécurité (`defaults/main.yml`)

Variables configurables et surchargeables représentant les exigences de haut niveau édictées par NSIA Assurance.

* `keycloak_admin_url`: L'URL d'accès racine au plan de contrôle Keycloak. *(Défaut : `"http://localhost:8080"`)*.
* `keycloak_admin_user`: L'identifiant du Super-Administrateur global de la plateforme Keycloak. *(Défaut : `"super_admin"`)*.
* `nsia_security_baseline`: Dictionnaire imposant les contraintes de durcissement cryptographique et de défense périmétrique :
* `brute_force_protected`: Activation de l'atténuation des attaques par force brute. *(Défaut : `true`)*.
* `max_login_failures`: Nombre maximal de tentatives d'authentification infructueuses avant verrouillage. *(Défaut : `3`)*.
* `wait_increment_seconds`: Temps de pénalité réseau progressif. *(Défaut : `60`)*.
* `password_policy`: Règle regex Keycloak validant la robustesse minimale des mots de passe. *(Défaut : Longueur 12, 1 chiffre, 1 majuscule, 1 caractère spécial)*.


* `nsia_rbac_roles`: Liste des profils et privilèges fonctionnels injectés dans chaque banque conventionnée (`BANK_SUPER_ADMIN`, `BANK_AUDITOR`, etc.).
* `conventioned_banks`: Liste structurée (Dictionnaire GitOps) recensant les banques partenaires à provisionner de manière itérative, incluant leur compte d'administration locale et la topologie de leurs agences physiques :
```yaml
conventioned_banks:
  - name: "ecobank"
    admin_username: "ecobank_admin"
    branches: [ "Plateau", "Poto-Poto" ]

```



### 2. Constantes Systèmes Privées (`vars/main.yml`)

Variables structurelles internes au rôle, non destinées à être modifiées par l'opérateur.

* `keycloak_auth_endpoint`: URL technique de négociation des jetons OAuth2 de session CLI.
* `keycloak_admin_api_base`: Point d'entrée de l'API REST administrative pour les appels granularisés.
* `api_json_headers`: Profil d'en-tête HTTP incluant le Token volatile porteur (*Bearer Token*) pour l'enforcement des règles d'autorisation.

### 3. Variables de Session Requises (Ligne de commande ou Coffre-fort)

* `keycloak_admin_password`: **[CRITIQUE]** Le mot de passe racine du royaume `master`. Par mesure de sécurité DevSecOps (*Zero Hardcoded Secrets*), cette variable ne doit **jamais** être stockée dans les fichiers du rôle. Elle doit être injectée dynamiquement via `ansible-vault` ou passée en argument d'exécution volatile.

## Dependencies

Ce rôle ne dépend d'aucun autre rôle hébergé sur Ansible Galaxy. Il s'appuie nativement sur les modules de la collection centralisée `community.general`.

## Example Playbook

Exemple d'intégration standard pour instancier l'infrastructure d'identité souveraine multi-banques. Le playbook invite l'ingénieur de sécurité à saisir le secret maître de manière interactive et masquée :

```yaml
---
- name: "[NSIA INFRASTRUCTURE] Déploiement de la IAM Fabric Multi-Tenant"
  hosts: localhost
  gather_facts: false

  vars_prompt:
    - name: "keycloak_admin_password"
      prompt: "🛡️ Veuillez saisir le mot de passe super_admin de Keycloak"
      private: yes

  roles:
    - role: nsia_iam_central_enforcer

```

Pour piloter l'exécution dans un pipeline automatisé CI/CD (sans invite interactive), passez la variable via les `extra-vars` :

```bash
export NSIA_SECRET="222_Jme_0075"
ansible-playbook deploy_iam_platform.yml -e "keycloak_admin_password=${NSIA_SECRET}"

```

## License

Propriétaire / Universitaire - Réservé exclusivement au Projet de Fin d'Études (PFE) NSIA Bancassurance.

## Author Information

**Pierre Christivie LANDZI**

* **Profil :** Élève-Ingénieur en Cybersécurité et DevSecOps
* **Sujet d'étude :** Conception d’une architecture applicative sécurisée basée sur une approche Security by Design dans un écosystème de Bancassurance (NSIA / République du Congo).