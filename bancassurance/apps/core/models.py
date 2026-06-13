"""
Modèles Core - Authentication & Multi-Tenant
"""
import hashlib
import secrets

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.core.validators import RegexValidator, FileExtensionValidator
from django.utils import timezone
import uuid


def validate_pdf_file(value):
    """SECURITE : valide que le fichier uploadé est un PDF et ne dépasse pas 10 Mo."""
    if value.size > 10 * 1024 * 1024:
        raise ValidationError("Le fichier ne doit pas dépasser 10 Mo.")
    if hasattr(value, 'content_type') and value.content_type != 'application/pdf':
        raise ValidationError("Seuls les fichiers PDF sont acceptés.")


class Produit(models.Model):
    """
    Catalogue des produits d'assurance NSIA.
    Chaque produit a un code unique utilisé dans toute l'application.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Code produit",
        help_text="Code technique unique (ex: emprunteur, retraite, mobateli)"
    )
    nom = models.CharField(max_length=200, verbose_name="Nom du produit")
    description = models.TextField(blank=True, verbose_name="Description")
    est_actif = models.BooleanField(default=True, verbose_name="Actif")
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Produit"
        verbose_name_plural = "Produits"
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.code})"


class Banque(models.Model):
    """
    Modèle représentant une banque partenaire NSIA
    """
    
    # Choix de statut
    class Statut(models.TextChoices):
        ACTIF = 'ACTIF', 'Actif'
        INACTIF = 'INACTIF', 'Inactif'
        SUSPENDU = 'SUSPENDU', 'Suspendu'
    
    # ID unique
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Informations de base
    code_banque = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Code banque",
        help_text="Code unique de la banque (ex: ECOBANK, BGFI, CDCO)"
    )
    nom_complet = models.CharField(max_length=200, verbose_name="Nom complet")
    nom_court = models.CharField(max_length=50, blank=True, verbose_name="Nom court")
    
    # Logo et charte graphique
    logo = models.ImageField(
        upload_to='banques/logos/',
        blank=True,
        null=True,
        verbose_name="Logo"
    )
    
    # Couleurs de la charte graphique (format hexadécimal)
    couleur_hex_validator = RegexValidator(
        regex=r'^#[0-9A-Fa-f]{6}$',
        message="Format hexadécimal requis (ex: #FF5733)"
    )
    couleur_primaire = models.CharField(
        max_length=7,
        validators=[couleur_hex_validator],
        default='#003366',
        verbose_name="Couleur primaire",
        help_text="Format hexadécimal (ex: #003366)"
    )
    couleur_secondaire = models.CharField(
        max_length=7,
        validators=[couleur_hex_validator],
        default='#FF9900',
        verbose_name="Couleur secondaire",
        help_text="Format hexadécimal (ex: #FF9900)"
    )
    
    # Police principale (nom de la font)
    police_principale = models.CharField(
        max_length=100,
        default='Arial',
        verbose_name="Police principale",
        help_text="Nom de la police à utiliser dans les documents"
    )
    
    # Informations de contact
    email_contact = models.EmailField(verbose_name="Email de contact")
    telephone_contact = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    adresse = models.TextField(blank=True, verbose_name="Adresse complète")
    
    # Statut et dates
    statut = models.CharField(
        max_length=20,
        choices=Statut.choices,
        default=Statut.ACTIF,
        verbose_name="Statut"
    )
    date_partenariat = models.DateField(verbose_name="Date de partenariat", null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    date_modification = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    
    # Paramètres spécifiques (JSON flexible)
    parametres_specifiques = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Paramètres spécifiques",
        help_text="Paramètres personnalisés pour cette banque (commission, frais, etc.)"
    )
    
    class Meta:
        verbose_name = "Banque"
        verbose_name_plural = "Banques"
        ordering = ['nom_complet']
    
    def __str__(self):
        return f"{self.nom_complet} ({self.code_banque})"
    
    @property
    def est_active(self):
        """Vérifie si la banque est active"""
        return self.statut == self.Statut.ACTIF


class ProduitBanque(models.Model):
    """
    Table pivot : lie une banque à ses produits autorisés.
    C'est ICI qu'on contrôle quel produit est disponible pour quelle banque.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    banque = models.ForeignKey(
        'Banque',
        on_delete=models.CASCADE,
        related_name='produits_autorises',
        verbose_name="Banque"
    )
    produit = models.ForeignKey(
        'Produit',
        on_delete=models.CASCADE,
        related_name='banques_autorisees',
        verbose_name="Produit"
    )
    est_actif = models.BooleanField(default=True, verbose_name="Actif")
    date_activation = models.DateTimeField(auto_now_add=True, verbose_name="Date d'activation")
    convention_pdf = models.FileField(
        upload_to='conventions/',
        blank=True,
        null=True,
        verbose_name="Convention PDF",
        help_text="Fichier PDF de la convention pour ce produit/banque",
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf']),
            validate_pdf_file,
        ],
    )
    numero_convention = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numéro de convention",
        help_text="Ex: 1000359"
    )
    parametres = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Paramètres spécifiques",
        help_text="Configuration spécifique pour ce couple banque/produit"
    )

    class Meta:
        verbose_name = "Produit autorisé par banque"
        verbose_name_plural = "Produits autorisés par banque"
        unique_together = ('banque', 'produit')
        ordering = ['banque__nom_complet', 'produit__nom']

    def __str__(self):
        return f"{self.banque.code_banque} → {self.produit.nom}"


