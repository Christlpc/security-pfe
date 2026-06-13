"""
Views pour l'authentification et la gestion des utilisateurs
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import logout

from apps.simulateur.models import Simulation
from apps.simulateur.serializers import SimulationSerializer

from .models import Agence, LoginAttempt, Produit, ProduitBanque, Utilisateur, Banque
from .serializers import (
    AdminPasswordResetSerializer,
    AgenceSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProduitBanqueSerializer,
    ProduitBanqueSimpleSerializer,
    ProduitSerializer,
    UtilisateurSerializer,
    UtilisateurCreateSerializer,
    BanqueSerializer,
    CustomTokenObtainPairSerializer
)
from .permissions import (
    IsSuperAdmin,
    CanManageUsers,
    CanManageBanques
)
from .services import PasswordResetService
from .throttles import (
    LoginRateThrottle,
    PasswordResetRequestThrottle,
    PasswordResetConfirmThrottle,
    PasswordChangeThrottle,
)

security_logger = logging.getLogger('django.security')


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vue custom pour obtenir les tokens JWT
    Utilise notre serializer custom qui ajoute des infos dans le token.
    Protégée par throttling anti brute-force (5 tentatives/min).
    """
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        """
        Override pour :
        1. Vérifier le verrouillage de compte avant la tentative
        2. Enregistrer chaque tentative (succès/échec)
        3. Logger les échecs de connexion
        """
        ip = self._get_client_ip(request)
        username = request.data.get('username', 'inconnu')

        # SECURITE : vérifier le verrouillage AVANT de tenter l'authentification
        if LoginAttempt.is_locked_out(username=username, ip_address=ip):
            security_logger.warning(
                f"Compte verrouillé - username={username} ip={ip}"
            )
            return Response(
                {
                    'detail': (
                        f"Trop de tentatives échouées. "
                        f"Compte verrouillé pour {LoginAttempt.LOCKOUT_MINUTES} minutes."
                    )
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        response = super().post(request, *args, **kwargs)

        # Enregistrer la tentative
        success = response.status_code == 200
        LoginAttempt.record_attempt(
            username=username,
            ip_address=ip,
            success=success,
        )

        if not success:
            security_logger.warning(
                f"Échec de connexion - username={username} ip={ip}"
            )

        return response

    @staticmethod
    def _get_client_ip(request):
        """Récupère l'IP du client (même derrière un proxy)"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')


class AuthViewSet(viewsets.GenericViewSet):
    """
    ViewSet pour les opérations d'authentification et gestion de mot de passe.

    Endpoints publics (AllowAny) :
      POST /auth/logout/
      POST /auth/password_reset_request/    — Demander un lien de reset par email
      POST /auth/password_reset_confirm/    — Valider le token + nouveau MDP

    Endpoints authentifiés (IsAuthenticated) :
      GET  /auth/me/                        — Profil utilisateur + produits
      POST /auth/change_password/           — Changer son propre MDP
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Déconnexion de l'utilisateur"""
        logout(request)
        return Response(
            {'message': 'Déconnexion réussie'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Récupère les informations de l'utilisateur connecté
        + les produits autorisés pour sa banque
        """
        user = request.user
        data = UtilisateurSerializer(user).data

        # Ajouter les produits autorisés pour la banque du user
        if user.banque:
            produits_banque = ProduitBanque.objects.filter(
                banque=user.banque,
                est_actif=True,
                produit__est_actif=True
            ).select_related('produit')
            data['produits_autorises'] = ProduitBanqueSimpleSerializer(
                produits_banque, many=True
            ).data
        else:
            # Admin NSIA / Super Admin → tous les produits actifs
            produits = Produit.objects.filter(est_actif=True)
            data['produits_autorises'] = [
                {'code': p.code, 'nom': p.nom, 'est_actif': True, 'numero_convention': ''}
                for p in produits
            ]

        return Response(data)

    # ── Flow 1 : Changement MDP authentifié ─────────────────────────

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[IsAuthenticated],
        throttle_classes=[PasswordChangeThrottle],
        url_path='change-password',
    )
    def change_password(self, request):
        """
        POST /api/v1/auth/change-password/

        Permet à un utilisateur connecté de changer son propre mot de passe.
        Requiert : old_password, new_password, confirm_password.

        Sécurité :
          • Throttle : 3 tentatives / heure
          • Ancien mot de passe vérifié
          • Nouveau MDP validé (Django validators : longueur, similarité, etc.)
          • Email de notification envoyé
        """
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        ip = self._get_client_ip(request)

        PasswordResetService.change_password(
            user=request.user,
            old_password=serializer.validated_data['old_password'],
            new_password=serializer.validated_data['new_password'],
            ip_address=ip,
        )

        return Response(
            {'message': 'Mot de passe modifié avec succès.'},
            status=status.HTTP_200_OK
        )

    # ── Flow 2a : Demande de reset (forgot password) ────────────────

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        throttle_classes=[PasswordResetRequestThrottle],
        url_path='password-reset-request',
    )
    def password_reset_request(self, request):
        """
        POST /api/v1/auth/password-reset-request/

        Envoie un email avec un lien de réinitialisation.

        Sécurité :
          • Throttle : 3 demandes / heure par IP
          • Anti-énumération : réponse identique que l'email existe ou non
          • Token SHA-256 hashé en base, expire en 15 minutes
          • Anciens tokens invalidés automatiquement
        """
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = self._get_client_ip(request)

        PasswordResetService.request_reset(
            email=serializer.validated_data['email'],
            ip_address=ip,
        )

        # TOUJOURS la même réponse (anti-énumération)
        return Response(
            {
                'message': (
                    "Si cette adresse email est associée à un compte actif, "
                    "un lien de réinitialisation vient d'être envoyé. "
                    "Vérifiez votre boîte de réception et vos spams."
                )
            },
            status=status.HTTP_200_OK
        )

    # ── Flow 2b : Confirmation du reset avec token ──────────────────

    @action(
        detail=False,
        methods=['post'],
        permission_classes=[AllowAny],
        throttle_classes=[PasswordResetConfirmThrottle],
        url_path='password-reset-confirm',
    )
    def password_reset_confirm(self, request):
        """
        POST /api/v1/auth/password-reset-confirm/

        Valide le token et définit le nouveau mot de passe.

        Sécurité :
          • Throttle : 5 tentatives / heure par IP
          • Token vérifié (hash, expiration, usage unique)
          • MDP validé (Django validators)
          • Token consommé après usage (one-time use)
          • Email de confirmation envoyé
        """
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = self._get_client_ip(request)

        success, message = PasswordResetService.confirm_reset(
            token=serializer.validated_data['token'],
            new_password=serializer.validated_data['new_password'],
            ip_address=ip,
        )

        if not success:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {'message': message},
            status=status.HTTP_200_OK
        )

    # ── Utilitaire ──────────────────────────────────────────────────

    @staticmethod
    def _get_client_ip(request):
        """Récupère l'IP du client (même derrière un proxy)."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')


class BanqueViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des banques
    """
    queryset = Banque.objects.all()
    serializer_class = BanqueSerializer
    permission_classes = [IsAuthenticated, CanManageBanques]
    search_fields = ['nom_complet', 'code_banque', 'email_contact']
    filterset_fields = ['statut', 'code_banque']
    ordering_fields = ['nom_complet', 'date_partenariat', 'date_creation']
    ordering = ['nom_complet']
    
    @action(detail=True, methods=['get'])
    def utilisateurs(self, request, pk=None):
        """
        Récupère tous les utilisateurs d'une banque
        """
        banque = self.get_object()
        utilisateurs = banque.utilisateurs.all()
        serializer = UtilisateurSerializer(utilisateurs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def produits(self, request, pk=None):
        """
        GET  /api/v1/banques/{id}/produits/ → Liste des produits autorisés
        POST /api/v1/banques/{id}/produits/ → Ajouter un produit (Super Admin)
        """
        banque = self.get_object()

        if request.method == 'GET':
            produits_banque = ProduitBanque.objects.filter(
                banque=banque
            ).select_related('produit')
            serializer = ProduitBanqueSerializer(produits_banque, many=True)
            return Response(serializer.data)

        # POST - Ajouter un produit à la banque (Super Admin uniquement)
        if not request.user.est_super_admin:
            return Response(
                {'error': 'Seul le Super Admin peut ajouter des produits à une banque'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ProduitBanqueSerializer(data={
            'banque': banque.id,
            **request.data
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class UtilisateurViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des utilisateurs
    """
    queryset = Utilisateur.objects.all()
    permission_classes = [IsAuthenticated, CanManageUsers]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'matricule']
    filterset_fields = ['role', 'est_actif', 'banque', 'agence']
    ordering_fields = ['username', 'date_creation', 'last_login']
    ordering = ['-date_creation']
    
    def get_serializer_class(self):
        """Utiliser le bon serializer selon l'action"""
        if self.action == 'create':
            return UtilisateurCreateSerializer
        return UtilisateurSerializer
    
    def get_queryset(self):
        """
        Filtrer les utilisateurs selon le rôle
        - Super Admin : tous
        - Admin NSIA : tous (lecture seule)
        - Responsable Banque : seulement sa banque
        """
        user = self.request.user
        queryset = Utilisateur.objects.all()
        
        if user.est_super_admin:
            return queryset
        
        if user.est_admin_nsia:
            return queryset
        
        if user.est_responsable_banque:
            return queryset.filter(banque=user.banque)
        
        if user.est_responsable_agence:
            return queryset.filter(agence=user.agence)
        
        # Par défaut, seulement l'utilisateur lui-même
        return queryset.filter(id=user.id)
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """
        Activer/Désactiver un utilisateur
        """
        utilisateur = self.get_object()
        utilisateur.est_actif = not utilisateur.est_actif
        utilisateur.save()
        
        return Response({
            'message': f"Utilisateur {'activé' if utilisateur.est_actif else 'désactivé'}",
            'est_actif': utilisateur.est_actif
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """
        POST /api/v1/utilisateurs/{id}/reset_password/

        Reset administratif du mot de passe d'un utilisateur.
        Réservé aux Super Admin et Admin NSIA.

        Sécurité :
          • Seuls SUPER_ADMIN et ADMIN_NSIA peuvent utiliser cet endpoint
          • Le nouveau MDP est validé par les validators Django
          • Confirmation requise (new_password + confirm_password)
          • Audit log de l'opération
        """
        # Vérification du rôle
        if not (request.user.est_super_admin or request.user.est_admin_nsia):
            return Response(
                {'error': 'Seuls les administrateurs NSIA peuvent réinitialiser les mots de passe.'},
                status=status.HTTP_403_FORBIDDEN
            )

        utilisateur = self.get_object()
        serializer = AdminPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        utilisateur.set_password(serializer.validated_data['new_password'])
        utilisateur.save(update_fields=['password'])

        # Audit
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'unknown'))
        if ',' in ip:
            ip = ip.split(',')[0].strip()

        security_logger.info(
            f"Admin password reset: {request.user.username} a réinitialisé le MDP de "
            f"{utilisateur.username} (IP: {ip})"
        )

        return Response({
            'message': f'Mot de passe de {utilisateur.get_full_name()} réinitialisé avec succès.'
        })
    

class AgenceViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les agences
    """
    serializer_class = AgenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.est_admin_nsia or user.est_super_admin:
            # Admin NSIA voit toutes les agences
            return Agence.objects.all()
        
        elif user.est_responsable_banque:
            # Responsable voit les agences de sa banque
            return Agence.objects.filter(banque=user.banque)
        
        elif user.est_gestionnaire:
            # Gestionnaire voit uniquement son agence
            return Agence.objects.filter(id=user.agence.id)
        
        return Agence.objects.none()

class SimulationViewSet(viewsets.ModelViewSet):
    """
    CRUD pour les simulations avec filtrage par agence
    """
    serializer_class = SimulationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user

        if user.role in ('ADMIN_NSIA', 'SUPER_ADMIN'):
            # Admins voient tout, y compris les simulations de test
            return Simulation.objects.all()

        elif user.role == 'RESPONSABLE_BANQUE':
            # Voir les simulations de sa banque, SANS les tests NSIA
            return Simulation.objects.filter(banque=user.banque, est_test=False)

        elif user.role == 'GESTIONNAIRE':
            # Voir uniquement les simulations de son agence, SANS les tests
            return Simulation.objects.filter(agence=user.agence, est_test=False)

        elif user.role == 'RESPONSABLE_AGENCE':
            return Simulation.objects.filter(agence=user.agence, est_test=False)

        return Simulation.objects.none()
    
    def perform_create(self, serializer):
        # L'agence est auto-remplie depuis le gestionnaire
        serializer.save(
            gestionnaire=self.request.user,
            banque=self.request.user.banque
        )