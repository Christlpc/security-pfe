import jwt
import logging
import uuid
from django.conf import settings
from rest_framework import authentication
from rest_framework import exceptions
from django.contrib.auth import get_user_model
from django.db import models
from apps.core.models import Banque, Agence

logger = logging.getLogger(__name__)
User = get_user_model()

# Mapping des rôles de Keycloak vers les rôles locaux de Django
ROLE_MAP = {
    'BANK_SUPER_ADMIN': User.Role.RESPONSABLE_BANQUE,
    'BANK_AUDITOR': User.Role.SUPPORT,
    'BANK_SUPPORT': User.Role.SUPPORT,
    'BANK_AGENCY_MANAGER': User.Role.RESPONSABLE_AGENCE,
    'BANK_AGENCY_OPERATOR': User.Role.GESTIONNAIRE,
    'NSIA_SUPER_ADMIN': User.Role.SUPER_ADMIN,
    'NSIA_ADMIN': User.Role.ADMIN_NSIA,
}

# Mapping des codes de banques du registre Ansible vers la DB
BANK_CODE_MAP = {
    'credit_du_congo': 'CDCO',
    'charden_farrel': 'CHARDEN',
    'express_union': 'EXPRESS_UNION',
    'hope_congo': 'HOPE',
}

class KeycloakJWTAuthentication(authentication.BaseAuthentication):
    """
    Système d'authentification personnalisée intégrant Keycloak et Kong.
    
    Responsabilités :
    1. Récupérer le jeton JWT validé cryptographiquement par Kong.
    2. Décoder le jeton et en extraire les claims multi-tenant (sub, bank_id, agency_id, roles).
    3. Synchroniser ou créer à la volée l'utilisateur, sa banque et son agence.
    4. Injecter les informations de sécurité dans le contexte Django (User).
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None

        token = parts[1]

        try:
            # L'API Gateway Kong a déjà effectué la validation cryptographique du jeton.
            # Pour la Défense en Profondeur, nous décodons le jeton et appliquons notre logique.
            # verify_signature est désactivé ici car Kong est le point d'entrée de confiance,
            # mais nous vérifions l'intégrité structurelle du JWT.
            payload = jwt.decode(token, options={"verify_signature": False})
        except jwt.DecodeError:
            raise exceptions.AuthenticationFailed("Format de jeton JWT invalide.")
        except Exception as e:
            raise exceptions.AuthenticationFailed(f"Échec de décodage JWT: {str(e)}")

        sub = payload.get('sub')
        if not sub:
            raise exceptions.AuthenticationFailed("Le jeton JWT ne contient pas le claim obligatoire 'sub'.")

        # Extraction des métadonnées utilisateur
        username = payload.get('preferred_username') or payload.get('username') or sub
        email = payload.get('email', '')
        first_name = payload.get('given_name') or payload.get('first_name', '')
        last_name = payload.get('family_name') or payload.get('last_name', '')

        # Extraction des claims multi-tenant
        bank_code = payload.get('bank_id') or payload.get('bank')
        agency_code = payload.get('agency_id') or payload.get('agency')

        # Extraction des rôles (support du root 'roles', de 'realm_access' et 'resource_access')
        token_roles = payload.get('roles', [])
        if not token_roles and 'realm_access' in payload:
            token_roles = payload['realm_access'].get('roles', [])

        # Détermination du rôle Django
        django_role = User.Role.GESTIONNAIRE  # Rôle par défaut de sécurité
        for role in token_roles:
            if role in ROLE_MAP:
                django_role = ROLE_MAP[role]
                break

        # Résolution/Création de la Banque
        banque = None
        if bank_code:
            lookup_code = BANK_CODE_MAP.get(bank_code.lower(), bank_code)
            banque = Banque.objects.filter(
                models.Q(code_banque__iexact=lookup_code) | 
                models.Q(nom_court__iexact=lookup_code) | 
                models.Q(nom_complet__icontains=lookup_code)
            ).first()

            if not banque:
                logger.info(f"Banque '{bank_code}' non configurée dans la base. Création dynamique...")
                banque = Banque.objects.create(
                    code_banque=lookup_code.upper(),
                    nom_complet=f"Banque {lookup_code.upper()}",
                    email_contact=f"contact@{lookup_code.lower()}.com",
                )

        # Résolution/Création de l'Agence
        agence = None
        if agency_code and banque:
            agence = Agence.objects.filter(banque=banque, code__iexact=agency_code).first()
            if not agence:
                logger.info(f"Agence '{agency_code}' non configurée pour la banque '{banque.code_banque}'. Création dynamique...")
                # Création dynamique de l'agence pour assurer la continuité opérationnelle
                agence = Agence.objects.create(
                    banque=banque,
                    code=agency_code.upper(),
                    nom=f"Agence {agency_code}",
                )

        # Validation de l'UUID pour la clé primaire locale
        try:
            user_uuid = uuid.UUID(str(sub))
        except ValueError:
            # Si le sub de Keycloak n'est pas un UUID valide, nous générons un UUID stable basé sur le sub
            user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, str(sub))

        # Provisionnement dynamique ou synchronisation de l'utilisateur
        try:
            user = User.objects.filter(id=user_uuid).first()
            if not user:
                # Chercher par username au cas où l'utilisateur a été pré-créé sans UUID Keycloak
                user = User.objects.filter(username=username).first()

            if not user:
                logger.info(f"Nouvel utilisateur détecté via IAM. Provisionnement de {username} (ID: {user_uuid})...")
                # Création de l'utilisateur
                user = User.objects.create(
                    id=user_uuid,
                    username=username,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role=django_role,
                    banque=banque,
                    agence=agence,
                    is_active=True
                )
            else:
                # Synchronisation des propriétés de l'identité et de l'affectation
                user.id = user_uuid
                user.username = username
                user.email = email
                user.first_name = first_name
                user.last_name = last_name
                user.role = django_role
                user.banque = banque
                user.agence = agence
                user.save()

        except Exception as e:
            logger.error(f"Erreur lors de la synchronisation de l'utilisateur '{username}': {e}")
            raise exceptions.AuthenticationFailed(f"Erreur de synchronisation de l'utilisateur IAM: {str(e)}")

        return (user, None)
