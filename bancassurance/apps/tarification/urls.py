"""
URLs pour l'app Tarification
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TableTauxEmprunteurViewSet,
    TableCIMA_HViewSet,
    TablePrimesEtudesViewSet,
    TableTauxMensuelsViewSet,
    ParametresProduitsViewSet,
    ImportViewSet
)

app_name = 'tarification'

router = DefaultRouter()
router.register(r'taux-emprunteur', TableTauxEmprunteurViewSet, basename='taux-emprunteur')
router.register(r'cima-h', TableCIMA_HViewSet, basename='cima-h')
router.register(r'primes-etudes', TablePrimesEtudesViewSet, basename='primes-etudes')
router.register(r'taux-mensuels', TableTauxMensuelsViewSet, basename='taux-mensuels')
router.register(r'parametres', ParametresProduitsViewSet, basename='parametres')
router.register(r'import', ImportViewSet, basename='import')

urlpatterns = [
    path('', include(router.urls)),
]