import logging
import requests
from django.conf import settings
from apps.core.models import Utilisateur

logger = logging.getLogger(__name__)

def get_keycloak_realm_from_banque(banque):
    """
    Détermine le nom du Realm Keycloak associé à une Banque.
    """
    if not banque:
        return 'master'
    code = banque.code_banque.upper()
    if code == 'CDCO':
        return 'BANK_CREDIT_DU_CONGO'
    elif code == 'HOPE':
        return 'BANK_HOPE_CONGO'
    elif code == 'CHARDEN':
        return 'BANK_CHARDEN_FARREL'
    return f"BANK_{code}"

def get_keycloak_admin_token():
    """
    Obtient le jeton d'accès admin du Realm Master de Keycloak.
    """
    keycloak_url = getattr(settings, 'KEYCLOAK_URL', 'http://keycloak.nsia-iam.svc.cluster.local:8080')
    admin_user = getattr(settings, 'KEYCLOAK_ADMIN_USER', 'Nsia_admin')
    admin_password = getattr(settings, 'KEYCLOAK_ADMIN_PASSWORD', '222_Jme_0075')
    
    url = f"{keycloak_url}/realms/master/protocol/openid-connect/token"
    data = {
        'client_id': 'admin-cli',
        'username': admin_user,
        'password': admin_password,
        'grant_type': 'password'
    }
    
    try:
        response = requests.post(url, data=data, timeout=10)
        response.raise_for_status()
        return response.json()['access_token']
    except Exception as e:
        logger.error(f"Erreur d'authentification admin Keycloak: {e}")
        raise ValueError(f"Impossible de s'authentifier à Keycloak en tant qu'administrateur : {e}")

def sync_django_user_to_keycloak(user, password):
    """
    Crée un utilisateur dans Keycloak avec ses attributs et rôles correspondants.
    Retourne l'UUID de l'utilisateur généré par Keycloak.
    """
    keycloak_url = getattr(settings, 'KEYCLOAK_URL', 'http://keycloak.nsia-iam.svc.cluster.local:8080')
    token = get_keycloak_admin_token()
    
    realm = get_keycloak_realm_from_banque(user.banque)
    
    # Construction des attributs du profil utilisateur Keycloak
    attributes = {}
    if user.banque:
        attributes['bank'] = [user.banque.code_banque.upper()]
        attributes['scope'] = ['BANK']
    if user.agence:
        attributes['agency'] = [user.agence.code]
        
    user_data = {
        "username": user.username,
        "email": user.email,
        "enabled": user.est_actif,
        "emailVerified": True,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "credentials": [
            {
                "type": "password",
                "value": password,
                "temporary": False
            }
        ],
        "attributes": attributes
    }
    
    # 1. Création de l'utilisateur
    url = f"{keycloak_url}/admin/realms/{realm}/users"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, json=user_data, headers=headers, timeout=10)
        if response.status_code == 201:
            location = response.headers.get('Location')
            if not location:
                raise ValueError("En-tête 'Location' manquant dans la réponse de Keycloak.")
            user_id = location.split('/')[-1]
        elif response.status_code == 409:
            raise ValueError("Le nom d'utilisateur ou l'adresse e-mail existe déjà dans Keycloak.")
        else:
            raise ValueError(f"Erreur Keycloak ({response.status_code}): {response.text}")
    except Exception as e:
        logger.error(f"Échec de création de l'utilisateur {user.username} dans Keycloak (Realm: {realm}): {e}")
        raise
        
    # 2. Assignation du rôle
    DJANGO_TO_KC_ROLE = {
        Utilisateur.Role.RESPONSABLE_BANQUE: 'BANK_SUPER_ADMIN',
        Utilisateur.Role.RESPONSABLE_AGENCE: 'BANK_AGENCY_MANAGER',
        Utilisateur.Role.GESTIONNAIRE: 'BANK_AGENCY_OPERATOR',
        Utilisateur.Role.SUPPORT: 'BANK_SUPPORT',
        Utilisateur.Role.SUPER_ADMIN: 'NSIA_SUPER_ADMIN',
        Utilisateur.Role.ADMIN_NSIA: 'NSIA_ADMIN',
    }
    
    role_name = DJANGO_TO_KC_ROLE.get(user.role)
    if role_name:
        try:
            # Récupérer l'ID du rôle
            role_url = f"{keycloak_url}/admin/realms/{realm}/roles/{role_name}"
            role_resp = requests.get(role_url, headers=headers, timeout=10)
            role_resp.raise_for_status()
            role_data = role_resp.json()
            
            # Mapper le rôle
            mapping_url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/role-mappings/realm"
            mapping_payload = [{
                'id': role_data['id'],
                'name': role_data['name']
            }]
            map_resp = requests.post(mapping_url, json=mapping_payload, headers=headers, timeout=10)
            map_resp.raise_for_status()
        except Exception as e:
            logger.error(f"Erreur lors de l'assignation du rôle {role_name} à {user.username} dans Keycloak: {e}")
            # Rollback: suppression de l'utilisateur créé dans Keycloak
            requests.delete(f"{keycloak_url}/admin/realms/{realm}/users/{user_id}", headers=headers, timeout=10)
            raise ValueError(f"Impossible d'assigner le rôle Keycloak '{role_name}': {e}")
            
    return user_id

def update_keycloak_user_status(user, is_active):
    """
    Active ou désactive l'utilisateur dans Keycloak.
    """
    keycloak_url = getattr(settings, 'KEYCLOAK_URL', 'http://keycloak.nsia-iam.svc.cluster.local:8080')
    token = get_keycloak_admin_token()
    
    realm = get_keycloak_realm_from_banque(user.banque)
    user_id = str(user.id)
    
    url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    payload = {
        "enabled": is_active
    }
    
    try:
        response = requests.put(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"Statut Keycloak mis à jour pour {user.username} (Actif: {is_active})")
    except Exception as e:
        logger.error(f"Impossible de mettre à jour le statut Keycloak de {user.username}: {e}")
        raise ValueError(f"Échec de mise à jour du statut dans Keycloak : {e}")

def reset_keycloak_user_password(user, new_password):
    """
    Réinitialise le mot de passe de l'utilisateur dans Keycloak.
    """
    keycloak_url = getattr(settings, 'KEYCLOAK_URL', 'http://keycloak.nsia-iam.svc.cluster.local:8080')
    token = get_keycloak_admin_token()
    
    realm = get_keycloak_realm_from_banque(user.banque)
    user_id = str(user.id)
    
    url = f"{keycloak_url}/admin/realms/{realm}/users/{user_id}/reset-password"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    payload = {
        "type": "password",
        "value": new_password,
        "temporary": False
    }
    
    try:
        response = requests.put(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info(f"Mot de passe Keycloak réinitialisé pour {user.username}")
    except Exception as e:
        logger.error(f"Impossible de réinitialiser le mot de passe Keycloak de {user.username}: {e}")
        raise ValueError(f"Échec de réinitialisation du mot de passe dans Keycloak : {e}")
