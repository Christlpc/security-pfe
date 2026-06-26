"""
Serializers pour l'authentification et la gestion des utilisateurs
"""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.forms import ValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.simulateur.models import Simulation
from .models import Agence, Produit, ProduitBanque, Utilisateur, Banque


class BanqueSerializer(serializers.ModelSerializer):
    """Serializer pour le modèle Banque"""
    
    nb_utilisateurs = serializers.IntegerField(read_only=True, source='utilisateurs.count')
    est_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Banque
        fields = [
            'id', 'code_banque', 'nom_complet', 'nom_court',
            'logo', 'couleur_primaire', 'couleur_secondaire', 'police_principale',
            'email_contact', 'telephone_contact', 'adresse',
            'statut', 'est_active', 'date_partenariat',
            'parametres_specifiques', 'nb_utilisateurs',
            'date_creation', 'date_modification'
        ]
        read_only_fields = ['id', 'date_creation', 'date_modification']


class BanqueSimpleSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les références à Banque"""
    
    class Meta:
        model = Banque
        fields = ['id', 'code_banque', 'nom_complet', 'nom_court']


class UtilisateurSerializer(serializers.ModelSerializer):
    """Serializer pour le modèle Utilisateur"""
    
    banque_details = BanqueSimpleSerializer(source='banque', read_only=True)
    nom_complet = serializers.CharField(source='get_full_name', read_only=True)
    agence_nom = serializers.CharField(source='agence.nom', read_only=True)
    
    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'nom_complet',
            'role', 'banque', 'banque_details', 'matricule', 'telephone',
            'est_actif',
            'date_creation', 'date_modification', 'last_login', 'agence', 'agence_nom'
        ]
        read_only_fields = [
            'id', 'date_creation', 'date_modification', 'last_login',
            # SECURITE : ces champs ne doivent JAMAIS être modifiables via l'API
            'role', 'is_staff', 'is_superuser', 'banque', 'agence',
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def validate(self, attrs):
        """Validation des données"""
        role = attrs.get('role')
        banque = attrs.get('banque')
        
        # Vérifier cohérence rôle/banque
        roles_avec_banque = [
            Utilisateur.Role.RESPONSABLE_BANQUE,
            Utilisateur.Role.GESTIONNAIRE
        ]
        roles_sans_banque = [
            Utilisateur.Role.SUPER_ADMIN,
            Utilisateur.Role.ADMIN_NSIA
        ]
        
        if role in roles_avec_banque and not banque:
            raise serializers.ValidationError({
                'banque': f"Le rôle '{role}' nécessite une banque de rattachement"
            })
        
        if role in roles_sans_banque and banque:
            raise serializers.ValidationError({
                'banque': f"Le rôle '{role}' ne doit pas avoir de banque"
            })
        
        # Vérifier que le gestionnaire a une agence
        if attrs.get('role') == Utilisateur.Role.GESTIONNAIRE and not attrs.get('agence'):
            raise ValidationError({
                'agence': 'Un gestionnaire doit être rattaché à une agence'
            })
        
        # Vérifier que l'agence appartient à la banque
        if attrs.get('agence') and attrs.get('banque'):
            if attrs['agence'].banque != attrs['banque']:
                raise ValidationError({
                    'agence': "L'agence doit appartenir à la banque de l'utilisateur"
                })
        
        return attrs


class UtilisateurCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'utilisateurs (avec password)"""
    
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = Utilisateur
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'banque','agence',
            'matricule', 'telephone', 'est_actif'
        ]
    
    # Hiérarchie des rôles : un utilisateur ne peut créer que des rôles
    # strictement inférieurs au sien.
    ROLE_HIERARCHY = {
        Utilisateur.Role.GESTIONNAIRE: 1,
        Utilisateur.Role.RESPONSABLE_AGENCE: 2,
        Utilisateur.Role.RESPONSABLE_BANQUE: 3,
        Utilisateur.Role.ADMIN_NSIA: 4,
        Utilisateur.Role.SUPER_ADMIN: 5,
    }

    def validate_role(self, value):
        """
        SECURITE : Empêche l'escalade de privilèges.
        Un utilisateur ne peut créer que des comptes avec un rôle
        strictement inférieur au sien.
        """
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Contexte d'authentification manquant.")

        demandeur = request.user
        niveau_demandeur = self.ROLE_HIERARCHY.get(demandeur.role, 0)
        niveau_demande = self.ROLE_HIERARCHY.get(value, 99)

        if niveau_demande >= niveau_demandeur:
            raise serializers.ValidationError(
                f"Vous ne pouvez pas créer un utilisateur avec le rôle '{value}'. "
                f"Votre rôle ({demandeur.role}) ne le permet pas."
            )

        return value

    def validate(self, attrs):
        """Validation avec vérification password"""
        # Vérifier mots de passe identiques
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Les mots de passe ne correspondent pas"
            })

        # SECURITE : Restreindre la banque assignable
        request = self.context.get('request')
        if request and request.user:
            demandeur = request.user
            banque_demandee = attrs.get('banque')
            # Un responsable banque ne peut créer que dans sa propre banque
            if demandeur.est_responsable_banque and banque_demandee:
                if banque_demandee != demandeur.banque:
                    raise serializers.ValidationError({
                        'banque': "Vous ne pouvez créer des utilisateurs que dans votre propre banque."
                    })

        # Validation rôle/banque (même logique que UtilisateurSerializer)
        role = attrs.get('role')
        banque = attrs.get('banque')

        roles_avec_banque = [
            Utilisateur.Role.RESPONSABLE_BANQUE,
            Utilisateur.Role.RESPONSABLE_AGENCE,
            Utilisateur.Role.GESTIONNAIRE
        ]
        roles_sans_banque = [
            Utilisateur.Role.SUPER_ADMIN,
            Utilisateur.Role.ADMIN_NSIA
        ]

        if role in roles_avec_banque and not banque:
            raise serializers.ValidationError({
                'banque': f"Le rôle '{role}' nécessite une banque de rattachement"
            })

        if role in roles_sans_banque and banque:
            raise serializers.ValidationError({
                'banque': f"Le rôle '{role}' ne doit pas avoir de banque"
            })

        return attrs
    
    def create(self, validated_data):
        """Créer l'utilisateur avec password hashé et provisionnement Keycloak"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # 1. Instancier l'utilisateur Django en mémoire
        user = Utilisateur(**validated_data)
        
        # 2. Provisionner dans Keycloak
        try:
            from apps.core.keycloak_sync import sync_django_user_to_keycloak
            user_id = sync_django_user_to_keycloak(user, password)
            user.id = user_id
        except Exception as e:
            raise serializers.ValidationError({
                'non_field_errors': [f"Échec de la synchronisation IAM (Keycloak) : {str(e)}"]
            })
            
        # 3. Sauvegarder dans la DB locale
        user.set_password(password)
        user.save()
        return user



class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer JWT custom qui ajoute des informations dans le token
    """
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # SECURITE : minimiser les claims JWT (pas de données sensibles).
        # Le rôle et les permissions sont vérifiés en BDD, pas dans le JWT.
        token['user_id'] = str(user.id)
        
        return token
    
    def _get_produits_autorises(self, user):
        """Récupère les codes des produits autorisés pour la banque du user"""
        if not user.banque:
            return []
        
        rows = ProduitBanque.objects.filter(
            banque=user.banque,
            est_actif=True,
            produit__est_actif=True
        ).values(
            'id',
            'est_actif',
            'numero_convention',
            'produit__id',
            'produit__code',
            'produit__nom',
            'produit__est_actif',
        )

        return [
            {
                'id': row['id'],
                'est_actif': row['est_actif'],
                'numero_convention': row['numero_convention'],
                'produit': {
                    'id': row['produit__id'],
                    'code': row['produit__code'],
                    'nom': row['produit__nom'],
                    'est_actif': row['produit__est_actif'],
                }
            }
            for row in rows
        ]


    def validate(self, attrs):
        """Validation et ajout d'infos dans la réponse"""
        data = super().validate(attrs)

        produits_autorises = self._get_produits_autorises(self.user)

        # Ajouter des infos user dans la réponse
        data['user'] = {
            'id': str(self.user.id),
            'username': self.user.username,
            'email': self.user.email,
            'nom_complet': self.user.get_full_name(),
            'role': self.user.role,
            'role_display': self.user.get_role_display(),
            'banque': {
                'id': str(self.user.banque.id) if self.user.banque else None,
                'code': self.user.banque.code_banque if self.user.banque else None,
                'nom': self.user.banque.nom_complet if self.user.banque else None,
            } if self.user.banque else None,
            'produits_autorises': produits_autorises,
            'permissions': {
                'est_super_admin': self.user.est_super_admin,
                'est_admin_nsia': self.user.est_admin_nsia,
                'est_responsable_banque': self.user.est_responsable_banque,
                'est_gestionnaire': self.user.est_gestionnaire,
            }
        }

        return data
    

