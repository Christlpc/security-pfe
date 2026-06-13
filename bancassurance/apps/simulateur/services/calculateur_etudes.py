"""
Calculateur pour l'assurance Confort Études
Phase 3.3 : Simulateur Études
Adapté depuis le code Python fourni dans etudes_retraite.py
"""
from decimal import Decimal
from typing import Dict, Any

from apps.tarification.models import TablePrimesEtudes, TableTauxMensuels
from .base import CalculateurBase


class CalculateurEtudes(CalculateurBase):
    """
    Calculateur pour le produit CONFORT ÉTUDES
    Basé sur la logique de croisement âge parent/enfant et tables de primes
    """
    PRODUIT_CODE = 'etudes'

    def __init__(self, banque):
        """
        Initialise le calculateur avec vérification via ProduitBanque

        Args:
            banque: Instance du modèle Banque
        """
        super().__init__(banque)
    
    def valider_parametres(self, parametres: Dict[str, Any]) -> None:
        """
        Valide les paramètres d'entrée pour les études
        
        Paramètres attendus:
            - age_parent: Âge du parent souscripteur
            - age_enfant: Âge de l'enfant bénéficiaire
            - montant_rente: Montant de la rente annuelle souhaitée
            - duree_paiement: Durée de paiement des cotisations
            - duree_service: Durée de versement de la rente
        
        Raises:
            ValueError: Si un paramètre est manquant ou invalide
        """
        # Champs requis
        champs_requis = ['age_parent', 'age_enfant', 'montant_rente', 'duree_paiement', 'duree_service']
        for champ in champs_requis:
            if champ not in parametres:
                raise ValueError(f"Le champ '{champ}' est obligatoire")
        
        # Valider âge parent
        age_parent = parametres['age_parent']
        if not isinstance(age_parent, int) or age_parent < 18 or age_parent > 65:
            raise ValueError("L'âge du parent doit être entre 18 et 65 ans")
        
        # Valider âge enfant
        age_enfant = parametres['age_enfant']
        if not isinstance(age_enfant, int) or age_enfant < 0 or age_enfant > 18:
            raise ValueError("L'âge de l'enfant doit être entre 0 et 18 ans")
        
        # Valider montant rente
        montant_rente = parametres['montant_rente']
        if not isinstance(montant_rente, (int, float, Decimal)) or montant_rente <= 0:
            raise ValueError("Le montant de la rente doit être un nombre positif")
        
        # Valider durée paiement
        duree_paiement = parametres['duree_paiement']
        if not isinstance(duree_paiement, int) or duree_paiement < 1 or duree_paiement > 40:
            raise ValueError("La durée de paiement doit être entre 1 et 40 ans")
        
        # Valider durée service
        duree_service = parametres['duree_service']
        if not isinstance(duree_service, int) or duree_service < 1 or duree_service > 15:
            raise ValueError("La durée de service doit être entre 1 et 15 ans")
    
    def calculer(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule une simulation ÉTUDES avec lookup dans les tables
        
        Args:
            parametres: Dictionnaire des paramètres validés
        
        Returns:
            Dictionnaire des résultats de calcul
        """
        # Validation
        self.valider_parametres(parametres)
        
        # Extraction des paramètres
        age_parent = int(parametres['age_parent'])
        age_enfant = int(parametres['age_enfant'])
        montant_rente = self.convertir_en_decimal(parametres['montant_rente'])
        
        duree_paiement = int(parametres['duree_paiement'])
        duree_service = int(parametres['duree_service'])
        
        # Déterminer le code produit selon le montant de la rente
        produit_code = self._determiner_code_produit(montant_rente)
        print(montant_rente, age_parent, age_enfant,duree_service, duree_paiement,produit_code)
        
        # Recherche dans les tables de primes
        try:
            prime_data = self._trouver_primes(
                age_parent,
                duree_paiement,
                duree_service,
                produit_code
            )
            
            if not prime_data:
                raise ValueError(
                    f"Données Études manquantes pour âge parent {age_parent}, "
                    f"durée paiement {duree_paiement}, durée service {duree_service}"
                )
            
            prime_unique = prime_data['prime_unique']
            prime_annuelle = prime_data['prime_annuelle']
            taux_mensuel = prime_data['taux_mensuel']
            
        except Exception as e:
            raise ValueError(f"Erreur lors de la recherche des primes: {str(e)}")
        
        # Calcul de la prime mensuelle
        prime_mensuelle = montant_rente * taux_mensuel
        
        # Calcul des dates de service
        debut_service = age_enfant + duree_paiement
        fin_service = debut_service + duree_service

        periodicite = parametres.get('periodicite', 'mensuelle')
        frais_accesoires = 1000
        montant_cotisation = 0
        cotisation_totale = 0
        if periodicite == "mensuelle":
            montant_cotisation = prime_mensuelle
            cotisation_totale = prime_mensuelle + frais_accesoires
        elif periodicite == "annuelle":
            cotisation_totale = prime_annuelle + frais_accesoires
            montant_cotisation = prime_annuelle
        else:
            cotisation_totale = prime_unique + frais_accesoires
            montant_cotisation = prime_unique
        
        # Préparer les résultats
        resultats = {
            'prime_unique': prime_unique,
            'prime_annuelle': prime_annuelle,
            'prime_mensuelle': prime_mensuelle,
            'montant_rente_annuel': montant_rente,
            'taux_mensuel_utilise': taux_mensuel,
            'age_parent': age_parent,
            'age_enfant': age_enfant,
            'duree_paiement': duree_paiement,
            'duree_service': duree_service,
            'debut_service': debut_service,
            'fin_service': fin_service,
            'produit_code': produit_code,
            'duree_total_contrat': duree_paiement + duree_service,
            'montant_cotisation': montant_cotisation,
            'cotisation_totale': cotisation_totale,
            'frais_accessoires': frais_accesoires,
            'details_calcul': {
                'formule_prime_mensuelle': f'{float(montant_rente)} × {float(taux_mensuel)}',
                'age_debut_service': debut_service,
                'age_fin_service': fin_service,
            }
        }
        
        # Formater pour l'API
        return self.formater_resultat(resultats)
    
    def _determiner_code_produit(self, montant_rente: Decimal) -> str:
        """
        Détermine le code produit selon le montant de la rente
        
        Args:
            montant_rente: Montant de la rente annuelle
        
        Returns:
            Code produit (ex: "100k", "2M", etc.)
        """
        # Mapping basé sur le code Python fourni
        mapping = {
            100000: "100k",
            200000: "200k",
            300000: "300k",
            500000: "500k",
            750000: "750k",
            1000000: "1M",
            1500000: "1.5M",
            2000000: "2M",
            2500000: "2.5M",
            3000000: "3M",
        }
        
        montant_int = int(montant_rente)
        return mapping.get(montant_int, "custom")
    
    def _trouver_primes(
        self,
        age_parent: int,
        duree_paiement: int,
        duree_service: int,
        produit_code: str
    ) -> Dict[str, Any]:
        """
        Trouve les primes dans les tables TablePrimesEtudes et TableTauxMensuels
        
        Args:
            age_parent: Âge du parent
            duree_paiement: Durée de paiement
            duree_service: Durée de service
            produit_code: Code produit
        
        Returns:
            Dictionnaire avec prime_unique, prime_annuelle, taux_mensuel
            None si non trouvé
        """
    
        
        # Recherche exacte
        try:
            # Prime unique
            prime_unique_obj = TablePrimesEtudes.objects.get(
                age=age_parent,
                duree_paiement=duree_paiement,
                duree_rente=duree_service,
                type_prime='UNIQUE',
                produit=produit_code
            )
            
            # Prime annuelle
            prime_annuelle_obj = TablePrimesEtudes.objects.get(
                age=age_parent,
                duree_paiement=duree_paiement,
                duree_rente=duree_service,
                type_prime='ANNUELLE',
                produit=produit_code
            )
            
            # Taux mensuel
            taux_mensuel_obj = TableTauxMensuels.objects.get(
                age=age_parent,
                duree_paiement=duree_paiement,
                duree_rente=duree_service,
                produit="NSIA-ETUDES"
            )
            
            return {
                'prime_unique': prime_unique_obj.montant,
                'prime_annuelle': prime_annuelle_obj.montant,
                'taux_mensuel': taux_mensuel_obj.taux,
            }
        
        except (TablePrimesEtudes.DoesNotExist, TableTauxMensuels.DoesNotExist):
            # Recherche avec interpolation
            return None
            """return self._recherche_avec_interpolation(
                age_parent,
                duree_paiement,
                duree_service,
                produit_code
            )"""
    
    def _recherche_avec_interpolation(
        self,
        age_parent: int,
        duree_paiement: int,
        duree_service: int,
        produit_code: str
    ) -> Dict[str, Any]:
        """
        Recherche avec interpolation si données exactes non trouvées
        
        Args:
            age_parent: Âge du parent
            duree_paiement: Durée de paiement
            duree_service: Durée de service
            produit_code: Code produit
        
        Returns:
            Dictionnaire avec prime_unique, prime_annuelle, taux_mensuel
            None si aucune donnée proche trouvée
        """
        
        
        try:
            # Rechercher les données les plus proches (±5 ans pour âge, ±2 ans pour durées)
            prime_unique_proche = TablePrimesEtudes.objects.filter(
                age__gte=age_parent - 5,
                age__lte=age_parent + 5,
                duree_paiement__gte=duree_paiement - 2,
                duree_paiement__lte=duree_paiement + 2,
                duree_rente__gte=duree_service - 1,
                duree_rente__lte=duree_service + 1,
                type_prime='UNIQUE',
                produit=produit_code
            ).order_by('age', 'duree_paiement', 'duree_rente').first()
            
            prime_annuelle_proche = TablePrimesEtudes.objects.filter(
                age__gte=age_parent - 5,
                age__lte=age_parent + 5,
                duree_paiement__gte=duree_paiement - 2,
                duree_paiement__lte=duree_paiement + 2,
                duree_rente__gte=duree_service - 1,
                duree_rente__lte=duree_service + 1,
                type_prime='ANNUELLE',
                produit=produit_code
            ).order_by('age', 'duree_paiement', 'duree_rente').first()
            
            taux_proche = TableTauxMensuels.objects.filter(
                age__gte=age_parent - 5,
                age__lte=age_parent + 5,
                duree_paiement__gte=duree_paiement - 2,
                duree_paiement__lte=duree_paiement + 2,
                duree_rente__gte=duree_service - 1,
                duree_rente__lte=duree_service + 1,
                produit="NSIA-ETUDES"
            ).order_by('age', 'duree_paiement', 'duree_rente').first()
            
            if prime_unique_proche and prime_annuelle_proche and taux_proche:
                return {
                    'prime_unique': prime_unique_proche.montant,
                    'prime_annuelle': prime_annuelle_proche.montant,
                    'taux_mensuel': taux_proche.taux,
                }
        
        except Exception as e:
            print(f"Erreur interpolation Études: {e}")
        
        return None