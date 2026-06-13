"""
Configuration des URLs - NSIA Backend
Sécurité : Docs API protégées, Admin sécurisé
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.core.admin_site import bancassurance_admin_site
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)


# ============================================
# DOCUMENTATION API PROTÉGÉE
# Seuls les admins authentifiés peuvent accéder
# ============================================
class ProtectedSchemaView(SpectacularAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]


class ProtectedSwaggerView(SpectacularSwaggerView):
    permission_classes = [IsAuthenticated, IsAdminUser]


class ProtectedRedocView(SpectacularRedocView):
    permission_classes = [IsAuthenticated, IsAdminUser]


urlpatterns = [
    # Admin Django (sécurisé par login + 2FA recommandé)
    path('nsia-admin-securise/', bancassurance_admin_site.urls),

    # API v1
    path('api/v1/', include('api.v1.urls')),
]

# Documentation API : uniquement accessible en DEBUG ou par les admins authentifiés
if settings.DEBUG:
    # En dev : documentation accessible sans auth (pratique)
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    ]
else:
    # En production : documentation protégée par authentification admin
    urlpatterns += [
        path('api/schema/', ProtectedSchemaView.as_view(), name='schema'),
        path('api/docs/', ProtectedSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('api/redoc/', ProtectedRedocView.as_view(url_name='schema'), name='redoc'),
    ]

# Servir les fichiers media en développement uniquement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Personnalisation Admin (géré dans BancassuranceAdminSite)
