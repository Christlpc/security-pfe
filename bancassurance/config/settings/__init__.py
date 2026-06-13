"""
Sélection automatique de la configuration selon DJANGO_ENV.

IMPORTANT SECURITE :
  - En production, DJANGO_ENV doit valoir 'production'
  - Le mode development ne doit JAMAIS être utilisé sur un serveur public
  - Par défaut (si DJANGO_ENV absent), on charge production par sécurité
"""
import os

env = os.environ.get('DJANGO_ENV', 'production')

if env == 'development':
    from .development import *  # noqa: F401,F403
else:
    # SECURITE : tout ce qui n'est pas explicitement 'development'
    # charge la config production (fail-safe)
    from .production import *  # noqa: F401,F403