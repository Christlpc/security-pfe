"""
Classes de base pour les calculateurs NSIA
Phase 3 : Simulateurs
"""
from abc import ABC, abstractmethod
from decimal import Decimal
from datetime import datetime, date
from typing import Dict, Any


class CalculateurBase(ABC):
    """
    Classe abstraite de base pour tous les calculateurs
    Définit l'interface commune et les utilitaires partagés
    """

    # Code du produit associé au calculateur (à définir dans chaque sous-classe)
    PRODUIT_CODE = None

    # Préfixe des banques test (miroir). Les banques TEST_XXX utilisent
    # les grilles tarifaires de la banque réelle XXX.
    PREFIX_TEST = 'TEST_'

    def __init__(self, banque):
        """
        Initialise le calculateur avec une banque

        Args:
            banque: Instance du modèle Banque

        Raises:
            ValueError: Si la banque n'a pas accès à ce produit
        """
        self.banque = banque
        self._banque_tarification = None
        if self.PRODUIT_CODE:
            self._verifier_produit_autorise()

    @property
    def banque_tarification(self):
        """
        Retourne la banque à utiliser pour les requêtes de tarification.
        Pour les banques test (TEST_BCI, TEST_ECOBANK...), renvoie la
        banque réelle (BCI, ECOBANK...) dont les grilles tarifaires existent.
        Pour les banques normales, renvoie self.banque.
        """
        if self._banque_tarification is not None:
            return self._banque_tarification

        if self.banque.code_banque.startswith(self.PREFIX_TEST):
            code_reel = self.banque.code_banque[len(self.PREFIX_TEST):]
            from apps.core.models import Banque
            try:
                self._banque_tarification = Banque.objects.get(code_banque=code_reel)
            except Banque.DoesNotExist:
                # Pas de banque réelle → on utilise la banque test elle-même
                self._banque_tarification = self.banque
        else:
            self._banque_tarification = self.banque

        return self._banque_tarification

    def _verifier_produit_autorise(self):
        """
        Vérifie que la banque a accès à ce produit via ProduitBanque.
        Lève ValueError si le produit n'est pas autorisé.
        """
        from apps.core.models import ProduitBanque
        est_autorise = ProduitBanque.objects.filter(
            banque=self.banque,
            produit__code=self.PRODUIT_CODE,
            est_actif=True,
            produit__est_actif=True
        ).exists()
        if not est_autorise:
            raise ValueError(
                f"Le produit '{self.PRODUIT_CODE}' n'est pas autorisé pour la banque {self.banque.code_banque}. "
                f"Contactez l'administrateur NSIA pour activer ce produit."
            )
    
    @abstractmethod
    def calculer(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        """
        Méthode abstraite pour effectuer le calcul
        Doit être implémentée par chaque calculateur spécialisé
        
        Args:
            parametres: Dictionnaire des paramètres d'entrée
        
        Returns:
            Dictionnaire des résultats de calcul
        
        Raises:
            ValueError: Si les paramètres sont invalides
        """
        pass
    
    @abstractmethod
    def valider_parametres(self, parametres: Dict[str, Any]) -> None:
        """
        Valide les paramètres d'entrée
        Doit lever une ValueError si les paramètres sont invalides
        
        Args:
            parametres: Dictionnaire des paramètres à valider
        
        Raises:
            ValueError: Si un paramètre est invalide
        """
        pass
    
    def calculer_age(self, date_naissance: date, date_reference: date = None) -> int:
        """
        Calcule l'âge à une date de référence
        
        Args:
            date_naissance: Date de naissance
            date_reference: Date de référence (aujourd'hui par défaut)
        
        Returns:
            Âge en années
        """
        if date_reference is None:
            date_reference = date.today()
        
        age = date_reference.year - date_naissance.year
        
        # Ajuster si l'anniversaire n'est pas encore passé
        if (date_reference.month, date_reference.day) < (date_naissance.month, date_naissance.day):
            age -= 1
        
        return age
    
    def convertir_en_decimal(self, valeur: Any) -> Decimal:
        """
        Convertit une valeur en Decimal de manière sûre
        
        Args:
            valeur: Valeur à convertir (int, float, str, Decimal)
        
        Returns:
            Decimal
        """
        if isinstance(valeur, Decimal):
            return valeur
        return Decimal(str(valeur))
    
    def arrondir(self, montant: Decimal, decimales: int = 0) -> Decimal:
        """
        Arrondit un montant
        
        Args:
            montant: Montant à arrondir
            decimales: Nombre de décimales (0 par défaut pour FCFA)
        
        Returns:
            Montant arrondi
        """
        if decimales == 0:
            return montant.quantize(Decimal('1'))
        return montant.quantize(Decimal(f'0.{"0" * decimales}'))
    
    def formater_resultat(self, resultat: Dict[str, Any]) -> Dict[str, Any]:
        """
        Formate les résultats pour l'API
        Convertit les Decimal en float, formate les dates, etc.
        
        Args:
            resultat: Dictionnaire des résultats bruts
        
        Returns:
            Dictionnaire formaté
        """
        resultat_formate = {}
        
        for cle, valeur in resultat.items():
            if isinstance(valeur, Decimal):
                # Convertir en float pour JSON
                resultat_formate[cle] = float(valeur)
            elif isinstance(valeur, (date, datetime)):
                # Convertir en string ISO
                resultat_formate[cle] = valeur.isoformat()
            elif isinstance(valeur, dict):
                # Récursif pour les sous-dictionnaires
                resultat_formate[cle] = self.formater_resultat(valeur)
            else:
                resultat_formate[cle] = valeur
        
        return resultat_formate
    
    def get_nom_produit(self) -> str:
        """Retourne le nom du produit calculé"""
        return self.__class__.__name__.replace('Calculateur', '')