class TenantQuerySet(models.QuerySet):
    """
    QuerySet personnalisé appliquant automatiquement l'isolation multi-tenant.
    """
    def filter_by_tenant(self):
        from apps.core.middleware import get_current_banque, get_current_user
        banque = get_current_banque()
        user = get_current_user()

        # Les administrateurs globaux NSIA ont accès à tout
        if user and (user.est_super_admin or user.est_admin_nsia):
            return self

        # Filtrage automatique par banque
        if banque:
            if hasattr(self.model, 'banque'):
                return self.filter(banque=banque)
            elif hasattr(self.model, 'simulation'):
                return self.filter(simulation__banque=banque)
            elif self.model.__name__ == 'Beneficiaire':
                return self.filter(simulation__banque=banque)
            elif self.model.__name__ == 'DetailQ2':
                return self.filter(questionnaire__simulation__banque=banque)

        # Hors administrateurs, s'il n'y a pas de banque dans le contexte, on bloque l'accès
        if user and not user.est_super_admin and not user.est_admin_nsia:
            return self.none()

        return self


class TenantManager(models.Manager):
    """
    Manager de modèle Django qui applique automatiquement le filtrage multi-tenant.
    """
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db).filter_by_tenant()


class Agence(models.Model):
    """
    Agence bancaire
    """
    objects = TenantManager()  # Application de l'isolation multi-tenant ORM
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    banque = models.ForeignKey(
        'Banque', 
        on_delete=models.CASCADE, 
        related_name='agences'
    )
    
    # Informations de l'agence
    code = models.CharField(max_length=50, unique=True)  # Ex: "BZV-BACONGO"
    nom = models.CharField(max_length=200)  # Ex: "Agence BACONGO"
    ville = models.CharField(max_length=100, null=True, blank=True)
    adresse = models.TextField(null=True, blank=True)
    telephone = models.CharField(max_length=50, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    
    # Responsable de l'agence (optionnel)
    responsable_agence = models.ForeignKey(
        'Utilisateur',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agences_gerees'
    )
    
    # Métadonnées
    active = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'agences'
        verbose_name = 'Agence'
        verbose_name_plural = 'Agences'
        ordering = ['banque', 'nom']
        unique_together = [['banque', 'code']]
    
    def __str__(self):
        return f"{self.banque.code_banque} - {self.nom}"


class Utilisateur(AbstractUser):
    """
    Modèle utilisateur custom pour NSIA
    Extend AbstractUser de Django pour ajouter des champs spécifiques
    """
    
    # Choix pour les rôles
    class Role(models.TextChoices):
        SUPER_ADMIN = 'SUPER_ADMIN', 'Super Admin NSIA'
        ADMIN_NSIA = 'ADMIN_NSIA', 'Admin NSIA'
        RESPONSABLE_BANQUE = 'RESPONSABLE_BANQUE', 'Responsable Banque',
        RESPONSABLE_AGENCE = 'RESPONSABLE_AGENCE', 'Responsable Agence'
        GESTIONNAIRE = 'GESTIONNAIRE', 'Gestionnaire'
        SUPPORT = 'SUPPORT', 'Support Technique'
    
    # ID unique (UUID pour sécurité)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Rôle de l'utilisateur
    role = models.CharField(
        max_length=50,
        choices=Role.choices,
        default=Role.GESTIONNAIRE,
        verbose_name="Rôle"
    )
    
    # Informations complémentaires
    matricule = models.CharField(max_length=50, blank=True, null=True, verbose_name="Matricule")
    telephone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Téléphone")
    
    # Statut actif/inactif
    est_actif = models.BooleanField(default=True, verbose_name="Actif")
    
    # Dates
    date_creation = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    date_modification = models.DateTimeField(auto_now=True, verbose_name="Date de modification")
    
    # Relation avec Banque (nullable pour Super Admin et Admin NSIA)
    banque = models.ForeignKey(
        Banque,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='utilisateurs',
        verbose_name="Banque",
        help_text="Banque de rattachement (obligatoire pour Responsable et Gestionnaire)"
    )

     # NOUVEAU CHAMP
    agence = models.ForeignKey(
        'Agence',
        on_delete=models.SET_NULL,
        related_name='utilisateurs',
        null=True,
        blank=True,
        help_text="Agence à laquelle l'utilisateur est rattaché (pour Responsable, Gestionnaires uniquement)"
    )
    
    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ['-date_creation']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"
    
    def get_full_name(self):
        """Retourne le nom complet de l'utilisateur"""
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username
    
    @property
    def est_super_admin(self):
        """Vérifie si l'utilisateur est Super Admin"""
        return self.role == self.Role.SUPER_ADMIN
    
    @property
    def est_admin_nsia(self):
        """Vérifie si l'utilisateur est Admin NSIA"""
        return self.role == self.Role.ADMIN_NSIA
    
    @property
    def est_responsable_banque(self):
        """Vérifie si l'utilisateur est Responsable Banque"""
        return self.role == self.Role.RESPONSABLE_BANQUE
    
    @property
    def est_gestionnaire(self):
        """Vérifie si l'utilisateur est Gestionnaire"""
        return self.role == self.Role.GESTIONNAIRE
    
    @property
    def est_responsable_agence(self):
        """Vérifie si l'utilisateur est Responsable Agence"""
        return self.role == self.Role.RESPONSABLE_AGENCE
    
    def clean(self):
        """Validation custom du modèle"""
        from django.core.exceptions import ValidationError
        
        super().clean()

        
        # Vérifier que les rôles nécessitant une banque en ont une
        roles_avec_banque = [
            self.Role.RESPONSABLE_BANQUE,
            self.Role.RESPONSABLE_AGENCE,
            self.Role.GESTIONNAIRE
        ]
        
        if self.role in roles_avec_banque and not self.banque:
            raise ValidationError({
                'banque': f"Le rôle '{self.get_role_display()}' nécessite une banque de rattachement"
            })
        
        # Vérifier que Super Admin et Admin NSIA n'ont pas de banque
        roles_sans_banque = [
            self.Role.SUPER_ADMIN,
            self.Role.ADMIN_NSIA
        ]
        
        if self.role in roles_sans_banque and self.banque:
            raise ValidationError({
                'banque': f"Le rôle '{self.get_role_display()}' ne doit pas avoir de banque de rattachement"
            })
        
        # Un gestionnaire DOIT avoir une agence
        if self.role == self.Role.GESTIONNAIRE and not self.agence:
            raise ValidationError({
                'agence': 'Un gestionnaire doit être rattaché à une agence'
            })
         
        # L'agence doit appartenir à la banque de l'utilisateur
        if self.agence and self.banque and self.agence.banque != self.banque:
            raise ValidationError({
                'agence': "L'agence doit appartenir à la banque de l'utilisateur"
            })
    
    def save(self, *args, **kwargs):
        """Override save pour valider avant la sauvegarde"""
        self.full_clean()
        super().save(*args, **kwargs)


class PasswordResetToken(models.Model):
    """
    Token sécurisé pour la réinitialisation de mot de passe.

    Principes de sécurité :
    ─────────────────────────
    1. Le token brut (plaintext) n'est JAMAIS stocké en base.
       On stocke uniquement son hash SHA-256 → même en cas de fuite DB,
       les tokens sont inexploitables.
    2. Expiration courte (15 minutes) pour limiter la fenêtre d'attaque.
    3. Usage unique : `est_utilise` passe à True dès la consommation.
    4. À chaque nouvelle demande, tous les anciens tokens du user sont
       invalidés (un seul token actif à la fois).
    5. On enregistre l'IP de la demande pour l'audit trail.
    """

    TOKEN_LIFETIME_MINUTES = 15

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    utilisateur = models.ForeignKey(
        'Utilisateur',
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
        verbose_name="Utilisateur"
    )
    # Hash SHA-256 du token — le plaintext n'est jamais persisté
    token_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name="Hash du token"
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_expiration = models.DateTimeField(verbose_name="Expire à")
    est_utilise = models.BooleanField(default=False, verbose_name="Déjà utilisé")
    # Audit
    ip_demande = models.GenericIPAddressField(
        null=True, blank=True,
        verbose_name="IP de la demande"
    )
    ip_utilisation = models.GenericIPAddressField(
        null=True, blank=True,
        verbose_name="IP d'utilisation"
    )
    date_utilisation = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Date d'utilisation"
    )

    class Meta:
        verbose_name = "Token de réinitialisation"
        verbose_name_plural = "Tokens de réinitialisation"
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['token_hash'], name='idx_token_hash'),
            models.Index(fields=['utilisateur', 'est_utilise'], name='idx_user_token_active'),
        ]

    def __str__(self):
        return f"Reset token pour {self.utilisateur.username} (expire {self.date_expiration})"

    # ── Méthodes de classe ──────────────────────────────────────────

    @staticmethod
    def hash_token(plaintext: str) -> str:
        """Produit le SHA-256 hex d'un token brut."""
        return hashlib.sha256(plaintext.encode('utf-8')).hexdigest()

    @classmethod
    def generate_for_user(cls, utilisateur, ip_address: str = None):
        """
        Crée un nouveau token de reset pour un utilisateur.
        - Invalide tous les anciens tokens actifs
        - Génère un token cryptographiquement sûr (48 bytes → 64 chars URL-safe)
        - Stocke uniquement le hash
        - Retourne le plaintext (à envoyer par email UNE SEULE FOIS)
        """
        # 1. Invalider tous les tokens précédents (un seul actif à la fois)
        cls.objects.filter(
            utilisateur=utilisateur,
            est_utilise=False
        ).update(est_utilise=True)

        # 2. Générer un token cryptographiquement sûr
        plaintext = secrets.token_urlsafe(48)  # 64 caractères URL-safe

        # 3. Créer l'enregistrement avec le hash uniquement
        token_obj = cls.objects.create(
            utilisateur=utilisateur,
            token_hash=cls.hash_token(plaintext),
            date_expiration=timezone.now() + timezone.timedelta(
                minutes=cls.TOKEN_LIFETIME_MINUTES
            ),
            ip_demande=ip_address,
        )

        return plaintext, token_obj

    @classmethod
    def verify_token(cls, plaintext: str):
        """
        Vérifie un token brut : existe, non expiré, non utilisé.
        Retourne (token_obj, utilisateur) ou (None, None).

        SECURITE : utilise select_for_update() dans une transaction atomique
        pour empêcher les race conditions (TOCTOU) — deux requêtes
        simultanées avec le même token ne peuvent pas toutes les deux réussir.
        """
        from django.db import transaction

        token_hash = cls.hash_token(plaintext)

        try:
            with transaction.atomic():
                token_obj = cls.objects.select_for_update().select_related(
                    'utilisateur'
                ).get(
                    token_hash=token_hash,
                    est_utilise=False,
                )

                # Vérifier l'expiration
                if timezone.now() > token_obj.date_expiration:
                    token_obj.est_utilise = True
                    token_obj.save(update_fields=['est_utilise'])
                    return None, None

                return token_obj, token_obj.utilisateur

        except cls.DoesNotExist:
            return None, None

    def consume(self, ip_address: str = None):
        """
        Consomme le token (usage unique).
        Appelé après un reset réussi.
        """
        self.est_utilise = True
        self.ip_utilisation = ip_address
        self.date_utilisation = timezone.now()
        self.save(update_fields=['est_utilise', 'ip_utilisation', 'date_utilisation'])

    @classmethod
    def cleanup_expired(cls):
        """
        Supprime les tokens expirés et utilisés (maintenance).
        À appeler via un cron / management command.
        """
        cutoff = timezone.now() - timezone.timedelta(hours=24)
        deleted, _ = cls.objects.filter(
            models.Q(est_utilise=True) | models.Q(date_expiration__lt=timezone.now()),
            date_creation__lt=cutoff
        ).delete()
        return deleted


