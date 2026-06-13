"""
Gestionnaire d'exceptions personnalisé pour l'API
"""
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Gestionnaire d'exceptions personnalisé
    Formate les erreurs de manière uniforme
    """
    
    # Appeler le handler par défaut de DRF
    response = drf_exception_handler(exc, context)
    
    # Si DRF a géré l'exception
    if response is not None:
        # Personnaliser le format de la réponse
        custom_response_data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': _get_error_message(response.data),
                'details': response.data if isinstance(response.data, dict) else {}
            }
        }
        response.data = custom_response_data
    
    return response


def _get_error_message(data):
    """
    Extrait un message d'erreur lisible des données
    """
    if isinstance(data, dict):
        # Essayer d'extraire le message principal
        if 'detail' in data:
            return data['detail']
        elif 'non_field_errors' in data:
            return data['non_field_errors'][0] if isinstance(data['non_field_errors'], list) else data['non_field_errors']
        else:
            # Retourner le premier message d'erreur trouvé
            for key, value in data.items():
                if isinstance(value, list):
                    return f"{key}: {value[0]}"
                elif isinstance(value, str):
                    return f"{key}: {value}"
    elif isinstance(data, list):
        return data[0] if data else "Une erreur est survenue"
    elif isinstance(data, str):
        return data
    
    return "Une erreur est survenue"
