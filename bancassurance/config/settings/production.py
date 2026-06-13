"""
Configuration Django - Environnement PRODUCTION
Sécurité renforcée pour environnement de production
"""
from .base import *
from decouple import config

# ============================================
# SÉCURITÉ CRITIQUE
# ============================================
DEBUG = False  # ← JAMAIS True en production !

SECRET_KEY = config('SECRET_KEY')  # OBLIGATOIRE en production

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# ============================================
# PROTECTION HTTPS & COOKIES
# ============================================
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000  # 1 an
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Protection supplémentaire des cookies
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = 3600  # 1 heure max de session
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# ============================================
# DATABASE
# ============================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='5432'),
        'CONN_MAX_AGE': 600,
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}

# ============================================
# CACHE
# ============================================
_redis_url = config('REDIS_URL', default='')

if _redis_url:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _redis_url,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                'IGNORE_EXCEPTIONS': True,
            }
        }
    }
else:
    # SECURITE : fallback sur LocMemCache si Redis n'est pas disponible.
    # Le throttling (rate limiting) NECESSITE un cache fonctionnel.
    # Sans cache, les tentatives de brute-force ne sont PAS bloquées !
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'nsia-production-cache',
        }
    }
    import logging
    logging.getLogger('django.security').warning(
        "SECURITE: Redis non configuré ! Le rate limiting utilise LocMemCache "
        "(non partagé entre workers). Configurez REDIS_URL pour un throttling fiable."
    )

# ============================================
# EMAIL
# ============================================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('EMAIL_HOST_USER')

# ============================================
# RATE LIMITING / THROTTLING DRF
# Protection contre le brute-force et les abus
# ============================================
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
    'rest_framework.throttling.AnonRateThrottle',
    'rest_framework.throttling.UserRateThrottle',
]
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '20/minute',                # Visiteurs non authentifiés : 20 req/min
    'user': '120/minute',               # Utilisateurs authentifiés  : 120 req/min
    'login': '5/minute',                # Tentatives de login        : 5/min
    'password_reset_request': '3/hour', # Demande de reset MDP       : 3/h par IP
    'password_reset_confirm': '5/hour', # Confirmation reset          : 5/h par IP
    'password_change': '3/hour',        # Changement MDP authentifié : 3/h par user
}

# ============================================
# LOGGING
# ============================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'security': {
            'format': '[SECURITY] {levelname} {asctime} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'security_console': {
            'class': 'logging.StreamHandler',
            'formatter': 'security',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django.security': {
            'handlers': ['console', 'security_console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
# ============================================
# FRONTEND URL (pour les emails de reset MDP)
# ============================================
FRONTEND_BASE_URL = config('FRONTEND_BASE_URL', default='https://nsia-bancassurances.vercel.app')

# ============================================
# CORS restreint en production
# ============================================
CORS_ALLOW_ALL_ORIGINS = False
# Les origines autorisées sont définies dans base.py
