"""
Configuration Django - Environnement DEVELOPMENT
"""
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'nsia-bancassurance.onrender.com']

# Database - peut rester sur SQLite en dev pour tests rapides
# Décommenter pour utiliser PostgreSQL même en dev

"""DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}"""

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 600,  # Connexions persistantes
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}


# Email Backend - Console pour dev#
#EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('EMAIL_HOST_USER')

FRONTEND_BASE_URL = config('FRONTEND_BASE_URL', default='http://127.0.0.1:3000')

# Cache - Simple backend pour dev
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'nsia-cache',
    }
}

# Debug Toolbar (optionnel, à installer si besoin)
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
# INTERNAL_IPS = ['127.0.0.1']

# CORS - Plus permissif en dev
CORS_ALLOW_ALL_ORIGINS = True

# Logging plus verbeux en dev
#LOGGING['root']['level'] = 'DEBUG'
#LOGGING['loggers']['apps']['level'] = 'DEBUG'

print("Django en mode DEVELOPMENT")
