import json
import logging
import threading
import uuid
import time
from django.utils.deprecation import MiddlewareMixin
from django.db import connection

# Thread-local storage pour stocker le contexte banque et correlation_id
_thread_locals = threading.local()

def get_current_banque():
    """Récupère la banque du contexte actuel"""
    return getattr(_thread_locals, 'banque', None)


def get_current_user():
    """Récupère l'utilisateur du contexte actuel"""
    return getattr(_thread_locals, 'user', None)


def get_correlation_id():
    """Récupère le correlation_id du contexte actuel"""
    return getattr(_thread_locals, 'correlation_id', None)


def set_current_banque(banque):
    """Définit la banque dans le contexte"""
    _thread_locals.banque = banque


def set_current_user(user):
    """Définit l'utilisateur dans le contexte"""
    _thread_locals.user = user


def set_correlation_id(correlation_id):
    """Définit le correlation_id dans le contexte"""
    _thread_locals.correlation_id = correlation_id


class JSONFormatter(logging.Formatter):
    """
    Formatter de logs personnalisé générant du JSON structuré.
    Injecte automatiquement le correlation_id s'il est présent.
    """
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record, self.datefmt),
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'correlation_id': get_correlation_id(),
        }
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_data)


class CorrelationIDMiddleware(MiddlewareMixin):
    """
    Middleware qui extrait ou génère un Correlation ID (X-Correlation-ID / X-Request-ID)
    et le stocke dans le contexte local de thread.
    """
    def process_request(self, request):
        cid = request.headers.get('X-Correlation-ID') or request.headers.get('X-Request-ID')
        if not cid:
            cid = str(uuid.uuid4())
        set_correlation_id(cid)
        request.correlation_id = cid

    def process_response(self, request, response):
        cid = getattr(request, 'correlation_id', None)
        if cid:
            response['X-Correlation-ID'] = cid
        set_correlation_id(None)
        return response


class MultiTenantMiddleware(MiddlewareMixin):
    """
    Middleware qui injecte le contexte de banque pour l'ORM Django
    et configure les variables de session PostgreSQL pour activer la RLS.
    """
    def process_request(self, request):
        # Nettoyer le contexte précédent
        set_current_banque(None)
        set_current_user(None)
        self._set_db_session_vars(None, False)

        # Si l'utilisateur est authentifié
        if request.user and request.user.is_authenticated:
            set_current_user(request.user)
            
            # Stocker la banque si elle existe
            banque = None
            if hasattr(request.user, 'banque') and request.user.banque:
                banque = request.user.banque
                set_current_banque(banque)

            # RLS Bypass : Seuls Super Admin et Admin NSIA peuvent contourner RLS
            bypass_rls = request.user.est_super_admin or request.user.est_admin_nsia
            self._set_db_session_vars(banque, bypass_rls)

    def _set_db_session_vars(self, banque, bypass_rls):
        """
        Définit les variables de session PostgreSQL de manière sécurisée (paramètres liés).
        """
        try:
            banque_id_str = str(banque.id) if banque else ''
            bypass_str = 'true' if bypass_rls else 'false'
            
            with connection.cursor() as cursor:
                # Injection sécurisée anti-SQLi via les paramètres %s de l'exécuteur de Django
                cursor.execute("SET app.current_banque_id = %s;", [banque_id_str])
                cursor.execute("SET app.bypass_rls = %s;", [bypass_str])
        except Exception:
            # Éviter de bloquer l'initialisation ou les migrations si la DB n'est pas encore prête
            pass

    def process_response(self, request, response):
        set_current_banque(None)
        set_current_user(None)
        self._set_db_session_vars(None, False)
        return response

    def process_exception(self, request, exception):
        set_current_banque(None)
        set_current_user(None)
        self._set_db_session_vars(None, False)
        return None


observability_logger = logging.getLogger('apps.observability')

class ObservabilityMiddleware(MiddlewareMixin):
    """
    Middleware d'observabilité enregistrant la latence des appels d'API
    et les sérialisant sous format JSON pour Loki.
    """
    def process_request(self, request):
        request.start_time = time.time()

    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            log_data = {
                'event': 'api_request',
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration_seconds': round(duration, 4),
                'correlation_id': get_correlation_id(),
                'user_id': str(request.user.id) if request.user and request.user.is_authenticated else None,
                'banque_id': str(request.user.banque.id) if request.user and request.user.is_authenticated and request.user.banque else None,
            }
            observability_logger.info(json.dumps(log_data))
        return response