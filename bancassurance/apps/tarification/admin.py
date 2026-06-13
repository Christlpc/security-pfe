"""
Configuration Admin pour la tarification
"""
from django.contrib import admin
from apps.core.admin_site import bancassurance_admin_site
from .models import (
    TableTauxEmprunteur,
    TableCIMA_H,
    TablePrimesEtudes,
    TableTauxMensuels,
    ParametresProduits
)


@admin.register(TableTauxEmprunteur, site=bancassurance_admin_site)
class TableTauxEmprunteurAdmin(admin.ModelAdmin):
    """Admin pour les taux emprunteur"""
    
    list_display = ['tranche_age', 'duree_annees', 'taux_pourcentage', 'produit', 'banque', 'actif', 'date_debut_validite']
    list_filter = ['produit', 'actif', 'banque', 'duree_annees']
    search_fields = ['tranche_age', 'produit']
    ordering = ['age_min', 'duree_annees']
    
    fieldsets = (
        ('Tranche d\'âge', {
            'fields': ('tranche_age', 'age_min', 'age_max')
        }),
        ('Prêt', {
            'fields': ('duree_annees', 'taux_pourcentage', 'produit')
        }),
        ('Scope', {
            'fields': ('banque', 'actif')
        }),
        ('Validité', {
            'fields': ('date_debut_validite', 'date_fin_validite')
        }),
    )


@admin.register(TableCIMA_H, site=bancassurance_admin_site)
class TableCIMA_HAdmin(admin.ModelAdmin):
    """Admin pour les tables CIMA H"""
    
    list_display = ['x', 'Nx', 'Mx', 'Dx', 'lx', 'qx']
    search_fields = ['x']
    ordering = ['x']
    
    def has_add_permission(self, request):
        """Limiter l'ajout manuel (devrait être importé)"""
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        """Limiter la suppression (données sensibles)"""
        return request.user.is_superuser


@admin.register(TablePrimesEtudes, site=bancassurance_admin_site)
class TablePrimesEtudesAdmin(admin.ModelAdmin):
    """Admin pour les primes études"""
    
    list_display = ['age', 'duree_paiement', 'duree_rente', 'type_prime', 'produit', 'montant', 'actif']
    list_filter = ['type_prime', 'produit', 'actif', 'duree_paiement']
    search_fields = ['age', 'produit']
    ordering = ['age', 'duree_paiement', 'type_prime']


@admin.register(TableTauxMensuels, site=bancassurance_admin_site)
class TableTauxMensuelsAdmin(admin.ModelAdmin):
    """Admin pour les taux mensuels"""
    
    list_display = ['age', 'duree_paiement', 'duree_rente', 'produit', 'taux', 'actif']
    list_filter = ['produit', 'actif']
    search_fields = ['age', 'produit']
    ordering = ['age', 'duree_paiement']


@admin.register(ParametresProduits, site=bancassurance_admin_site)
class ParametresProduitsAdmin(admin.ModelAdmin):
    """Admin pour les paramètres produits"""
    
    list_display = ['produit_type', 'param_nom', 'param_valeur', 'type_valeur', 'banque', 'actif']
    list_filter = ['produit_type', 'type_valeur', 'actif', 'banque']
    search_fields = ['param_nom', 'produit_type', 'description']
    ordering = ['produit_type', 'param_nom']
    
    fieldsets = (
        ('Produit', {
            'fields': ('produit_type', 'banque')
        }),
        ('Paramètre', {
            'fields': ('param_nom', 'param_valeur', 'type_valeur', 'description')
        }),
        ('Statut', {
            'fields': ('actif',)
        }),
    )