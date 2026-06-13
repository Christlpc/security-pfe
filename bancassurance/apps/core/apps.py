"""
Configuration de l'application Core
"""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Configuration de l'app Core"""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = 'Core - Authentication & Multi-Tenant'
