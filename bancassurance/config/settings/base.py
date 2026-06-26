"""
Configuration Django de base - NSIA Backend
Paramètres communs à tous les environnements
"""
import os
from pathlib import Path
from datetime import timedelta
from decouple import config

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
# La clé par défaut est UNIQUEMENT pour le développement local.
# En production, SECRET_KEY DOIT être défini dans les variables d'environnement
# et faire au minimum 50 caractères aléatoires.
SECRET_KEY = config('SECRET_KEY', default='django-insecure-dev-key-change-in-production')

# Vérification de sécurité : bloquer le démarrage si la clé est trop faible en production
import os as _os
if _os.environ.get('DJANGO_ENV') == 'production' and len(SECRET_KEY) < 32:
    raise ValueError(
        "SECURITE CRITIQUE : SECRET_KEY trop courte pour la production ! "
        "Générez une clé d'au moins 50 caractères avec : "
        "python3 -c \"from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())\""
    )

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',
    
    # NSIA Apps
    'apps.core',
    'apps.simulateur',
    'apps.tarification',
    'apps.documents',
    #'apps.analytics',
    'apps.audit',  # Activé pour l'Audit Trail
]

MIDDLEWARE = [
    'apps.core.middleware.CorrelationIDMiddleware',  # Propagation du Correlation ID (en premier)
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # ← Doit être ici !
    'corsheaders.middleware.CorsMiddleware',  # CORS doit être avant CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.core.middleware.MultiTenantMiddleware',  # Après AuthenticationMiddleware pour avoir accès à request.user
    'apps.audit.middleware.AuditMiddleware',  # Activé pour intercepter les actions à auditer
    'apps.core.middleware.ObservabilityMiddleware',  # Mesure des latences et logs structurés JSON
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]



ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        #'DIRS':  os.path.join(BASE_DIR, 'apps/simulateur/templates'),
        'DIRS': [
            BASE_DIR / 'templates',  # ← CRITICAL : Ajouter cette ligne !
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='nsia_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Custom User Model
AUTH_USER_MODEL = 'core.Utilisateur'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Brazzaville'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_DIRS = [
    BASE_DIR / 'static',  # ← Ajouter cette ligne
]

# Configuration WhiteNoise (optionnel mais recommandé)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files (uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.core.authentication.KeycloakJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
    # Throttling de base (renforcé en production)
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',
        'user': '200/minute',
        'login': '5/minute',
        'simulation': '30/minute',
        'password_reset_request': '3/hour',
        'password_reset_confirm': '5/hour',
        'password_change': '3/hour',
    },
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=config('JWT_REFRESH_TOKEN_LIFETIME', default=1440, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",  
    "https://nsia-banque-ud2v.vercel.app",
    "https://nsia-banque-nine.vercel.app",
    "https://nsia-bancassurances.vercel.app",
]
CORS_ALLOW_CREDENTIALS = True

# Frontend URL (pour les liens dans les emails de reset password)
FRONTEND_BASE_URL = config(
    'FRONTEND_BASE_URL',
    default='http://localhost:3000'
)

# Keycloak Administration Integration
KEYCLOAK_URL = config('KEYCLOAK_URL', default='http://keycloak.nsia-iam.svc.cluster.local:8080')
KEYCLOAK_ADMIN_USER = config('KEYCLOAK_ADMIN_USER', default='Nsia_admin')
KEYCLOAK_ADMIN_PASSWORD = config('KEYCLOAK_ADMIN_PASSWORD', default='222_Jme_0075')


# DRF Spectacular (Swagger/OpenAPI)
SPECTACULAR_SETTINGS = {
    'TITLE': 'NSIA Assurances API',
    'DESCRIPTION': 'API Backend pour le simulateur multi-tenant NSIA',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Logging Configuration (JSON structuré)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'json': {
            '()': 'apps.core.middleware.JSONFormatter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
