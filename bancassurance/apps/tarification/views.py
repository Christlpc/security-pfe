"""
Views pour la tarification
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import tempfile

from apps.core.permissions import IsSuperAdmin, IsAdminNSIA
from apps.core.models import Banque
from .models import (
    TableTauxEmprunteur,
    TableCIMA_H,
    TablePrimesEtudes,
    TableTauxMensuels,
    ParametresProduits
)
from .serializers import (
    TableTauxEmprunteurSerializer,
    TableCIMA_HSerializer,
    TablePrimesEtudesSerializer,
    TableTauxMensuelsSerializer,
    ParametresProduitsSerializer,
    ImportExcelSerializer
)
from .importers import (
    TauxEmprunteurImporter,
    CIMA_H_Importer,
    PrimesEtudesImporter,
    TauxMensuelsImporter
)


class BanqueFilteredTarificationMixin:
    """
    SECURITE : Mixin qui filtre automatiquement les données de tarification
    par la banque de l'utilisateur. Les admins voient tout, les autres
    voient uniquement les données de leur banque.
    """
    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        if user.est_super_admin or user.est_admin_nsia:
            return qs

        # Filtrer par banque si le modèle a un champ 'banque'
        if hasattr(qs.model, 'banque') and user.banque:
            return qs.filter(banque=user.banque)

        return qs


class TableTauxEmprunteurViewSet(BanqueFilteredTarificationMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les taux emprunteur (lecture seule, filtré par banque)"""

    queryset = TableTauxEmprunteur.objects.filter(actif=True)
    serializer_class = TableTauxEmprunteurSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['age_min', 'age_max', 'duree_annees', 'produit', 'banque']


class TableCIMA_HViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les tables CIMA H (lecture seule) — données communes, pas de filtre banque"""

    queryset = TableCIMA_H.objects.all()
    serializer_class = TableCIMA_HSerializer
    permission_classes = [IsAuthenticated]


class TablePrimesEtudesViewSet(BanqueFilteredTarificationMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les primes études (lecture seule, filtré par banque)"""

    queryset = TablePrimesEtudes.objects.filter(actif=True)
    serializer_class = TablePrimesEtudesSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['age', 'duree_paiement', 'duree_rente', 'type_prime', 'produit']


class TableTauxMensuelsViewSet(BanqueFilteredTarificationMixin, viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les taux mensuels (lecture seule, filtré par banque)"""

    queryset = TableTauxMensuels.objects.filter(actif=True)
    serializer_class = TableTauxMensuelsSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['age', 'duree_paiement', 'duree_rente', 'produit']


class ParametresProduitsViewSet(BanqueFilteredTarificationMixin, viewsets.ModelViewSet):
    """ViewSet pour les paramètres produits (filtré par banque)"""

    queryset = ParametresProduits.objects.filter(actif=True)
    serializer_class = ParametresProduitsSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['produit_type', 'banque']

    def get_permissions(self):
        """Lecture pour tous, modification pour Super Admin uniquement"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        return [IsAuthenticated()]


class ImportViewSet(viewsets.ViewSet):
    """ViewSet pour l'import de fichiers Excel"""
    
    permission_classes = [IsSuperAdmin]
    
    @action(detail=False, methods=['post'])
    def excel(self, request):
        """
        Importer un fichier Excel
        
        POST /api/v1/tarification/import/excel/
        Body (multipart/form-data):
        - fichier: le fichier Excel
        - type_table: type de table (taux_emprunteur, cima_h, etc.)
        - sheet_name: nom de la feuille (optionnel)
        - banque_id: UUID de la banque (optionnel, pour taux_emprunteur)
        """
        serializer = ImportExcelSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'errors': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fichier = serializer.validated_data['fichier']
        type_table = serializer.validated_data['type_table']
        sheet_name = serializer.validated_data.get('sheet_name', '')
        banque_id = serializer.validated_data.get('banque_id')
        
        # SECURITE : validation taille fichier (max 10 Mo)
        if fichier.size > 10 * 1024 * 1024:
            return Response(
                {'error': 'Fichier trop volumineux (max 10 Mo).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # SECURITE : utiliser NamedTemporaryFile au lieu de mktemp (déprécié/insécure)
        import tempfile as _tempfile
        temp_file_obj = _tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False)
        temp_path = temp_file_obj.name

        try:
            # Écrire le fichier temporaire
            for chunk in fichier.chunks():
                temp_file_obj.write(chunk)
            temp_file_obj.close()
            
            # Sélectionner l'importer selon le type
            banque = None
            if banque_id:
                try:
                    banque = Banque.objects.get(id=banque_id)
                except Banque.DoesNotExist:
                    return Response(
                        {'error': 'Banque introuvable'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            if type_table == 'taux_emprunteur':
                importer = TauxEmprunteurImporter(temp_path)
                sheet = sheet_name or 'Taux'
                success = importer.import_data(sheet_name=sheet, banque=banque)
            
            elif type_table == 'cima_h':
                importer = CIMA_H_Importer(temp_path)
                sheet = sheet_name or 'CIMA_H'
                success = importer.import_data(sheet_name=sheet)
            
            elif type_table == 'primes_etudes':
                importer = PrimesEtudesImporter(temp_path)
                sheet = sheet_name or 'Primes_Etudes'
                success = importer.import_data(sheet_name=sheet)
            
            elif type_table == 'taux_mensuels':
                importer = TauxMensuelsImporter(temp_path)
                sheet = sheet_name or 'Taux_Mensuels'
                success = importer.import_data(sheet_name=sheet)
            
            else:
                return Response(
                    {'error': 'Type de table invalide'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Résultats
            if success:
                return Response({
                    'message': 'Import réussi',
                    'stats': importer.stats,
                    'type_table': type_table
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'message': 'Import échoué',
                    'errors': importer.errors,
                    'stats': importer.stats
                }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'import: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        finally:
            # Supprimer le fichier temporaire
            if os.path.exists(temp_path):
                os.remove(temp_path)