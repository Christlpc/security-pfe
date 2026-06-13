"""
Configuration Admin Django pour le simulateur NSIA
Phase 3 : Interface d'administration
"""
from django.contrib import admin
from django.utils.html import format_html
from apps.core.admin_site import bancassurance_admin_site
from .models import Simulation, Souscription


@admin.register(Simulation, site=bancassurance_admin_site)
class SimulationAdmin(admin.ModelAdmin):
    """Admin pour les simulations"""

    list_display = [
        'reference',
        'banque_badge',
        'produit_badge',
        'statut_badge',
        'client_info',
        'montant_prime_display',
        'date_creation',
        'gestionnaire_display',
    ]

    list_filter = [
        'produit',
        'statut',
        'banque',
        'date_creation',
        'date_validation',
    ]

    search_fields = [
        'reference',
        'nom_client',
        'prenom_client',
        'email_client',
        'telephone_client',
    ]

    readonly_fields = [
        'id',
        'reference',
        'date_creation',
        'date_modification',
        'montant_prime_display',
    ]

    fieldsets = (
        ('Identification', {
            'fields': ('id', 'reference', 'banque', 'gestionnaire')
        }),
        ('Produit', {
            'fields': ('produit', 'statut', 'date_validation')
        }),
        ('Données de simulation', {
            'fields': ('donnees_entree', 'resultats_calcul'),
            'classes': ('collapse',)
        }),
        ('Informations client', {
            'fields': ('nom_client', 'prenom_client', 'email_client', 'telephone_client')
        }),
        ('Métadonnées', {
            'fields': ('date_creation', 'date_modification', 'ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )

    date_hierarchy = 'date_creation'
    ordering = ['-date_creation']
    list_per_page = 20
    show_full_result_count = False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'banque',
            'gestionnaire'
        ).defer(
            'donnees_entree',
            'resultats_calcul',
            'user_agent'
        )

    def banque_badge(self, obj):
        if not obj.banque:
            return "-"
        return format_html(
            '<span style="background-color: #007bff; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            obj.banque.code_banque
        )
    banque_badge.short_description = 'Banque'

    def produit_badge(self, obj):
        colors = {
            'emprunteur': '#28a745',
            'retraite': '#17a2b8',
            'etudes': '#ffc107',
            'elikia': '#fd7e14',
            'mobateli': '#6610f2',
            'epargne_plus': '#6f42c1',
        }
        color = colors.get(obj.produit, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_produit_display()
        )
    produit_badge.short_description = 'Produit'

    def statut_badge(self, obj):
        colors = {
            'brouillon': '#6c757d',
            'calculee': '#007bff',
            'validee': '#28a745',
            'convertie': '#17a2b8',
            'abandonnee': '#dc3545',
        }
        color = colors.get(obj.statut, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_statut_display()
        )
    statut_badge.short_description = 'Statut'

    def client_info(self, obj):
        if obj.nom_client or obj.prenom_client:
            return f"{obj.nom_client} {obj.prenom_client}".strip()
        return "-"
    client_info.short_description = 'Client'

    def montant_prime_display(self, obj):
        montant = obj.get_montant_prime()
        if montant is None:
            return "-"
        try:
            montant = float(montant)
        except (TypeError, ValueError):
            return "-"
        montant_formate = "{:,.0f}".format(montant).replace(",", " ")
        return format_html('<strong>{} FCFA</strong>', montant_formate)

    def gestionnaire_display(self, obj):
        # Vérifie l'ID brut d'abord — aucune requête DB
        if not obj.gestionnaire_id:
            return "-"
        try:
            g = obj.gestionnaire  # déjà en cache via select_related
            return f"{g.first_name} {g.last_name}".strip() or g.username
        except Exception:
            return f"(utilisateur supprimé #{obj.gestionnaire_id})"
    gestionnaire_display.short_description = 'Gestionnaire'

    actions = ['marquer_comme_validee', 'marquer_comme_abandonnee']

    def marquer_comme_validee(self, request, queryset):
        count = 0
        for simulation in queryset:
            if simulation.statut != 'validee':
                simulation.marquer_comme_validee()
                count += 1
        self.message_user(request, f"{count} simulation(s) validée(s)")
    marquer_comme_validee.short_description = "Valider les simulations sélectionnées"

    def marquer_comme_abandonnee(self, request, queryset):
        count = queryset.update(statut='abandonnee')
        self.message_user(request, f"{count} simulation(s) abandonnée(s)")
    marquer_comme_abandonnee.short_description = "Abandonner les simulations sélectionnées"


@admin.register(Souscription, site=bancassurance_admin_site)
class SouscriptionAdmin(admin.ModelAdmin):
    """Admin pour les souscriptions"""

    list_display = [
        'reference',
        'banque_badge',
        'statut_badge',
        'souscripteur_info',
        'numero_police',
        'montant_prime_display',
        'date_souscription',
        'gestionnaire_display',
    ]

    list_filter = [
        'statut',
        'banque',
        'date_souscription',
        'date_validation',
    ]

    search_fields = [
        'reference',
        'numero_police',
        'nom',
        'prenom',
        'email',
        'telephone',
        'numero_compte',
    ]

    readonly_fields = [
        'id',
        'reference',
        'numero_police',
        'date_souscription',
        'date_modification',
        'date_validation',
        'date_rejet',
        'age_souscripteur_display',
    ]

    fieldsets = (
        ('Identification', {
            'fields': ('id', 'reference', 'simulation', 'banque', 'gestionnaire')
        }),
        ('Statut', {
            'fields': ('statut', 'numero_police', 'date_validation', 'date_rejet', 'motif_rejet')
        }),
        ('Souscripteur', {
            'fields': (
                'nom', 'prenom', 'date_naissance', 'age_souscripteur_display',
                'lieu_naissance', 'email', 'telephone', 'adresse'
            )
        }),
        ('Informations professionnelles', {
            'fields': ('profession', 'employeur', 'numero_compte'),
            'classes': ('collapse',)
        }),
        ('Contrat', {
            'fields': (
                'date_effet_contrat', 'date_echeance_contrat',
                'montant_prime', 'donnees_produit'
            )
        }),
        ('Documents', {
            'fields': ('documents',),
            'classes': ('collapse',)
        }),
        ('Notes', {
            'fields': ('notes', 'commentaires'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_souscription', 'date_modification'),
            'classes': ('collapse',)
        }),
    )

    date_hierarchy = 'date_souscription'
    ordering = ['-date_souscription']
    list_per_page = 20
    show_full_result_count = False

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'banque',
            'gestionnaire',
            'simulation'
        )

    def banque_badge(self, obj):
        if not obj.banque:
            return "-"
        return format_html(
            '<span style="background-color: #007bff; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            obj.banque.code_banque
        )
    banque_badge.short_description = 'Banque'

    def statut_badge(self, obj):
        colors = {
            'en_cours': '#ffc107',
            'validee': '#28a745',
            'rejetee': '#dc3545',
            'suspendue': '#fd7e14',
            'active': '#17a2b8',
            'resiliee': '#6c757d',
        }
        color = colors.get(obj.statut, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color,
            obj.get_statut_display()
        )
    statut_badge.short_description = 'Statut'

    def souscripteur_info(self, obj):
        return f"{obj.nom} {obj.prenom}"
    souscripteur_info.short_description = 'Souscripteur'

    def montant_prime_display(self, obj):
        montant = obj.montant_prime
        if montant is None:
            return "-"
        try:
            montant = float(montant)
        except (TypeError, ValueError):
            return "-"
        montant_formate = "{:,.0f}".format(montant).replace(",", " ")
        return format_html('<strong>{} FCFA</strong>', montant_formate)

    def gestionnaire_display(self, obj):
        # Vérifie l'ID brut d'abord — aucune requête DB
        if not obj.gestionnaire_id:
            return "-"
        try:
            g = obj.gestionnaire  # déjà en cache via select_related
            return f"{g.first_name} {g.last_name}".strip() or g.username
        except Exception:
            return f"(utilisateur supprimé #{obj.gestionnaire_id})"
    gestionnaire_display.short_description = 'Gestionnaire'

    def age_souscripteur_display(self, obj):
        age = obj.get_age_souscripteur()
        if age:
            return f"{age} ans"
        return "-"
    age_souscripteur_display.short_description = 'Âge'

    actions = ['valider_souscriptions', 'rejeter_souscriptions']

    def valider_souscriptions(self, request, queryset):
        count = 0
        for souscription in queryset:
            if souscription.statut != 'validee':
                souscription.valider()
                count += 1
        self.message_user(request, f"{count} souscription(s) validée(s)")
    valider_souscriptions.short_description = "Valider les souscriptions sélectionnées"

    def rejeter_souscriptions(self, request, queryset):
        self.message_user(
            request,
            "Veuillez rejeter les souscriptions individuellement pour saisir le motif",
            level='warning'
        )
    rejeter_souscriptions.short_description = "Rejeter les souscriptions sélectionnées"