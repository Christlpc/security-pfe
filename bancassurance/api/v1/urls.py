"""
URLs API v1 - NSIA Backend
Point d'entrée pour toutes les routes API
"""
from django.urls import path, include

app_name = 'api_v1'

urlpatterns = [
    # Authentification (sera créé en Phase 1)
    # path('auth/', include('api.v1.auth_urls')),

    # Core (Auth, Banques, Utilisateurs)
    path('', include('apps.core.urls')),
    
    # Simulations (sera créé en Phase 3)
    path('simulations/', include('apps.simulateur.urls')),
    
    # Banques & Utilisateurs (sera créé en Phase 6)
    # path('banques/', include('api.v1.banques_urls')),
    # path('utilisateurs/', include('api.v1.utilisateurs_urls')),
    
    # Tarification (sera créé en Phase 2)
    #path('tarification/', include('api.v1.tarification_urls')),
    
    # Documents (sera créé en Phase 4)
    # path('documents/', include('api.v1.documents_urls')),
    
    # Analytics (sera créé en Phase 7)
    # path('analytics/', include('api.v1.analytics_urls')),
    
    # Health check
    path('health/', lambda request: __import__('django.http').JsonResponse({'status': 'ok'})),
]