class LoginAttempt(models.Model):
    """
    SECURITE : Suivi des tentatives de connexion échouées.
    Permet le verrouillage temporaire après N échecs consécutifs.
    """
    # Nombre max de tentatives avant verrouillage
    MAX_ATTEMPTS = 5
    # Durée du verrouillage en minutes
    LOCKOUT_MINUTES = 15

    ip_address = models.GenericIPAddressField()
    username = models.CharField(max_length=150)
    timestamp = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['username', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
        ]

    @classmethod
    def is_locked_out(cls, username: str = None, ip_address: str = None):
        """
        Vérifie si un username ou une IP est verrouillé.
        Verrouillage si >= MAX_ATTEMPTS échecs dans les LOCKOUT_MINUTES dernières minutes.
        """
        cutoff = timezone.now() - timezone.timedelta(minutes=cls.LOCKOUT_MINUTES)

        # Vérifier par username
        if username:
            recent_failures = cls.objects.filter(
                username=username,
                success=False,
                timestamp__gte=cutoff,
            ).count()
            if recent_failures >= cls.MAX_ATTEMPTS:
                return True

        # Vérifier par IP
        if ip_address:
            ip_failures = cls.objects.filter(
                ip_address=ip_address,
                success=False,
                timestamp__gte=cutoff,
            ).count()
            if ip_failures >= cls.MAX_ATTEMPTS * 2:  # Seuil plus haut pour l'IP (partagée)
                return True

        return False

    @classmethod
    def record_attempt(cls, username: str, ip_address: str, success: bool):
        """Enregistre une tentative de connexion."""
        cls.objects.create(
            username=username,
            ip_address=ip_address,
            success=success,
        )
        # Si succès, réinitialiser les échecs pour cet utilisateur
        if success:
            cls.objects.filter(
                username=username,
                success=False,
            ).delete()

    @classmethod
    def cleanup_old(cls):
        """Supprime les entrées de plus de 24h."""
        cutoff = timezone.now() - timezone.timedelta(hours=24)
        return cls.objects.filter(timestamp__lt=cutoff).delete()

