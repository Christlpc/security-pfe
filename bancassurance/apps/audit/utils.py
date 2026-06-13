import logging
from django.conf import settings
from apps.core.middleware import get_current_user, get_current_banque, get_correlation_id
from apps.audit.models import AuditLog

# Logger dédié aux événements de sécurité
security_logger = logging.getLogger('django.security')

def log_audit(action, ressource_type, ressource_id=None, details=None, user=None, banque=None, agence=None, ip_address=None, user_agent=None, resultat='SUCCESS'):
    """
    Crée un enregistrement d'audit de sécurité persistant en base de données
    et envoie un événement formaté aux logs système.
    
    Paramètres :
    - action : Type de transaction (ex : 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN_FAILED')
    - ressource_type : Nom de la ressource concernée (ex : 'Simulation', 'Souscription')
    - ressource_id : Identifiant technique de la ressource
    - details : Dictionnaire JSON décrivant les modifications (champs modifiés, motifs...)
    """
    # Résolution automatique depuis le contexte de la requête si manquant
    if not user:
        user = get_current_user()
        
    if not banque:
        banque = get_current_banque()
        if not banque and user and hasattr(user, 'banque'):
            banque = user.banque
            
    if not agence and user and hasattr(user, 'agence'):
        agence = user.agence
        
    correlation_id = get_correlation_id() or ''
    username = user.username if user and user.is_authenticated else 'Système'
    
    if details is None:
        details = {}
        
    try:
        # Insertion de l'entrée d'audit
        log_entry = AuditLog.objects.create(
            utilisateur=user if user and user.is_authenticated else None,
            username=username,
            banque=banque,
            agence=agence,
            action=action,
            ressource_type=ressource_type,
            ressource_id=str(ressource_id) if ressource_id else '',
            details=details,
            resultat=resultat,
            ip_address=ip_address,
            user_agent=user_agent or '',
            correlation_id=correlation_id
        )
        
        # Envoi de l'événement d'audit aux logs structurés de sécurité
        security_logger.info(
            f"[AUDIT] Action={action} | Ressource={ressource_type} | ID={ressource_id} | "
            f"User={username} | Banque={banque.code_banque if banque else 'NSIA'} | "
            f"Result={resultat} | CID={correlation_id}"
        )
        return log_entry
    except Exception as e:
        # Sécurité par défaut : l'échec de journalisation d'audit ne doit pas faire
        # planter l'action métier, mais doit être notifié de façon critique.
        security_logger.critical(f"CRITICAL: Échec de l'enregistrement du log d'audit : {e}")
        return None
