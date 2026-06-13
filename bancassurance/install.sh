#!/bin/bash
# Script d'installation rapide - NSIA Backend

echo "🚀 Installation NSIA Backend..."
echo ""

# Couleurs pour output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier Python
echo "📌 Vérification Python..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version)${NC}"

# Vérifier PostgreSQL
echo "📌 Vérification PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL n'est pas installé. Installation manuelle requise.${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL installé${NC}"
fi

# Créer environnement virtuel
echo ""
echo "📦 Création environnement virtuel..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✓ Environnement virtuel créé${NC}"
else
    echo -e "${YELLOW}⚠️  Environnement virtuel existe déjà${NC}"
fi

# Activer environnement
echo "📌 Activation environnement..."
source venv/bin/activate

# Installer dépendances
echo ""
echo "📦 Installation des dépendances..."
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Dépendances installées${NC}"

# Copier .env.example vers .env
echo ""
echo "⚙️  Configuration environnement..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Fichier .env créé${NC}"
    echo -e "${YELLOW}⚠️  Pensez à modifier .env avec vos paramètres !${NC}"
else
    echo -e "${YELLOW}⚠️  Fichier .env existe déjà${NC}"
fi

# Créer base de données PostgreSQL
echo ""
read -p "Voulez-vous créer la base de données PostgreSQL ? (o/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "📊 Création base de données..."
    read -p "Nom de la base de données [nsia_db]: " db_name
    db_name=${db_name:-nsia_db}
    
    read -p "Utilisateur PostgreSQL [postgres]: " db_user
    db_user=${db_user:-postgres}
    
    sudo -u postgres psql -c "CREATE DATABASE $db_name;"
    sudo -u postgres psql -c "CREATE USER nsia_user WITH PASSWORD 'nsia_password';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $db_name TO nsia_user;"
    
    echo -e "${GREEN}✓ Base de données créée${NC}"
    echo -e "${YELLOW}⚠️  Mettez à jour DB_NAME, DB_USER, DB_PASSWORD dans .env${NC}"
fi

# Migrations
echo ""
read -p "Voulez-vous exécuter les migrations maintenant ? (o/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "🔄 Application des migrations..."
    python manage.py makemigrations
    python manage.py migrate
    echo -e "${GREEN}✓ Migrations appliquées${NC}"
fi

# Créer superuser
echo ""
read -p "Voulez-vous créer un superutilisateur ? (o/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "👤 Création superutilisateur..."
    python manage.py createsuperuser
fi

# Résumé
echo ""
echo "============================================"
echo -e "${GREEN}✅ Installation terminée !${NC}"
echo "============================================"
echo ""
echo "Prochaines étapes :"
echo "1. Éditer .env avec vos paramètres"
echo "2. Activer l'environnement : source venv/bin/activate"
echo "3. Lancer le serveur : python manage.py runserver"
echo ""
echo "Documentation API : http://localhost:8000/api/docs/"
echo ""
