"""
Calculateur pour l'assurance Elikia Scolaire (BCI)
Phase 3.4 : Simulateur Elikia
Produit exclusif à la banque BCI avec primes forfaitaires
"""
from decimal import Decimal
from typing import Dict, Any
from .base import CalculateurBase


class CalculateurElikia(CalculateurBase):
    """
    Calculateur pour le produit ELIKIA SCOLAIRE (BCI)
    Utilise des primes forfaitaires précalculées dans TablePrimesElikia
    """
    PRODUIT_CODE = 'elikia'

    def __init__(self, banque):
        """
        Initialise le calculateur avec vérification via ProduitBanque

        Args:
            banque: Instance du modèle Banque
        """
        super().__init__(banque)
    
    def valider_parametres(self, parametres: Dict[str, Any]) -> None:
        """
        Valide les paramètres d'entrée pour Elikia
        
        Paramètres attendus:
            - rente_annuelle: Montant de la rente annuelle souhaitée
            - age_parent: Âge du parent souscripteur
            - duree_rente: Durée de versement de la rente
        
        Raises:
            ValueError: Si un paramètre est manquant ou invalide
        """
        # Champs requis
        champs_requis = ['rente_annuelle', 'age_parent', 'duree_rente']
        for champ in champs_requis:
            if champ not in parametres:
                raise ValueError(f"Le champ '{champ}' est obligatoire")
        
        # Valider rente_annuelle
        rente = parametres['rente_annuelle']
        if not isinstance(rente, (int, float, Decimal)) or rente <= 0:
            raise ValueError("La rente annuelle doit être un nombre positif")
        
        # Vérifier que la rente est dans les valeurs acceptées
        rentes_acceptees = [200000, 400000, 600000, 800000, 1000000]
        rente_int = int(rente)
        if rente_int not in rentes_acceptees:
            raise ValueError(
                f"La rente annuelle doit être l'une des valeurs suivantes : "
                f"{', '.join(str(r) for r in rentes_acceptees)} FCFA"
            )
        
        # Valider âge parent
        age_parent = parametres['age_parent']
        if not isinstance(age_parent, int) or age_parent < 18 or age_parent > 65:
            raise ValueError("L'âge du parent doit être entre 18 et 65 ans")
        
        # Valider durée rente
        duree_rente = parametres['duree_rente']
        if not isinstance(duree_rente, int) or duree_rente < 1 or duree_rente > 10:
            raise ValueError("La durée de la rente doit être entre 1 et 10 ans")
    
    def calculer(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule une simulation ELIKIA avec lookup dans TablePrimesElikia
        
        Args:
            parametres: Dictionnaire des paramètres validés
        
        Returns:
            Dictionnaire des résultats de calcul
        """
        # Validation
        self.valider_parametres(parametres)
        
        # Extraction des paramètres
        rente_annuelle = self.convertir_en_decimal(parametres['rente_annuelle'])
        age_parent = int(parametres['age_parent'])
        duree_rente = int(parametres['duree_rente'])
        
        # Recherche dans TablePrimesElikia
        try:
            prime_data = self._trouver_prime(
                rente_annuelle,
                age_parent,
                duree_rente
            )
            
            if not prime_data:
                raise ValueError(
                    f"Données Elikia manquantes pour rente {rente_annuelle} FCFA, "
                    f"âge parent {age_parent} ans, durée {duree_rente} ans"
                )
            
            prime_nette_annuelle = prime_data['prime_nette_annuelle']
            capital_garanti = prime_data['capital_garanti']
            tranche_age = prime_data['tranche_age']
            
        except Exception as e:
            raise ValueError(f"Erreur lors de la recherche des primes Elikia: {str(e)}")
        
        # Calculs supplémentaires
        prime_mensuelle = prime_nette_annuelle / 12
        prime_totale = prime_nette_annuelle * duree_rente
        
        # Préparer les résultats
        resultats = {
            'prime_nette_annuelle': prime_nette_annuelle,
            'prime_mensuelle': prime_mensuelle,
            'prime_totale': prime_nette_annuelle + 2500,
            'capital_garanti': capital_garanti,
            'rente_annuelle': rente_annuelle,
            'age_parent': age_parent,
            'duree_rente': duree_rente,
            'tranche_age': tranche_age,
            'frais_accessoires': 2500,
            'produit': 'Elikia Scolaire',
            'banque': self.banque.code_banque,
            'details_calcul': {
                'formule_prime_mensuelle': f'{float(prime_nette_annuelle)} / 12',
                'formule_prime_totale': f'{float(prime_nette_annuelle)} × {duree_rente}',
            }
        }
        
        # Formater pour l'API
        return self.formater_resultat(resultats)
    
    def _trouver_prime(
        self,
        rente_annuelle: Decimal,
        age_parent: int,
        duree_rente: int
    ) -> Dict[str, Any]:
        """
        Trouve la prime dans TablePrimesElikia
        
        Args:
            rente_annuelle: Montant de la rente annuelle
            age_parent: Âge du parent
            duree_rente: Durée de la rente
        
        Returns:
            Dictionnaire avec prime_nette_annuelle, capital_garanti, tranche_age
            None si non trouvé
        """
        from apps.tarification.models import TablePrimesElikia
        
        # Recherche exacte
        try:
            prime_obj = TablePrimesElikia.objects.get(
            banque=self.banque_tarification,
            rente_annuelle=rente_annuelle,
            age_min__lte=age_parent,
            age_max__gte=age_parent,
            duree_rente=duree_rente,
            actif=True
        )

            return {
                'prime_nette_annuelle': prime_obj.prime_nette_annuelle,
                'capital_garanti': prime_obj.capital_garanti,
                'tranche_age': prime_obj.tranche_age,
            }
        
        except TablePrimesElikia.DoesNotExist:
            # Recherche avec interpolation (tranche d'âge)
            return self._recherche_avec_interpolation(
                rente_annuelle,
                age_parent,
                duree_rente
            )
    
    def _recherche_avec_interpolation(
        self,
        rente_annuelle: Decimal,
        age_parent: int,
        duree_rente: int
    ) -> Dict[str, Any]:
        """
        Recherche avec interpolation par tranche d'âge
        
        Args:
            rente_annuelle: Montant de la rente annuelle
            age_parent: Âge du parent
            duree_rente: Durée de la rente
        
        Returns:
            Dictionnaire avec prime_nette_annuelle, capital_garanti, tranche_age
            None si aucune donnée proche trouvée
        """
        from apps.tarification.models import TablePrimesElikia
        
        try:
            # Rechercher par tranche d'âge (généralement : ≤45 ans, 46-54 ans, ≥55 ans)
            # On cherche les données les plus proches
            prime_proche = TablePrimesElikia.objects.filter(
                banque=self.banque_tarification,
                rente_annuelle=rente_annuelle,
                duree_rente=duree_rente,
                actif=True
            ).order_by('age_parent').first()
            
            if prime_proche:
                # Utiliser la tranche d'âge de la ligne trouvée
                return {
                    'prime_nette_annuelle': prime_proche.prime_nette_annuelle,
                    'capital_garanti': prime_proche.capital_garanti,
                    'tranche_age': prime_proche.tranche_age,
                }
        
        except Exception as e:
            print(f"Erreur interpolation Elikia: {e}")
        
        return None