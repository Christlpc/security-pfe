"""
Calculateur pour l'assurance Emprunteur
Phase 3 : Simulateur Emprunteur

Stratégies de calcul configurables via ProduitBanque.parametres :
    - strategie_taux : "par_mois" | "par_annee" | "fixe" (défaut: auto-détection)
    - formule_prime  : "annualisee" | "simple" (défaut: "annualisee")

Quand les paramètres ne sont pas définis, le système auto-détecte la stratégie
en essayant successivement : par_mois → par_annee → fixe.
"""
from decimal import Decimal
from datetime import date, timedelta
from typing import Dict, Any, Optional
import logging

from .base import CalculateurBase

logger = logging.getLogger(__name__)


class CalculateurEmprunteur(CalculateurBase):
    """
    Calculateur pour le produit Assurance Emprunteur (ADI)

    Les deux axes de configuration par banque :
    1. strategie_taux → comment chercher le taux dans TableTauxEmprunteur
       - "par_mois"  : recherche par duree_mois (ex: Charden)
       - "par_annee" : recherche par duree_annees arrondie (ex: BGFI, BOA)
       - "fixe"      : taux unique par tranche d'âge, sans durée (ex: Ecobank, CDCO)
       - non défini  : auto-détection (essaie les 3 dans l'ordre)

    2. formule_prime → comment calculer la prime nette à partir du taux
       - "annualisee" : taux × (montant × durée × modalité) / 12  (formule standard)
       - "simple"     : taux × montant  (formule simplifiée, ex: BGFI, BOA)
       - non défini   : "annualisee" par défaut
    """
    PRODUIT_CODE = 'emprunteur'

    def __init__(self, banque):
        """Initialise et charge la configuration depuis ProduitBanque"""
        super().__init__(banque)
        self._config = self._charger_config()

    def _charger_config(self) -> Dict[str, str]:
        """
        Charge la configuration emprunteur depuis ProduitBanque.parametres.
        Retourne un dict avec strategie_taux et formule_prime.
        Si non configuré, retourne des valeurs par défaut (auto-détection).
        """
        from apps.core.models import ProduitBanque
        try:
            pb = ProduitBanque.objects.get(
                banque=self.banque_tarification,
                produit__code='emprunteur',
                est_actif=True
            )
            return pb.parametres or {}
        except ProduitBanque.DoesNotExist:
            return {}

    def valider_parametres(self, parametres: Dict[str, Any]) -> None:
        """
        Valide les paramètres d'entrée pour l'emprunteur

        Paramètres attendus:
            - montant_pret: Montant du prêt en FCFA
            - duree_mois: Durée du prêt en mois
            - date_naissance: Date de naissance de l'emprunteur
            - date_effet: Date d'effet de l'assurance
            - taux_surprime: Taux de surprime (optionnel, défaut 0)

        Raises:
            ValueError: Si un paramètre est manquant ou invalide
        """
        # Vérifier les champs obligatoires
        champs_requis = ['montant_pret', 'duree_mois', 'date_naissance']
        for champ in champs_requis:
            if champ not in parametres:
                raise ValueError(f"Le champ '{champ}' est obligatoire")

        # Valider montant_pret
        montant_pret = parametres['montant_pret']
        if not isinstance(montant_pret, (int, float, Decimal)) or montant_pret <= 0:
            raise ValueError("Le montant du prêt doit être un nombre positif")

        # Valider duree_mois
        duree_mois = parametres['duree_mois']
        if not isinstance(duree_mois, int) or duree_mois <= 0 or duree_mois > 360:
            raise ValueError("La durée doit être entre 1 et 360 mois")

        # Valider date_naissance
        date_naissance = parametres.get('date_naissance')
        if isinstance(date_naissance, str):
            try:
                date_naissance = date.fromisoformat(date_naissance)
                parametres['date_naissance'] = date_naissance
            except ValueError:
                raise ValueError("Format de date de naissance invalide (attendu: YYYY-MM-DD)")

        if not isinstance(date_naissance, date):
            raise ValueError("La date de naissance doit être une date valide")

        # Valider date_effet (optionnel, défaut aujourd'hui)
        date_effet = parametres.get('date_effet')
        if date_effet:
            if isinstance(date_effet, str):
                try:
                    date_effet = date.fromisoformat(date_effet)
                    parametres['date_effet'] = date_effet
                except ValueError:
                    raise ValueError("Format de date d'effet invalide (attendu: YYYY-MM-DD)")
        else:
            parametres['date_effet'] = date.today()

        # Valider âge
        age = self.calculer_age(date_naissance, parametres['date_effet'])
        if age < 18:
            raise ValueError("L'emprunteur doit avoir au moins 18 ans")
        if age > 64:
            raise ValueError("L'âge limite pour l'assurance emprunteur est 64 ans")

        # Valider taux_surprime (optionnel)
        taux_surprime = parametres.get('taux_surprime', 0)
        if not isinstance(taux_surprime, (int, float, Decimal)) or taux_surprime < 0:
            raise ValueError("Le taux de surprime doit être un nombre positif ou zéro")
        parametres['taux_surprime'] = taux_surprime

    def _get_code_produit_tarif(self, type_assure: str) -> str:
        """
        Retourne le code produit à utiliser pour les requêtes de tarification.

        Pour les banques avec grilles différenciées (ex: Express Union),
        le personnel a un code spécifique 'emprunteur_personnel'.
        Pour toutes les autres banques / type_assure='client', c'est 'emprunteur'.
        """
        types_disponibles = self._config.get('types_tarif', ['client'])
        if type_assure == 'personnel' and 'personnel' in types_disponibles:
            return 'emprunteur_personnel'
        return 'emprunteur'

    def calculer(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule la prime d'assurance emprunteur

        Logique :
        1. Calculer l'âge à la date d'effet
        2. Trouver le taux applicable dans TableTauxEmprunteur
        3. Calculer la prime selon la formule configurée
        4. Ajouter surprime si applicable
        5. Ajouter frais accessoires
        6. Calculer net à débourser
        """
        # Validation
        self.valider_parametres(parametres)

        # Extraction des paramètres
        montant_pret = self.convertir_en_decimal(parametres['montant_pret'])
        duree_mois = int(parametres['duree_mois'])
        date_naissance = parametres['date_naissance']
        date_effet = parametres['date_effet']
        taux_surprime = self.convertir_en_decimal(parametres['taux_surprime'])
        type_assure = parametres.get('type_assure', 'client')

        # 1. Calculer l'âge
        age = self.calculer_age(date_naissance, date_effet)

        # 2. Chercher le taux applicable (en tenant compte du type d'assuré)
        code_produit = self._get_code_produit_tarif(type_assure)
        taux_data = self._trouver_taux_applicable(age, duree_mois, code_produit)

        if not taux_data:
            raise ValueError(
                f"Aucun taux trouvé pour âge {age} ans et durée {duree_mois} mois "
                f"pour la banque {self.banque.nom_complet}"
            )

        taux_pourcentage = taux_data['taux_pourcentage']
        frais_accessoires = taux_data['frais_accessoires']
        tranche_age = taux_data['tranche_age']

        # 3. Calcul de la prime nette selon la formule configurée
        formule = self._config.get('formule_prime', 'annualisee')
        modalite = Decimal('1')  # Paiement unique
        facteur_annualisation = Decimal('12')

        if formule == 'simple':
            # Formule simplifiée : taux × montant
            prime_nette = (taux_pourcentage / 100) * montant_pret
        else:
            # Formule annualisée (standard) : taux × (montant × durée × modalité) / 12
            prime_nette = (taux_pourcentage / 100) * (montant_pret * duree_mois * modalite) / facteur_annualisation

        prime_nette = self.arrondir(prime_nette)

        # 4. Calcul de la surprime
        surprime = Decimal('0')
        if taux_surprime > 0:
            duree_annees = Decimal(duree_mois) / 12
            surprime = montant_pret * (taux_surprime / 100) * duree_annees
            surprime = self.arrondir(surprime)

        # 5. Prime totale
        prime_totale = prime_nette + surprime + frais_accessoires

        # 6. Net à débourser
        net_a_debourser = montant_pret - prime_totale

        # 7. Date de terme (date_effet + duree_mois)
        date_terme = date_effet + timedelta(days=duree_mois * 30)  # Approximation

        # 8. Préparer les résultats
        resultats = {
            # Données de base
            'age_emprunteur': age,
            'montant_pret': montant_pret,
            'duree_mois': duree_mois,
            'duree_annees': round(duree_mois / 12, 2),
            'date_effet': date_effet,
            'date_terme': date_terme,

            # Taux appliqué
            'taux_applique': taux_pourcentage,
            'tranche_age_utilisee': tranche_age,

            # Calculs financiers
            'prime_nette': prime_nette,
            'surprime': surprime,
            'frais_accessoires': frais_accessoires,
            'prime_totale': prime_totale,
            'net_a_debourser': net_a_debourser,

            # Détails de calcul
            'details_calcul': {
                'modalite_paiement': 'Unique',
                'facteur_annualisation': float(facteur_annualisation),
                'taux_surprime_applique': float(taux_surprime),
                'formule_utilisee': formule,
                'type_assure': type_assure,
                'code_produit_tarif': code_produit,
                'strategie_taux': self._config.get('strategie_taux', 'auto'),
                'formule_prime_nette': (
                    f'{float(taux_pourcentage)}% × {float(montant_pret)}'
                    if formule == 'simple'
                    else f'{float(taux_pourcentage)}% × ({float(montant_pret)} × {duree_mois} × {float(modalite)}) / {float(facteur_annualisation)}'
                ),
            }
        }

        # Formater pour l'API
        return self.formater_resultat(resultats)

    def _trouver_taux_applicable(
        self, age: int, duree_mois: int, code_produit: str = 'emprunteur'
    ) -> Optional[Dict[str, Any]]:
        """
        Trouve le taux applicable dans TableTauxEmprunteur.

        Utilise la stratégie configurée dans ProduitBanque.parametres.strategie_taux :
        - "par_mois"  → cherche par duree_mois
        - "par_annee" → cherche par duree_annees (arrondie au supérieur)
        - "fixe"      → ignore la durée, cherche uniquement par âge
        - auto (défaut) → essaie les 3 dans l'ordre

        Args:
            age: Âge de l'emprunteur
            duree_mois: Durée du prêt en mois
            code_produit: Code produit dans la table ('emprunteur' ou 'emprunteur_personnel')

        Returns:
            Dict avec taux_pourcentage, frais_accessoires, tranche_age
            None si aucun taux trouvé
        """
        strategie = self._config.get('strategie_taux')

        # Si stratégie explicitement configurée
        if strategie == 'par_mois':
            return self._chercher_par_mois(age, duree_mois, code_produit)
        elif strategie == 'par_annee':
            return self._chercher_par_annee(age, duree_mois, code_produit)
        elif strategie == 'fixe':
            return self._chercher_fixe(age, code_produit)

        # Auto-détection : essayer les 3 stratégies dans l'ordre
        result = self._chercher_par_mois(age, duree_mois, code_produit)
        if result:
            return result

        result = self._chercher_par_annee(age, duree_mois, code_produit)
        if result:
            return result

        result = self._chercher_fixe(age, code_produit)
        if result:
            return result

        # Aucun taux trouvé
        return None

    def _chercher_par_mois(
        self, age: int, duree_mois: int, code_produit: str = 'emprunteur'
    ) -> Optional[Dict[str, Any]]:
        """Stratégie 1 : Chercher par durée en mois (ex: Charden)"""
        from apps.tarification.models import TableTauxEmprunteur

        taux = TableTauxEmprunteur.objects.filter(
            banque=self.banque_tarification,
            produit=code_produit,
            age_min__lte=age,
            age_max__gte=age,
            duree_mois=duree_mois,
            actif=True
        ).first()

        if taux:
            return self._formater_taux(taux)
        return None

    def _chercher_par_annee(
        self, age: int, duree_mois: int, code_produit: str = 'emprunteur'
    ) -> Optional[Dict[str, Any]]:
        """Stratégie 2 : Chercher par durée en années arrondie (ex: BGFI, BOA)"""
        from apps.tarification.models import TableTauxEmprunteur

        duree_annees = duree_mois / 12
        duree_annees_arrondie = int(duree_annees) if duree_annees == int(duree_annees) else int(duree_annees) + 1

        taux = TableTauxEmprunteur.objects.filter(
            banque=self.banque_tarification,
            produit=code_produit,
            age_min__lte=age,
            age_max__gte=age,
            duree_annees=duree_annees_arrondie,
            actif=True
        ).first()

        if taux:
            return self._formater_taux(taux)
        return None

    def _chercher_fixe(self, age: int, code_produit: str = 'emprunteur') -> Optional[Dict[str, Any]]:
        """Stratégie 3 : Taux fixe par tranche d'âge, pas de durée (ex: Ecobank, CDCO)"""
        from apps.tarification.models import TableTauxEmprunteur

        taux = TableTauxEmprunteur.objects.filter(
            banque=self.banque_tarification,
            produit=code_produit,
            age_min__lte=age,
            age_max__gte=age,
            actif=True
        ).first()

        if taux:
            return self._formater_taux(taux)
        return None

    @staticmethod
    def _formater_taux(taux) -> Dict[str, Any]:
        """Formate un objet TableTauxEmprunteur en dict de résultat"""
        return {
            'taux_pourcentage': taux.taux_pourcentage,
            'frais_accessoires': taux.frais_accessoires,
            'tranche_age': taux.tranche_age,
        }

    def calculer_echeancier(self, parametres: Dict[str, Any]) -> list:
        """
        Génère un échéancier de paiement (optionnel, pour future extension)
        """
        # À implémenter si nécessaire
        pass
