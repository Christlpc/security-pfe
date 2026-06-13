"""
Throttling personnalisé pour NSIA
Protection contre le brute-force et les abus d'API
"""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """
    Limite les tentatives de connexion à 5 par minute par IP.
    Protège contre le brute-force sur les mots de passe.
    """
    scope = 'login'
    rate = '5/minute'


class PasswordResetRequestThrottle(AnonRateThrottle):
    """
    Limite les demandes de réinitialisation de mot de passe.
    3 demandes par heure par IP — suffisamment permissif pour un usage
    légitime, mais bloque les tentatives d'énumération d'emails.
    """
    scope = 'password_reset_request'
    rate = '3/hour'


class PasswordResetConfirmThrottle(AnonRateThrottle):
    """
    Limite les tentatives de confirmation de reset (validation du token).
    5 par heure par IP — empêche le brute-force de tokens.
    """
    scope = 'password_reset_confirm'
    rate = '5/hour'


class PasswordChangeThrottle(UserRateThrottle):
    """
    Limite les changements de mot de passe pour un user authentifié.
    3 par heure — un user légitime ne change pas son mot de passe
    plus de 3 fois par heure.
    """
    scope = 'password_change'
    rate = '3/hour'


class SimulationRateThrottle(UserRateThrottle):
    """
    Limite les simulations à 30 par minute par utilisateur.
    Évite les abus de calcul massif.
    """
    scope = 'simulation'
    rate = '30/minute'
