# 1. Image de base légère (Python 3.12 slim pour réduire la surface d'attaque)
FROM python:3.12-slim

# 2. Variables d'environnement pour la sécurité et l'optimisation Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 3. Installation des dépendances système nécessaires pour WeasyPrint (PDF generation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# 4. Sécurité : Création d'un utilisateur et d'un groupe non-root
RUN addgroup --system appgroup && adduser --system --group appuser

# 5. Installation des dépendances Python (SCA-ready)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copie du code applicatif
COPY . .

# 7. Attribution des droits à l'utilisateur non-root
RUN chown -R appuser:appgroup /app
USER appuser

# 8. Exposition du port applicatif
EXPOSE 8000

# 9. Commande de lancement (Gunicorn est nécessaire pour la prod)
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
