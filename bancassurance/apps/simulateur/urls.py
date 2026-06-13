"""
URLs pour l'API Simulateur NSIA
Phase 3 : Routes REST
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter


from .views import (
    EpargnePlusViewSet,
    ExportBIAView,
    ExportSimulationsViewSet,
    InfoExportBIAView,
    PreviewBIAView,
    QuestionnaireMedicalViewSet,
    SimulateurEmprunteurViewSet,
    SimulateurRetraiteViewSet,
    SimulateurEtudesViewSet,
    SimulateurElikiaViewSet,
    SimulateurMobateliViewSet,
    SimulateurMobateliSurMesureViewSet,
    SimulationViewSet,
    SouscriptionViewSet,
)


# Router pour les ViewSets
router = DefaultRouter()
router.register(r'historique', SimulationViewSet, basename='simulation')
router.register(r'souscriptions', SouscriptionViewSet, basename='souscription')
router.register(r'questionnaires-medicaux', QuestionnaireMedicalViewSet, basename='questionnaire-medical')
router.register(r'export', ExportSimulationsViewSet, basename='export-simulations')
router.register(r'epargne-plus', EpargnePlusViewSet, basename='epargne-plus')

app_name = 'simulateur'

urlpatterns = [
    # Endpoint pour calculer une simulation emprunteur
    path('emprunteur/', SimulateurEmprunteurViewSet.as_view({'post': 'create'}), name='emprunteur'),
    
    # Endpoint pour calculer une simulation retraite
    path('retraite/', SimulateurRetraiteViewSet.as_view({'post': 'create'}), name='retraite'),
    
    # Endpoint pour calculer une simulation études
    path('etudes/', SimulateurEtudesViewSet.as_view({'post': 'create'}), name='etudes'),
    
    # Endpoints pour BCI uniquement
    path('elikia/', SimulateurElikiaViewSet.as_view({'post': 'create'}), name='elikia'),

    path('mobateli/', SimulateurMobateliViewSet.as_view({'post': 'create'}), name='mobateli'),
    path('mobateli-sur-mesure/', SimulateurMobateliSurMesureViewSet.as_view({'post': 'create'}), name='mobateli-sur-mesure'),



    # Export BIA (téléchargement)
    path(
        'simulations/<str:simulation_id>/export-bia/',
        ExportBIAView.as_view(),
        name='export-bia'
    ),
    
    # Prévisualisation BIA (affichage dans le navigateur)
    path(
        'simulations/<str:simulation_id>/preview-bia/',
        PreviewBIAView.as_view(),
        name='preview-bia'
    ),
    
    # Informations sur l'export BIA
    path(
        'simulations/<str:simulation_id>/bia-info/',
        InfoExportBIAView.as_view(),
        name='bia-info'
    ),
    
    # Inclure les routes du router
    path('', include(router.urls)),
]

"""
Structure des URLs:

Base: /api/v1/simulateur/

Simulateur Emprunteur:
- POST   /api/v1/simulateur/emprunteur/                    → Calculer simulation

Simulateur Retraite:
- POST   /api/v1/simulateur/retraite/                      → Calculer simulation

Simulateur Études:
- POST   /api/v1/simulateur/etudes/                        → Calculer simulation

Simulateurs BCI (exclusifs):
- POST   /api/v1/simulateur/elikia/                        → Calculer simulation (BCI uniquement)
- POST   /api/v1/simulateur/mobateli/                      → Calculer simulation (BCI uniquement)

Gestion des simulations:
- GET    /api/v1/simulateur/historique/                    → Liste simulations
- GET    /api/v1/simulateur/historique/{id}/               → Détail simulation
- PATCH  /api/v1/simulateur/historique/{id}/               → Modifier simulation
- DELETE /api/v1/simulateur/historique/{id}/               → Supprimer simulation
- POST   /api/v1/simulateur/historique/{id}/valider/       → Valider simulation
- POST   /api/v1/simulateur/historique/{id}/souscrire/     → Convertir en souscription

Gestion des souscriptions:
- GET    /api/v1/simulateur/souscriptions/                 → Liste souscriptions
- GET    /api/v1/simulateur/souscriptions/{id}/            → Détail souscription
- PATCH  /api/v1/simulateur/souscriptions/{id}/            → Modifier souscription
- POST   /api/v1/simulateur/souscriptions/{id}/valider/    → Valider souscription
- POST   /api/v1/simulateur/souscriptions/{id}/rejeter/    → Rejeter souscription
"""