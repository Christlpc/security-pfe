"""
Configuration Admin Django pour l'app Core
Enregistrement sur bancassurance_admin_site (custom AdminSite)
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.db.models import Count, Q
from django.utils.html import format_html

from apps.core.admin_site import bancassurance_admin_site
from .models import Agence, Banque, PasswordResetToken, Produit, ProduitBanque, Utilisateur


# ──────────────────────────────────────────────
# Ré-enregistrer les modèles Django auth
# ──────────────────────────────────────────────
bancassurance_admin_site.register(Group)


# ──────────────────────────────────────────────
# BANQUE
# ──────────────────────────────────────────────
class ProduitBanqueInline(admin.TabularInline):
    model = ProduitBanque
    extra = 1
    autocomplete_fields = ['produit']
    fields = ('produit', 'est_actif', 'numero_convention', 'convention_pdf')


@admin.register(Banque, site=bancassurance_admin_site)
class BanqueAdmin(admin.ModelAdmin):
    list_display = (
        'nom_complet',
        'code_banque',
        'afficher_logo',
        'afficher_couleurs',
        'statut',
        'nb_agences',
        'nb_produits',
        'nb_utilisateurs',
        'date_partenariat',
    )
    list_filter = ('statut', 'date_partenariat')
    search_fields = ('nom_complet', 'code_banque', 'email_contact')
    ordering = ('nom_complet',)
    inlines = [ProduitBanqueInline]

    fieldsets = (
        ('Informations de base', {
            'fields': ('code_banque', 'nom_complet', 'nom_court', 'statut')
        }),
        ('Charte graphique', {
            'fields': ('logo', 'couleur_primaire', 'couleur_secondaire', 'police_principale')
        }),
        ('Contact', {
            'fields': ('email_contact', 'telephone_contact', 'adresse')
        }),
        ('Partenariat', {
            'fields': ('date_partenariat',)
        }),
        ('Paramètres avancés', {
            'fields': ('parametres_specifiques',),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('date_creation', 'date_modification'),
            'classes': ('collapse',)
        }),
    )

    readonly_fields = ('date_creation', 'date_modification')

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _nb_agences=Count('agences', distinct=True),
            _nb_produits=Count('produits_autorises', filter=Q(produits_autorises__est_actif=True), distinct=True),
            _nb_utilisateurs=Count('utilisateurs', distinct=True),
        )

    def afficher_logo(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{}" width="50" height="50" style="object-fit: contain;" />',
                obj.logo.url
            )
        return "—"
    afficher_logo.short_description = 'Logo'

    def afficher_couleurs(self, obj):
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px; margin-right: 5px;">{}</span>'
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
            obj.couleur_primaire, obj.couleur_primaire,
            obj.couleur_secondaire, obj.couleur_secondaire
        )
    afficher_couleurs.short_description = 'Couleurs'

    def nb_agences(self, obj):
        count = getattr(obj, '_nb_agences', obj.agences.count())
        return format_html(
            '<span style="background:#2980B9;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;">{}</span>',
            count
        )
    nb_agences.short_description = 'Agences'
    nb_agences.admin_order_field = '_nb_agences'

    def nb_produits(self, obj):
        count = getattr(obj, '_nb_produits', obj.produits_autorises.filter(est_actif=True).count())
        return format_html(
            '<span style="background:#C8962E;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;">{}</span>',
            count
        )
    nb_produits.short_description = 'Produits'
    nb_produits.admin_order_field = '_nb_produits'

    def nb_utilisateurs(self, obj):
        count = getattr(obj, '_nb_utilisateurs', obj.utilisateurs.count())
        return format_html(
            '<span style="background:#1B3A5C;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;">{}</span>',
            count
        )
    nb_utilisateurs.short_description = 'Utilisateurs'
    nb_utilisateurs.admin_order_field = '_nb_utilisateurs'


# ──────────────────────────────────────────────
# AGENCE
# ──────────────────────────────────────────────
@admin.register(Agence, site=bancassurance_admin_site)
class AgenceAdmin(admin.ModelAdmin):
    list_display = (
        'nom',
        'code',
        'banque',
        'responsable_agence',
        'nb_gestionnaires',
        'nb_responsables',
        'ville',
        'active',
    )
    list_filter = ('banque', 'active', 'ville')
    search_fields = ('nom', 'code', 'banque__nom_complet', 'ville')
    ordering = ('banque__nom_complet', 'nom')
    list_select_related = ('banque', 'responsable_agence')
    autocomplete_fields = ['banque', 'responsable_agence']

    fieldsets = (
        ('Identification', {
            'fields': ('banque', 'code', 'nom')
        }),
        ('Responsable', {
            'fields': ('responsable_agence',)
        }),
        ('Localisation & Contact', {
            'fields': ('ville', 'adresse', 'telephone', 'email')
        }),
        ('Statut', {
            'fields': ('active',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _nb_gestionnaires=Count(
                'utilisateurs',
                filter=Q(utilisateurs__role='GESTIONNAIRE', utilisateurs__est_actif=True),
                distinct=True,
            ),
            _nb_responsables=Count(
                'utilisateurs',
                filter=Q(
                    utilisateurs__role__in=['RESPONSABLE_AGENCE'],
                    utilisateurs__est_actif=True,
                ),
                distinct=True,
            ),
        )

    def nb_gestionnaires(self, obj):
        count = getattr(obj, '_nb_gestionnaires', 0)
        return format_html(
            '<span style="background:#1A7A4A;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;">{}</span>',
            count
        )
    nb_gestionnaires.short_description = 'Gestionnaires'
    nb_gestionnaires.admin_order_field = '_nb_gestionnaires'

    def nb_responsables(self, obj):
        count = getattr(obj, '_nb_responsables', 0)
        # +1 si responsable_agence FK est défini (responsable principal)
        if obj.responsable_agence_id:
            count = max(count, 1)
        return format_html(
            '<span style="background:#C8962E;color:#fff;padding:2px 10px;border-radius:12px;font-weight:600;">{}</span>',
            count
        )
    nb_responsables.short_description = 'Responsables'
    nb_responsables.admin_order_field = '_nb_responsables'


# ──────────────────────────────────────────────
# UTILISATEUR
# ──────────────────────────────────────────────
@admin.register(Utilisateur, site=bancassurance_admin_site)
class UtilisateurAdmin(BaseUserAdmin):
    list_select_related = ('banque', 'agence')

    list_display = (
        'username',
        'email',
        'get_full_name',
        'role',
        'banque',
        'agence',
        'est_actif',
        'date_creation'
    )

    list_filter = (
        'role',
        'est_actif',
        'is_staff',
        'banque',
        'date_creation'
    )

    search_fields = (
        'username',
        'email',
        'first_name',
        'last_name',
        'matricule'
    )

    ordering = ('-date_creation',)

    fieldsets = (
        ('Informations de connexion', {
            'fields': ('username', 'password')
        }),
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'telephone', 'matricule')
        }),
        ('Rôle et rattachement', {
            'fields': ('role', 'banque', 'agence', 'est_actif', 'is_staff', 'is_superuser'),
            'description': (
                'Responsable/Gestionnaire doivent avoir une banque. '
                'Super Admin/Admin NSIA ne doivent PAS avoir de banque.'
            )
        }),
        ('Groupes et permissions Django', {
            'fields': ('groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Dates importantes', {
            'fields': ('last_login', 'date_joined', 'date_creation', 'date_modification'),
            'classes': ('collapse',)
        }),
    )

    add_fieldsets = (
        ('Informations de connexion', {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2'),
        }),
        ('Informations personnelles', {
            'fields': ('first_name', 'last_name', 'email', 'telephone', 'matricule')
        }),
        ('Rôle et rattachement', {
            'fields': ('role', 'banque', 'agence', 'est_actif'),
            'description': (
                'Responsable/Gestionnaire doivent avoir une banque. '
                'Super Admin/Admin NSIA ne doivent PAS avoir de banque.'
            )
        }),
    )

    readonly_fields = ('date_creation', 'date_modification', 'last_login', 'date_joined')

    def get_full_name(self, obj):
        return obj.get_full_name()
    get_full_name.short_description = 'Nom complet'


# ──────────────────────────────────────────────
# PRODUIT
# ──────────────────────────────────────────────
@admin.register(Produit, site=bancassurance_admin_site)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ('code', 'nom', 'est_actif', 'date_creation')
    list_filter = ('est_actif',)
    search_fields = ('code', 'nom')
    ordering = ('nom',)


# ──────────────────────────────────────────────
# PRODUIT BANQUE
# ──────────────────────────────────────────────
@admin.register(ProduitBanque, site=bancassurance_admin_site)
class ProduitBanqueAdmin(admin.ModelAdmin):
    list_display = ('banque', 'produit', 'est_actif', 'numero_convention', 'date_activation')
    list_filter = ('banque', 'produit', 'est_actif')
    search_fields = ('banque__code_banque', 'banque__nom_complet', 'produit__code', 'produit__nom')
    autocomplete_fields = ['banque', 'produit']
    ordering = ('banque__nom_complet', 'produit__nom')


# ──────────────────────────────────────────────
# PASSWORD RESET TOKEN
# ──────────────────────────────────────────────
@admin.register(PasswordResetToken, site=bancassurance_admin_site)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = (
        'utilisateur', 'token_hash_short', 'date_creation',
        'date_expiration', 'est_utilise', 'ip_demande', 'ip_utilisation'
    )
    list_filter = ('est_utilise', 'date_creation')
    search_fields = ('utilisateur__username', 'utilisateur__email', 'ip_demande')
    readonly_fields = (
        'id', 'utilisateur', 'token_hash', 'date_creation',
        'date_expiration', 'est_utilise', 'ip_demande',
        'ip_utilisation', 'date_utilisation'
    )
    ordering = ('-date_creation',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def token_hash_short(self, obj):
        return f"{obj.token_hash[:12]}..."
    token_hash_short.short_description = "Token hash (tronqué)"
