"""
Permissions personnalisées pour l'API
Système RBAC (Role-Based Access Control)
"""
from rest_framework import permissions
from .models import Utilisateur


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission : Seul Super Admin NSIA
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.est_super_admin
        )


class IsAdminNSIA(permissions.BasePermission):
    """
    Permission : Admin NSIA ou Super Admin
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.est_admin_nsia or request.user.est_super_admin)
        )


class IsResponsableBanque(permissions.BasePermission):
    """
    Permission : Responsable Banque, Admin NSIA ou Super Admin
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (
                request.user.est_responsable_banque or
                request.user.est_admin_nsia or
                request.user.est_super_admin
            )
        )


class IsGestionnaire(permissions.BasePermission):
    """
    Permission : Gestionnaire ou supérieur
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [
                Utilisateur.Role.GESTIONNAIRE,
                Utilisateur.Role.RESPONSABLE_BANQUE,
                Utilisateur.Role.ADMIN_NSIA,
                Utilisateur.Role.SUPER_ADMIN
            ]
        )


class CanManageUsers(permissions.BasePermission):
    """
    Permission : Peut gérer les utilisateurs
    - Super Admin : tous les utilisateurs
    - Admin NSIA : créer/voir gestionnaires
    - Responsable Banque : gérer ses gestionnaires
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [
                Utilisateur.Role.SUPER_ADMIN,
                Utilisateur.Role.ADMIN_NSIA,
                Utilisateur.Role.RESPONSABLE_BANQUE
            ]
        )
    
    def has_object_permission(self, request, view, obj):
        """Vérifier permission sur un utilisateur spécifique"""
        user = request.user
        
        # Super Admin : tout
        if user.est_super_admin:
            return True
        
        # Admin NSIA : lecture seule
        if user.est_admin_nsia:
            return request.method in permissions.SAFE_METHODS
        
        # Responsable : seulement ses gestionnaires
        if user.est_responsable_banque:
            return (
                obj.banque == user.banque and
                obj.role == Utilisateur.Role.GESTIONNAIRE
            )
        
        return False


class CanManageBanques(permissions.BasePermission):
    """
    Permission : Peut gérer les banques (Super Admin uniquement)
    """
    def has_permission(self, request, view):
        # Lecture : Admin NSIA et Super Admin
        if request.method in permissions.SAFE_METHODS:
            return (
                request.user and
                request.user.is_authenticated and
                (request.user.est_admin_nsia or request.user.est_super_admin)
            )
        
        # Modification : Super Admin uniquement
        return (
            request.user and
            request.user.is_authenticated and
            request.user.est_super_admin
        )


class IsSameBanqueOrAdmin(permissions.BasePermission):
    """
    Permission : Même banque ou Admin
    Utilisé pour vérifier que l'utilisateur accède seulement à sa banque
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Super Admin et Admin NSIA : tout
        if user.est_super_admin or user.est_admin_nsia:
            return True
        
        # Vérifier que l'objet a un attribut banque
        if hasattr(obj, 'banque'):
            return obj.banque == user.banque
        
        return False


class CanCreateSimulation(permissions.BasePermission):
    """
    Permission : Peut créer des simulations (Gestionnaire et supérieur)
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in [
                Utilisateur.Role.GESTIONNAIRE,
                Utilisateur.Role.RESPONSABLE_BANQUE,
                Utilisateur.Role.SUPER_ADMIN
            ]
        )


class CanViewSimulation(permissions.BasePermission):
    """
    Permission : Peut voir les simulations
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Vérifier permission sur une simulation spécifique"""
        user = request.user
        
        # Super Admin : tout
        if user.est_super_admin:
            return True
        
        # Admin NSIA : tout en lecture seule
        if user.est_admin_nsia:
            return True
        
        # Responsable : toutes les simulations de sa banque
        if user.est_responsable_banque:
            return obj.banque == user.banque
        
        # Gestionnaire : seulement ses propres simulations
        if user.est_gestionnaire:
            return obj.gestionnaire == user
        
        # Support : lecture seule de tout
        if user.role == Utilisateur.Role.SUPPORT:
            return request.method in permissions.SAFE_METHODS
        
        return False


class ReadOnly(permissions.BasePermission):
    """
    Permission : Lecture seule
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS