"""
Calculateur pour l'assurance Mobateli Sur Mesure
Reproduction fidèle du simulateur Excel (Simulateur MOBATELI.xlsm)

Deux volets :

  Volet DTC (Sub capital dans le VBA) :
    - Input  : prime souhaitée + date_naissance + date_souscription + durée
    - Calcul : capital = prime / ratio_PA  (calcul actuariel inverse via CIMA_H)
    - Output : capital DTC/IAD correspondant à la prime

  Volet DTC+FF (Sub capital2 dans le VBA) :
    - Input  : capital (paliers prédéfinis) + date_naissance + date_souscription
    - Calcul : lookup forfaitaire par (tranche_âge × capital) — primes hardcodées
    - FF     : toujours 4 000 000 FCFA (1M adhérent + 1M conjoint + 500K × 4 enfants)
    - Output : prime forfaitaire + frais funéraires

Applicable à toutes les banques ayant le produit Mobateli en convention.
"""
from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import date

from apps.tarification.models import TableCIMA_H, TablePrimesMobateli
from .base import CalculateurBase


class CalculateurMobateliSurMesure(CalculateurBase):
    """
    Calculateur Mobateli Sur Mesure — reproduction fidèle du XLSM.
    Coexiste avec le CalculateurMobateli forfaitaire.
    """
    PRODUIT_CODE = 'mobateli'

    # --- Paramètres actuariels par défaut (feuille Param du XLSM) ---
    PARAMS_DEFAUT = {
        # Chargements (Param!E8, E9, E10)
        'a': Decimal('0.12'),       # Frais d'acquisition
        'gp': Decimal('0.15'),      # Frais de gestion sur prime
        'e': Decimal('0.03'),       # Frais d'encaissement

        # Coefficients de fractionnement (Param C19-C21)
        'f2': Decimal('0.02'),      # Semestriel
        'f4': Decimal('0.03'),      # Trimestriel
        'f12': Decimal('0.04'),     # Mensuel

        # Frais accessoires
        'frais_accessoires': Decimal('2500'),

        # FF = toujours 4 000 000 FCFA (fixe dans le VBA)
        'capital_ff': Decimal('4000000'),

        # Limites DTC (feuilles PA/PU : âges 20–70, durées 1–5)
        'age_min': 20,
        'age_max': 70,
        'duree_min': 1,
        'duree_max': 5,

        # Limites DTC+FF (VBA : âge ≤ 64)
        'age_max_ff': 64,
    }

    # --- Table de primes DTC+FF hardcodée (Sub capital2 du VBA) ---
    # Clé : (age_bracket, capital) → prime (hors accessoires)
    # age_bracket : 'lte45', '46_54', '55_64'
    TABLE_PRIMES_FF = {
        ('lte45', 2000000): 34900,
        ('46_54', 2000000): 45100,
        ('55_64', 2000000): 65100,
        ('lte45', 5000000): 50800,
        ('46_54', 5000000): 76300,
        ('55_64', 5000000): 126300,
        ('lte45', 7500000): 50800,
        ('46_54', 7500000): 76300,
        ('55_64', 7500000): 126300,
    }

    def __init__(self, banque):
        super().__init__(banque)
        self._params = None

    @property
    def params(self) -> Dict[str, Any]:
        """
        Charge les paramètres actuariels.
        Priorité : ProduitBanque.parametres['sur_mesure'] > défaut NSIA.
        """
        if self._params is not None:
            return self._params

        params = dict(self.PARAMS_DEFAUT)

        # Charger les overrides depuis ProduitBanque.parametres
        from apps.core.models import ProduitBanque
        try:
            pb = ProduitBanque.objects.get(
                banque=self.banque_tarification,
                produit__code=self.PRODUIT_CODE,
                est_actif=True,
            )
            overrides = (pb.parametres or {}).get('sur_mesure', {})
            for key, val in overrides.items():
                if key in params:
                    if isinstance(params[key], Decimal):
                        params[key] = Decimal(str(val))
                    elif isinstance(params[key], int):
                        params[key] = int(val)
        except ProduitBanque.DoesNotExist:
            pass

        self._params = params
        return self._params

    # ================================================================
    # CALCUL DE L'ÂGE — âge réel (au dernier anniversaire)
    # ================================================================

    @staticmethod
    def _calculer_age_vba(date_naissance: date, date_souscription: date) -> int:
        """
        Âge RÉEL à la date de souscription (au dernier anniversaire).

        NB : l'ancienne implémentation reproduisait DateDiff("yyyy") du VBA
        (soustraction d'années seule), ce qui renvoyait un âge ne correspondant
        pas à la date de naissance. Corrigé pour rester cohérent avec le reste
        du système (serializers + BaseCalculateur.calculer_age).
        """
        return (
            date_souscription.year - date_naissance.year
            - ((date_souscription.month, date_souscription.day)
               < (date_naissance.month, date_naissance.day))
        )

    # ================================================================
    # VALIDATION
    # ================================================================

    def valider_parametres(self, parametres: Dict[str, Any]) -> None:
        volet = parametres.get('volet')
        if volet not in ('dtc', 'dtc_ff'):
            raise ValueError("Le volet doit être 'dtc' ou 'dtc_ff'")

        if 'date_naissance' not in parametres:
            raise ValueError("Le champ 'date_naissance' est obligatoire")

        if volet == 'dtc':
            self._valider_dtc(parametres)
        else:
            self._valider_dtc_ff(parametres)

    def _valider_dtc(self, parametres: Dict[str, Any]) -> None:
        """Validation volet DTC : prime → capital."""
        p = self.params

        if 'prime' not in parametres:
            raise ValueError("Le champ 'prime' est obligatoire pour le volet DTC")

        prime = parametres['prime']
        if not isinstance(prime, (int, float, Decimal)) or Decimal(str(prime)) <= 0:
            raise ValueError("La prime doit être un nombre positif")

        age = parametres.get('age')
        if age is None:
            raise ValueError("Le champ 'age' est obligatoire")
        if not isinstance(age, int) or age < p['age_min'] or age > p['age_max']:
            raise ValueError(f"L'âge doit être entre {p['age_min']} et {p['age_max']} ans")

        duree = parametres.get('duree', 1)
        if not isinstance(duree, int) or duree < p['duree_min'] or duree > p['duree_max']:
            raise ValueError(f"La durée doit être entre {p['duree_min']} et {p['duree_max']} ans")

    def _valider_dtc_ff(self, parametres: Dict[str, Any]) -> None:
        """Validation volet DTC+FF : capital → prime."""
        p = self.params

        if 'capital' not in parametres:
            raise ValueError("Le champ 'capital' est obligatoire pour le volet DTC+FF")

        capital = int(parametres['capital'])
        age = parametres.get('age')
        if age is None:
            raise ValueError("Le champ 'age' est obligatoire")

        if age > p['age_max_ff']:
            raise ValueError(f"L'âge maximum pour DTC+FF est {p['age_max_ff']} ans")

        # Vérifier que le capital est dans les paliers acceptés
        # D'abord chercher dans la table DB (par banque), sinon table VBA
        capitaux_db = self._get_capitaux_ff_disponibles()
        if capitaux_db:
            if capital not in capitaux_db:
                caps_str = ', '.join(f"{c:,}" for c in sorted(capitaux_db))
                raise ValueError(
                    f"Le capital DTC+FF doit être l'une des valeurs suivantes : {caps_str} FCFA"
                )
        else:
            capitaux_vba = sorted(set(c for _, c in self.TABLE_PRIMES_FF.keys()))
            if capital not in capitaux_vba:
                caps_str = ', '.join(f"{c:,}" for c in capitaux_vba)
                raise ValueError(
                    f"Le capital DTC+FF doit être l'une des valeurs suivantes : {caps_str} FCFA"
                )

    # ================================================================
    # CALCUL PRINCIPAL
    # ================================================================

    def calculer(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        self.valider_parametres(parametres)

        volet = parametres['volet']
        if volet == 'dtc':
            return self._calculer_dtc(parametres)
        else:
            return self._calculer_dtc_ff(parametres)

    # ================================================================
    # VOLET DTC : prime → capital (calcul actuariel inverse)
    # Reproduction de Sub capital() du VBA + GoalSeek
    # ================================================================

    def _calculer_dtc(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        """
        Volet DTC : l'assuré choisit une prime, on calcule le capital couvert.

        Logique Excel :
          1. PA!G2 = capital (variable)
          2. PA formule : PA = Capital × (Mx - Mx+n) / (Nx - Nx+n) / (1-a-gp-e)
          3. GoalSeek : trouver capital tel que PA = prime_input
          => capital = prime / [(Mx - Mx+n) / (Nx - Nx+n) / (1-a-gp-e)]
        """
        prime_input = self.convertir_en_decimal(parametres['prime'])
        age = int(parametres['age'])
        duree = int(parametres.get('duree', 1))
        type_prime = parametres.get('type_prime', 'annuelle')
        p = self.params

        # Récupérer CIMA_H
        cima_x = self._get_cima(age)
        cima_xn = self._get_cima(age + duree)

        if not cima_x or not cima_xn:
            raise ValueError(
                f"Données CIMA_H manquantes pour l'âge {age} ou {age + duree}"
            )

        Mx = cima_x.Mx
        Mx_n = cima_xn.Mx
        Dx = cima_x.Dx
        Nx = cima_x.Nx
        Nx_n = cima_xn.Nx

        # Dénominateur des chargements
        denominateur = Decimal('1') - p['a'] - p['gp'] - p['e']

        # Calcul du ratio (prime pour 1 FCFA de capital)
        if type_prime == 'unique':
            # PU = Capital × (Mx - Mx+n) / Dx / denominateur
            # => Capital = PU / [(Mx - Mx+n) / Dx / denominateur]
            ratio = (Mx - Mx_n) / Dx / denominateur
            formule = f"Prime / [(M{age} - M{age+duree}) / D{age} / {float(denominateur)}]"
        else:
            # PA = Capital × (Mx - Mx+n) / (Nx - Nx+n) / denominateur
            # => Capital = PA / [(Mx - Mx+n) / (Nx - Nx+n) / denominateur]
            delta_N = Nx - Nx_n
            if delta_N == 0:
                raise ValueError("Division par zéro : Nx - N(x+n) = 0")
            ratio = (Mx - Mx_n) / delta_N / denominateur
            formule = f"Prime / [(M{age} - M{age+duree}) / (N{age} - N{age+duree}) / {float(denominateur)}]"

        # Capital = prime / ratio (équivalent du GoalSeek)
        capital = prime_input / ratio
        capital = self.arrondir(capital)

        frais_accessoires = p['frais_accessoires']
        prime_totale = prime_input + frais_accessoires

        resultats = {
            'produit': 'Mobateli Sur Mesure',
            'volet': 'dtc',
            'volet_label': 'DTC (Décès Toutes Causes / IAD)',
            'type_prime': type_prime,
            'type_prime_label': 'Prime Unique' if type_prime == 'unique' else 'Prime Annuelle',
            'banque': self.banque.code_banque,

            # Entrées
            'prime': prime_input,
            'age': age,
            'duree': duree,

            # Résultats (fidèle à l'Excel)
            'capital_dtc_iad': capital,
            'frais_accessoires': frais_accessoires,
            'prime_totale': prime_totale,

            # Détails du calcul
            'details_calcul': {
                'table_mortalite': 'CIMA_H',
                'Mx': Mx,
                'Mx_n': Mx_n,
                'Dx': Dx,
                'Nx': Nx,
                'Nx_n': Nx_n,
                'ratio': ratio,
                'chargements': {
                    'a': p['a'],
                    'gp': p['gp'],
                    'e': p['e'],
                    'denominateur': denominateur,
                },
                'formule': formule,
            },
        }

        return self.formater_resultat(resultats)

    # ================================================================
    # VOLET DTC+FF : capital → prime (lookup forfaitaire)
    # Reproduction de Sub capital2() du VBA
    # ================================================================

    def _calculer_dtc_ff(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        """
        Volet DTC+FF : l'assuré choisit un capital, on donne la prime forfaitaire.

        Logique VBA (Sub capital2) :
          - Primes hardcodées par (tranche_age, capital)
          - FF = toujours 4 000 000 FCFA
          - Capital total = capital_dtc + 4 000 000
          - Prime totale = prime + 2 500
        """
        capital = int(parametres['capital'])
        age = int(parametres['age'])
        p = self.params

        # Chercher la prime : d'abord en DB (TablePrimesMobateli), sinon table VBA
        prime = self._chercher_prime_ff_db(capital, age)

        if prime is None:
            prime = self._chercher_prime_ff_vba(capital, age)

        if prime is None:
            raise ValueError(
                f"Aucune prime trouvée pour capital {capital:,} FCFA, âge {age} ans"
            )

        prime = Decimal(str(prime))
        capital_ff = p['capital_ff']
        capital_total = Decimal(str(capital)) + capital_ff
        frais_accessoires = p['frais_accessoires']
        prime_totale = prime + frais_accessoires

        resultats = {
            'produit': 'Mobateli Sur Mesure',
            'volet': 'dtc_ff',
            'volet_label': 'DTC + Frais Funéraires',
            'banque': self.banque.code_banque,

            # Entrées
            'capital_dtc': Decimal(str(capital)),
            'age': age,

            # FF (fixe)
            'frais_funeraires': {
                'total': capital_ff,
                'detail': "1M adhérent + 1M conjoint + 500K × 4 enfants",
            },

            # Résultats (fidèle à l'Excel)
            'capital_total': capital_total,
            'prime': prime,
            'frais_accessoires': frais_accessoires,
            'prime_totale': prime_totale,
        }

        return self.formater_resultat(resultats)

    # ================================================================
    # MÉTHODES PRIVÉES
    # ================================================================

    def _get_cima(self, age: int) -> Optional[TableCIMA_H]:
        """Récupère une ligne de la table CIMA_H par âge."""
        try:
            return TableCIMA_H.objects.get(x=age)
        except TableCIMA_H.DoesNotExist:
            return None

    def _get_tranche_age_ff(self, age: int) -> Optional[str]:
        """Détermine la tranche d'âge pour DTC+FF (logique VBA)."""
        if age <= 45:
            return 'lte45'
        elif age <= 54:
            return '46_54'
        elif age <= 64:
            return '55_64'
        return None

    def _chercher_prime_ff_db(self, capital: int, age: int) -> Optional[int]:
        """
        Cherche la prime DTC+FF dans TablePrimesMobateli (par banque).
        Retourne None si pas trouvé.
        """
        try:
            prime_obj = TablePrimesMobateli.objects.get(
                banque=self.banque_tarification,
                capital_dtc_iad=Decimal(str(capital)),
                age_min__lte=age,
                age_max__gte=age,
                actif=True,
            )
            return int(prime_obj.prime_nette)
        except TablePrimesMobateli.DoesNotExist:
            return None
        except TablePrimesMobateli.MultipleObjectsReturned:
            prime_obj = TablePrimesMobateli.objects.filter(
                banque=self.banque_tarification,
                capital_dtc_iad=Decimal(str(capital)),
                age_min__lte=age,
                age_max__gte=age,
                actif=True,
            ).first()
            return int(prime_obj.prime_nette) if prime_obj else None

    def _chercher_prime_ff_vba(self, capital: int, age: int) -> Optional[int]:
        """
        Cherche la prime DTC+FF dans la table hardcodée du VBA.
        Fallback quand pas de données en DB pour cette banque.
        """
        tranche = self._get_tranche_age_ff(age)
        if tranche is None:
            return None
        return self.TABLE_PRIMES_FF.get((tranche, capital))

    def _get_capitaux_ff_disponibles(self):
        """
        Retourne la liste des capitaux DTC+FF disponibles pour cette banque.
        Cherche d'abord en DB, sinon retourne None (utilisera la table VBA).
        """
        capitaux = list(
            TablePrimesMobateli.objects.filter(
                banque=self.banque_tarification,
                actif=True,
            ).values_list('capital_dtc_iad', flat=True).distinct()
        )
        if capitaux:
            return [int(c) for c in capitaux]
        return None
