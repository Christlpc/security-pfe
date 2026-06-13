from django.utils.deprecation import MiddlewareMixin
from apps.audit.utils import log_audit

class AuditMiddleware(MiddlewareMixin):
    """
    Middleware d'audit automatique interceptant les opérations d'écriture (POST, PUT, DELETE)
    et les consultations d'informations de conformité et de santé.
    """
    def process_response(self, request, response):
        path = request.path
        method = request.method
        
        # Filtrer uniquement les appels d'API métier v1
        if not path.startswith('/api/v1/'):
            return response
            
        action = None
        ressource_type = None
        ressource_id = None
        
        # Analyse de l'URI : /api/v1/<ressource>/[id]/[action]
        parts = [p for p in path.split('/') if p]
        
        if len(parts) >= 3:
            ressource = parts[2].lower()
            if len(parts) >= 4:
                ressource_id = parts[3]
                
            # Résolution de la ressource concernée
            if 'simulation' in ressource:
                ressource_type = 'Simulation'
            elif 'souscription' in ressource:
                ressource_type = 'Souscription'
            elif 'utilisateur' in ressource:
                ressource_type = 'Utilisateur'
            elif 'banque' in ressource:
                ressource_type = 'Banque'
            elif 'agence' in ressource:
                ressource_type = 'Agence'
            elif 'questionnaire' in ressource or 'medical' in ressource:
                ressource_type = 'QuestionnaireMedical'
                
            # Résolution de l'action selon la méthode HTTP
            if method == 'POST':
                action = 'CREATE'
                # Sous-actions spécifiques (calculer, valider, etc.)
                if len(parts) >= 5:
                    action = parts[4].upper()
            elif method in ('PUT', 'PATCH'):
                action = 'UPDATE'
            elif method == 'DELETE':
                action = 'DELETE'
            elif method == 'GET':
                # Enregistrer l'audit en lecture seule uniquement pour les fichiers et données de santé
                if 'export-pdf' in parts or 'export' in parts:
                    action = 'EXPORT_PDF'
                elif ressource_type == 'QuestionnaireMedical':
                    action = 'VIEW_MEDICAL'
                    
        # Logguer la transaction si elle est auditée
        if action and ressource_type:
            # Détermination du statut de la transaction
            resultat = 'SUCCESS' if 200 <= response.status_code < 300 else 'FAILURE'
            
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            details = {
                'method': method,
                'path': path,
                'status_code': response.status_code
            }
            
            log_audit(
                action=action,
                ressource_type=ressource_type,
                ressource_id=ressource_id,
                details=details,
                user=request.user,
                ip_address=ip_address,
                user_agent=user_agent,
                resultat=resultat
            )
            
        return response

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
