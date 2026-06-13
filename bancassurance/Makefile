# Makefile pour NSIA Backend
# Facilite les commandes courantes de développement

.PHONY: help install migrate run test clean

help:
	@echo "Commandes disponibles :"
	@echo "  make install    - Installer les dépendances"
	@echo "  make migrate    - Créer et appliquer les migrations"
	@echo "  make run        - Lancer le serveur de développement"
	@echo "  make test       - Lancer les tests"
	@echo "  make clean      - Nettoyer les fichiers temporaires"
	@echo "  make super      - Créer un superutilisateur"
	@echo "  make shell      - Ouvrir le shell Django"

install:
	pip install -r requirements.txt

migrate:
	python manage.py makemigrations
	python manage.py migrate

run:
	python manage.py runserver

test:
	pytest

clean:
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage

super:
	python manage.py createsuperuser

shell:
	python manage.py shell

collectstatic:
	python manage.py collectstatic --noinput

format:
	black apps/ config/ api/

lint:
	flake8 apps/ config/ api/
