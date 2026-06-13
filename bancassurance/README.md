# NSIA Assurances - Backend API

Plateforme multi-tenant de simulation d'assurance pour les banques partenaires de NSIA.

## 🏗️ Architecture

```
nsia_backend/
├── config/              # Configuration Django
├── apps/                # Applications métier
│   ├── core/           # Auth & Multi-tenant
│   ├── simulateur/     # Moteur de calcul
│   ├── tarification/   # Tables tarifaires
│   ├── documents/      # Génération PDF
│   ├── analytics/      # Statistiques
│   └── audit/          # Traçabilité
└── api/v1/             # Endpoints REST
```

## 📋 Prérequis

- Python 3.10+
- PostgreSQL 14+
- Redis (optionnel, pour cache en production)

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd nsia_backend
```

### 2. Créer environnement virtuel

```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
```

### 3. Installer dépendances

```bash
pip install -r requirements.txt
```

### 4. Configuration environnement

```bash
cp .env.example .env
# Éditer .env avec vos paramètres
```

### 5. Créer base de données PostgreSQL

```bash
sudo -u postgres psql
CREATE DATABASE nsia_db;
CREATE USER nsia_user WITH PASSWORD 'votre_password';
GRANT ALL PRIVILEGES ON DATABASE nsia_db TO nsia_user;
\q
```

### 6. Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Créer superutilisateur

```bash
python manage.py createsuperuser
```

### 8. Lancer serveur développement

```bash
python manage.py runserver
```

L'API sera accessible sur : `http://localhost:8000`

## 📖 Documentation API

Une fois le serveur lancé :
- Swagger UI : `http://localhost:8000/api/docs/`
- ReDoc : `http://localhost:8000/api/redoc/`
- Schema OpenAPI : `http://localhost:8000/api/schema/`

## 🧪 Tests

```bash
pytest
```

## 🏦 Banques Partenaires

- Ecobank
- Crédit du Congo (CDCO)
- BGFI
- BCI
- Charden Farell
- Hope Congo

## 📦 Produits d'Assurance

1. **Emprunteur (ADI)** - Assurance Décès Invalidité
2. **Confort Études** - Épargne éducation
3. **Confort Retraite** - Épargne retraite
4. **Elikia Scolaire** (BCI)
5. **Mobateli** (BCI)
6. **Épargne Plus** (BGFI) - similaire à Emprunteur

## 🔐 Rôles Utilisateurs

- **Super Admin NSIA** : Accès total
- **Admin NSIA** : Lecture globale
- **Responsable Banque** : Gestion de sa banque
- **Gestionnaire** : Création simulations
- **Support** : Consultation & audit

## 📝 Variables d'environnement

Voir `.env.example` pour la liste complète.

Essentielles :
- `SECRET_KEY` : Clé secrète Django
- `DB_NAME`, `DB_USER`, `DB_PASSWORD` : Connexion PostgreSQL
- `DJANGO_ENV` : `development` ou `production`

## 🛠️ Commandes utiles

```bash
# Créer migrations
python manage.py makemigrations

# Appliquer migrations
python manage.py migrate

# Créer superuser
python manage.py createsuperuser

# Shell Django
python manage.py shell

# Collecter fichiers statiques
python manage.py collectstatic

# Importer tables tarifaires (Phase 2)
python manage.py import_tables --file tables.xlsx
```

## 📂 Structure des Apps

### Core
Gestion multi-tenant, authentification JWT, permissions RBAC

### Simulateur
Moteur de calcul des primes pour chaque produit

### Tarification
Tables de référence (taux, primes, tables actuarielles)

### Documents
Génération PDF (devis, BIA - Bulletin d'Adhésion)

### Analytics
Tableaux de bord et rapports

### Audit
Traçabilité complète des actions

## 🔄 Workflow Principal

1. Gestionnaire se connecte (JWT)
2. Renseigne infos emprunteur + prêt
3. API calcule prime automatiquement
4. Export devis PDF
5. Validation → Génération BIA
6. Conversion en souscription

## 🌐 Endpoints Principaux

```
POST   /api/v1/auth/login
GET    /api/v1/simulations/
POST   /api/v1/simulations/
POST   /api/v1/simulations/{id}/calculer/
GET    /api/v1/simulations/{id}/export-pdf/
GET    /api/v1/analytics/dashboard/
```

## 👥 Contribution

Ce projet est développé pour NSIA Assurances Congo.

## 📄 Licence

Propriétaire - NSIA Assurances
