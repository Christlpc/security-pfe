"""
Calculateur pour l'assurance Mobateli (DTC/IAD) (BCI)
Phase 3.4 : Simulateur Mobateli
Produit exclusif à la banque BCI avec primes forfaitaires
"""
from decimal import Decimal
from typing import Dict, Any

from apps.tarification.models import TablePrimesMobateli
from .base import CalculateurBase


class CalculateurMobateli(CalculateurBase):
    """
    Calculateur pour le produit Prévoyance DTC/IAD
    (anciennement Mobateli pour BCI, Likama pour BOA)
    Utilise des primes forfaitaires précalculées dans TablePrimesMobateli
    """
    PRODUIT_CODE = 'mobateli'

    def __init__(self, banque):
        """
        Initialise le calculateur avec vérification via ProduitBanque

        Args:
            banque: Instance du modèle Banque
        """
        super().__init__(banque)
    
    def valider_parametres(self, parametres: Dict[str, Any]) -> None:
        """
        Valide les paramètres d'entrée pour Mobateli
        
        Paramètres attendus:
            - capital_dtc_iad: Capital DTC/IAD souhaité
            - age: Âge de l'assuré
        
        Raises:
            ValueError: Si un paramètre est manquant ou invalide
        """
        # Champs requis
        champs_requis = ['capital_dtc_iad', 'age']
        for champ in champs_requis:
            if champ not in parametres:
                raise ValueError(f"Le champ '{champ}' est obligatoire")
        
        # Valider capital_dtc_iad
        capital = parametres['capital_dtc_iad']
        if not isinstance(capital, (int, float, Decimal)) or capital <= 0:
            raise ValueError("Le capital DTC/IAD doit être un nombre positif")

        # Vérifier que le capital est dans les valeurs acceptées pour cette banque
        capitaux_acceptes = list(
            TablePrimesMobateli.objects.filter(
                banque=self.banque_tarification,
                actif=True,
            ).values_list('capital_dtc_iad', flat=True).distinct().order_by('capital_dtc_iad')
        )
        capital_decimal = Decimal(str(int(capital)))
        if capital_decimal not in capitaux_acceptes:
            capitaux_str = ', '.join(f"{int(c):,}" for c in capitaux_acceptes)
            raise ValueError(
                f"Le capital DTC/IAD doit être l'une des valeurs suivantes : "
                f"{capitaux_str} FCFA"
            )
        
        # Valider âge
        age = parametres['age']
        if not isinstance(age, int) or age < 18 or age > 70:
            raise ValueError("L'âge doit être entre 18 et 70 ans")
    
    def calculer(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule une simulation MOBATELI avec lookup dans TablePrimesMobateli
        
        Args:
            parametres: Dictionnaire des paramètres validés
        
        Returns:
            Dictionnaire des résultats de calcul
        """
        # Validation
        self.valider_parametres(parametres)
        
        # Extraction des paramètres
        capital_dtc_iad = self.convertir_en_decimal(parametres['capital_dtc_iad'])
        age = int(parametres['age'])
        
        # Recherche dans TablePrimesMobateli
        try:
            prime_data = self._trouver_prime(
                capital_dtc_iad,
                age
            )
            
            if not prime_data:
                raise ValueError(
                    f"Données Mobateli manquantes pour capital {capital_dtc_iad} FCFA, "
                    f"âge {age} ans"
                )
            
            prime_nette = prime_data['prime_nette']
            tranche_age = prime_data['tranche_age']
            
        except Exception as e:
            raise ValueError(f"Erreur lors de la recherche des primes Mobateli: {str(e)}")
        
        # Calculs supplémentaires
        prime_mensuelle = prime_nette / 12
        
        # Préparer les résultats
        resultats = {
            'prime_nette': prime_nette,
            'prime_mensuelle': prime_mensuelle,
            'capital_dtc_iad': capital_dtc_iad,
            'prime_totale' : prime_nette + 2500,
            'age': age,
            'tranche_age': tranche_age,
            'frais_accessoires': 2500,
            'produit': 'Prévoyance (DTC/IAD)',
            'banque': self.banque.code_banque,
            'details_calcul': {
                'formule_prime_mensuelle': f'{float(prime_nette)} / 12',
                'type_couverture': 'DTC (Décès Toutes Causes) et IAD (Invalidité Absolue et Définitive)',
            }
        }
        
        # Formater pour l'API
        return self.formater_resultat(resultats)
    
    def _trouver_prime(
        self,
        capital_dtc_iad: Decimal,
        age: int
    ) -> Dict[str, Any]:
        """
        Trouve la prime dans TablePrimesMobateli
        
        Args:
            capital_dtc_iad: Capital DTC/IAD
            age: Âge de l'assuré
        
        Returns:
            Dictionnaire avec prime_nette, tranche_age
            None si non trouvé
        """
        
        
        # Recherche exacte
        try:
            prime_obj = TablePrimesMobateli.objects.get(
            banque=self.banque_tarification,
            capital_dtc_iad=capital_dtc_iad,
            age_min__lte=age,
            age_max__gte=age,
            actif=True
        )

            
            return {
                'prime_nette': prime_obj.prime_nette,
                'tranche_age': prime_obj.tranche_age,
            }
        
        except TablePrimesMobateli.DoesNotExist:
            # Recherche avec interpolation (tranche d'âge)
            return self._recherche_avec_interpolation(
                capital_dtc_iad,
                age
            )
    
    def _recherche_avec_interpolation(
        self,
        capital_dtc_iad: Decimal,
        age: int
    ) -> Dict[str, Any]:
        """
        Recherche avec interpolation par tranche d'âge
        Fallback quand l'âge exact ne match pas une tranche.

        Args:
            capital_dtc_iad: Capital DTC/IAD
            age: Âge de l'assuré

        Returns:
            Dictionnaire avec prime_nette, tranche_age
            None si aucune donnée proche trouvée
        """
        from apps.tarification.models import TablePrimesMobateli

        try:
            # Rechercher la tranche d'âge la plus proche
            prime_proche = TablePrimesMobateli.objects.filter(
                banque=self.banque_tarification,
                capital_dtc_iad=capital_dtc_iad,
                age_min__lte=age + 5,
                age_max__gte=age - 5,
                actif=True
            ).order_by('age_min').first()

            if prime_proche:
                return {
                    'prime_nette': prime_proche.prime_nette,
                    'tranche_age': prime_proche.tranche_age,
                }

        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Erreur interpolation Mobateli: {e}")

        return None