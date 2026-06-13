"""
Serializers pour la tarification
"""
from rest_framework import serializers
from .models import (
    TableTauxEmprunteur,
    TableCIMA_H,
    TablePrimesEtudes,
    TableTauxMensuels,
    ParametresProduits
)


class TableTauxEmprunteurSerializer(serializers.ModelSerializer):
    """Serializer pour les taux emprunteur"""
    
    class Meta:
        model = TableTauxEmprunteur
        fields = '__all__'


class TableCIMA_HSerializer(serializers.ModelSerializer):
    """Serializer pour les tables CIMA H"""
    
    class Meta:
        model = TableCIMA_H
        fields = '__all__'


class TablePrimesEtudesSerializer(serializers.ModelSerializer):
    """Serializer pour les primes études"""
    
    class Meta:
        model = TablePrimesEtudes
        fields = '__all__'


class TableTauxMensuelsSerializer(serializers.ModelSerializer):
    """Serializer pour les taux mensuels"""
    
    class Meta:
        model = TableTauxMensuels
        fields = '__all__'


class ParametresProduitsSerializer(serializers.ModelSerializer):
    """Serializer pour les paramètres produits"""
    
    valeur_typee = serializers.SerializerMethodField()
    
    class Meta:
        model = ParametresProduits
        fields = '__all__'
    
    def get_valeur_typee(self, obj):
        """Retourne la valeur convertie"""
        return obj.get_valeur_typee()


class ImportExcelSerializer(serializers.Serializer):
    """Serializer pour l'upload de fichiers Excel"""
    
    fichier = serializers.FileField(required=True)
    type_table = serializers.ChoiceField(
        choices=[
            ('taux_emprunteur', 'Taux Emprunteur'),
            ('cima_h', 'Table CIMA H'),
            ('primes_etudes', 'Primes Études'),
            ('taux_mensuels', 'Taux Mensuels'),
        ],
        required=True
    )
    sheet_name = serializers.CharField(required=False, allow_blank=True)
    banque_id = serializers.UUIDField(required=False, allow_null=True)