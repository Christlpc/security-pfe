"""
URLs pour l'app Core (Authentication)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AgenceViewSet,
    CustomTokenObtainPairView,
    AuthViewSet,
    BanqueViewSet,
    UtilisateurViewSet
)

app_name = 'core'

router = DefaultRouter()
router.register(r'banques', BanqueViewSet, basename='banque')
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateur')
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'agences', AgenceViewSet, basename='agence')

urlpatterns = [
    # JWT Authentication
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Router URLs
    path('', include(router.urls)),
]