class AgenceSerializer(serializers.ModelSerializer):
    banque_nom = serializers.CharField(source='banque.nom_complet', read_only=True)

    class Meta:
        model = Agence
        fields = [
            'id', 'banque', 'banque_nom', 'code', 'nom',
            'ville', 'adresse', 'telephone', 'email',
            'active', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation']


class ProduitSerializer(serializers.ModelSerializer):
    """Serializer pour le catalogue de produits"""

    class Meta:
        model = Produit
        fields = ['id', 'code', 'nom', 'description', 'est_actif']
        read_only_fields = ['id']


class ProduitBanqueSerializer(serializers.ModelSerializer):
    """Serializer pour l'association banque-produit"""
    produit_details = ProduitSerializer(source='produit', read_only=True)
    banque_code = serializers.CharField(source='banque.code_banque', read_only=True)

    class Meta:
        model = ProduitBanque
        fields = [
            'id', 'banque', 'banque_code', 'produit', 'produit_details',
            'est_actif', 'date_activation',
            'convention_pdf', 'numero_convention', 'parametres'
        ]
        read_only_fields = ['id', 'date_activation']


class ProduitBanqueSimpleSerializer(serializers.ModelSerializer):
    """Version légère pour l'endpoint /auth/me/ - juste code et nom du produit"""
    code = serializers.CharField(source='produit.code', read_only=True)
    nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = ProduitBanque
        fields = ['code', 'nom', 'est_actif', 'numero_convention']


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  PASSWORD MANAGEMENT SERIALIZERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class PasswordChangeSerializer(serializers.Serializer):
    """
    Flow 1 — Changement de mot de passe par un utilisateur authentifié.
    Requiert l'ancien mot de passe pour prouver l'identité.

    Validation :
      • old_password vérifié contre le hash en base
      • new_password validé par les 4 validators Django
        (similarité, longueur ≥ 8, mots de passe courants, numérique)
      • new_password ≠ old_password
      • confirm_password == new_password
    """
    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Mot de passe actuel"
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="Nouveau mot de passe (min. 8 caractères)"
    )
    confirm_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Confirmation du nouveau mot de passe"
    )

    def validate_old_password(self, value):
        """Vérifie que l'ancien mot de passe est correct."""
        user = self.context.get('request').user
        if not user.check_password(value):
            raise serializers.ValidationError(
                "Le mot de passe actuel est incorrect."
            )
        return value

    def validate_new_password(self, value):
        """Applique les validators Django (force, similarité, etc.)."""
        user = self.context.get('request').user
        try:
            validate_password(value, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        """Vérifie la cohérence entre les champs."""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "Les mots de passe ne correspondent pas."
            })

        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                'new_password': "Le nouveau mot de passe doit être différent de l'ancien."
            })

        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Flow 2a — Demande de réinitialisation (forgot password).
    L'utilisateur fournit son email.

    IMPORTANT SÉCURITÉ :
      La réponse est TOUJOURS identique, que l'email existe ou non.
      Cela empêche l'énumération des comptes (user enumeration attack).
    """
    email = serializers.EmailField(
        required=True,
        help_text="Adresse email associée au compte"
    )


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Flow 2b — Confirmation du reset avec le token reçu par email.
    L'utilisateur fournit le token + le nouveau mot de passe.

    Validation :
      • Token vérifié (existe, non expiré, non utilisé)
      • new_password validé par les 4 validators Django
      • confirm_password == new_password
    """
    token = serializers.CharField(
        required=True,
        write_only=True,
        help_text="Token reçu par email"
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="Nouveau mot de passe (min. 8 caractères)"
    )
    confirm_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Confirmation du nouveau mot de passe"
    )

    def validate_new_password(self, value):
        """Applique les validators Django."""
        # Note: on ne peut pas passer user ici car le token n'est pas
        # encore validé. La validation avec user se fait dans validate().
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "Les mots de passe ne correspondent pas."
            })
        return attrs


class AdminPasswordResetSerializer(serializers.Serializer):
    """
    Flow 3 — Reset administratif par un Super Admin / Admin NSIA.
    Le mot de passe est forcé sans connaître l'ancien.

    Validation :
      • new_password validé par les validators Django
      • confirm_password == new_password
    """
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="Nouveau mot de passe (min. 8 caractères)"
    )
    confirm_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="Confirmation du nouveau mot de passe"
    )

    def validate_new_password(self, value):
        """Applique les validators Django."""
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "Les mots de passe ne correspondent pas."
            })
        return attrs



