"""
Calculateur pour l'assurance Confort Retraite
Phase 3.2 : Simulateur Retraite
Adapté depuis le code Python fourni dans etudes_retraite.py
"""
from decimal import Decimal
from typing import Dict, Any
from .base import CalculateurBase


class CalculateurRetraite(CalculateurBase):
    """
    Calculateur pour le produit CONFORT RETRAITE
    Reproduction exacte de la logique du code Python fourni
    """
    PRODUIT_CODE = 'retraite'

    def __init__(self, banque):
        """
        Initialise le calculateur avec paramètres techniques

        Args:
            banque: Instance du modèle Banque
        """
        super().__init__(banque)
    
        
        # Paramètres techniques (depuis le code Python fourni)
        self.i = Decimal('0.035')    # Taux d'intérêt technique
        self.aa = Decimal('0.35')    # Frais d'acquisition
        self.gp1 = Decimal('0.10')   # Frais de gestion 1ère année
        self.gp2 = Decimal('0.05')   # Frais de gestion 2e-10e année
        self.gp11 = Decimal('0.03')  # Frais de gestion après 11e année
        self.ge = Decimal('0.01')    # Frais de gestion sur épargne
        self.gd = Decimal('0.20')    # Frais de gestion sur prime décès
        self.frais_accessoires = Decimal('1000')  # Frais forfaitaires
    
    def valider_parametres(self, parametres: Dict[str, Any]) -> None:
        """
        Valide les paramètres d'entrée pour la retraite
        
        Paramètres attendus:
            - prime_periodique_commerciale (PPC): Prime périodique commerciale
            - capital_deces (K): Capital décès (optionnel, défaut 0)
            - duree (n): Durée en années
            - age (y): Âge de l'assuré
            - periodicite (per_C): Périodicité (A/M/T/S)
        
        Raises:
            ValueError: Si un paramètre est manquant ou invalide
        """
        # Champs requis
        champs_requis = ['prime_periodique_commerciale', 'duree', 'age', 'periodicite']
        for champ in champs_requis:
            if champ not in parametres:
                raise ValueError(f"Le champ '{champ}' est obligatoire")
        
        # Valider PPC
        ppc = parametres['prime_periodique_commerciale']
        if not isinstance(ppc, (int, float, Decimal)) or ppc <= 0:
            raise ValueError("La prime périodique commerciale doit être un nombre positif")
        
        # Valider durée
        duree = parametres['duree']
        if not isinstance(duree, int) or duree < 1 or duree > 40:
            raise ValueError("La durée doit être entre 1 et 40 ans")
        
        # Valider âge
        age = parametres['age']
        if not isinstance(age, int) or age < 18 or age > 65:
            raise ValueError("L'âge doit être entre 18 et 65 ans")
        
        # Valider périodicité
        periodicite = parametres['periodicite']
        if periodicite not in ['A', 'M', 'T', 'S']:
            raise ValueError("La périodicité doit être A (Annuelle), M (Mensuelle), T (Trimestrielle) ou S (Semestrielle)")
        
        # Capital décès (optionnel)
        if 'capital_deces' not in parametres:
            parametres['capital_deces'] = 0
        
        capital_deces = parametres['capital_deces']
        if not isinstance(capital_deces, (int, float, Decimal)) or capital_deces < 0:
            raise ValueError("Le capital décès doit être un nombre positif ou zéro")
    
    def calculer(self, parametres: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule une simulation RETRAITE
        Reproduction exacte de la logique du code Python fourni
        
        Args:
            parametres: Dictionnaire des paramètres validés
        
        Returns:
            Dictionnaire des résultats de calcul
        """
        # Validation
        self.valider_parametres(parametres)
        
        # Extraction des paramètres (exactement comme le code Python)
        PPC = self.convertir_en_decimal(parametres['prime_periodique_commerciale'])
        K = self.convertir_en_decimal(parametres.get('capital_deces', 0))
        n = int(parametres['duree'])
        y = int(parametres['age'])
        per_C = parametres['periodicite']
        
        # Récupération des valeurs CIMA H
        try:
            cima_data = self._get_cima_h_data(y)
            Ny = cima_data['Nx']
            My = cima_data['Mx']
            Dy = cima_data['Dx']
            
            cima_data_n = self._get_cima_h_data(y + n)
            Nyn = cima_data_n['Nx']
            Myn = cima_data_n['Mx']
            Dyn = cima_data_n['Dx']
        except Exception as e:
            raise ValueError(f"Données CIMA H manquantes pour l'âge {y} ou {y + n}: {e}")
        
        # Détermination de la période (exactement comme le code Python)
        if per_C == "A":
            p = 1
        elif per_C == "M":
            p = 12
        elif per_C == "T":
            p = 4
        elif per_C == "S":
            p = 2
        else:
            p = 0
        
        # Calcul des primes décès (exactement comme le code Python)
        PPPdec = K * ((My - Myn) / (Ny - Nyn)) / p
        PPIdec = (K * (1 + self.gd) * ((My - Myn) / (Ny - Nyn))) / p
        PPCdec = PPIdec
        
        # Primes épargne (exactement comme le code Python)
        PPIep = PPC * (1 - self.aa) - PPCdec
        PPPep = PPC * (1 - self.aa - 0) - PPCdec  # gp = 0 initialement
        
        # Calcul des taux d'intérêt équivalents (exactement comme le code Python)
        im = ((1 + self.i) * (1 - self.ge)) ** (Decimal('1') / 12) - 1
        it = ((1 + self.i) * (1 - self.ge)) ** (Decimal('1') / 4) - 1
        ise = ((1 + self.i) * (1 - self.ge)) ** (Decimal('1') / 2) - 1
        ian = ((1 + self.i) * (1 - self.ge)) ** (Decimal('1') / 1) - 1
        
        # Sélection du taux selon la périodicité (exactement comme le code Python)
        if p == 12:
            inte = im
            nbe = n * 12
        elif p == 4:
            inte = it
            nbe = n * 4
        elif p == 2:
            inte = ise
            nbe = n * 2
        else:  # p == 1
            inte = ian
            nbe = n * 1
        
        # Variables d'accumulation (exactement comme le code Python)
        som = Decimal('0')
        som1 = Decimal('0')
        som2 = Decimal('0')
        som3 = Decimal('0')
        
        # Calcul selon la périodicité (REPRODUCTION EXACTE du code Python)
        if p == 12:  # Mensuelle
            for j in range(nbe):
                if j < 12:
                    gp = self.gp1
                    prime = PPC * (1 - self.aa - gp) - PPCdec
                    som += prime * (1 + im) ** (nbe - j)
                elif j >= 12 and j < 120:
                    gp = self.gp2
                    prime = PPC * (1 - gp) - PPCdec
                    som1 += prime * (1 + im) ** (nbe - j)
                elif j >= 120:
                    gp = self.gp11
                    prime = PPC * (1 - gp) - PPCdec
                    som2 += prime * (1 + im) ** (nbe - j)
            
            som3 = som + som1 + som2
        
        elif p == 1:  # Annuelle
            for j in range(nbe):
                if j < 1:
                    gp = self.gp1
                    prime = PPC * (1 - self.aa - gp) - PPCdec
                    som += prime * (1 + ian) ** (nbe - j)
                elif j >= 1 and j < 10:
                    gp = self.gp2
                    prime = PPC * (1 - gp) - PPCdec
                    som1 += prime * (1 + ian) ** (nbe - j)
                elif j >= 10:
                    gp = self.gp11
                    prime = PPC * (1 - gp) - PPCdec
                    som2 += prime * (1 + ian) ** (nbe - j)
            
            som3 = som + som1 + som2
        
        elif p == 4:  # Trimestrielle
            for j in range(nbe):
                if j < 4:
                    gp = self.gp1
                    prime = PPC * (1 - self.aa - gp) - PPCdec
                    som += prime * (1 + it) ** (nbe - j)
                elif j >= 4 and j < 40:
                    gp = self.gp2
                    prime = PPC * (1 - gp) - PPCdec
                    som1 += prime * (1 + it) ** (nbe - j)
                elif j >= 40:
                    gp = self.gp11
                    prime = PPC * (1 - gp) - PPCdec
                    som2 += prime * (1 + it) ** (nbe - j)
            
            som3 = som + som1 + som2
        
        elif p == 2:  # Semestrielle
            for j in range(nbe):
                if j < 2:
                    gp = self.gp1
                    prime = PPC * (1 - self.aa - gp) - PPCdec
                    som += prime * (1 + ise) ** (nbe - j)
                elif j >= 2 and j < 20:
                    gp = self.gp2
                    prime = PPC * (1 - gp) - PPCdec
                    som1 += prime * (1 + ise) ** (nbe - j)
                elif j >= 20:
                    gp = self.gp11
                    prime = PPC * (1 - gp) - PPCdec
                    som2 += prime * (1 + ise) ** (nbe - j)
            
            som3 = som + som1 + som2
        
        # Résultats finaux (exactement comme le code Python)
        capital_garanti = self.arrondir(som3)
        
        # Déterminer le label de périodicité
        periodicite_labels = {
            'A': 'Annuelle',
            'M': 'Mensuelle',
            'T': 'Trimestrielle',
            'S': 'Semestrielle'
        }
        
        resultats = {
            'prime_periodique_commerciale': self.arrondir(PPC + self.frais_accessoires),
            'capital_garanti': capital_garanti,
            'prime_deces': self.arrondir(PPCdec),
            'prime_epargne': self.arrondir(PPIep),
            'prime_totale': self.arrondir(PPC * nbe),
            'periodicite': per_C,
            'periodicite_libelle': periodicite_labels.get(per_C, per_C),
            'age': y,
            'duree': n,
            'nombre_periodes': nbe,
            'capital_deces': K,
            'frais_accessoires': self.frais_accessoires,
            'details_calcul': {
                'som': float(som),
                'som1': float(som1),
                'som2': float(som2),
                'som3': float(som3),
                'taux_utilise': float(inte),
                'nombre_periodes': nbe,
                'taux_interet_technique': float(self.i),
                'frais_acquisition': float(self.aa),
                'frais_gestion_1': float(self.gp1),
                'frais_gestion_2_10': float(self.gp2),
                'frais_gestion_11plus': float(self.gp11),
            }
        }
        
        # Formater pour l'API
        return self.formater_resultat(resultats)
    
    def _get_cima_h_data(self, age: int) -> Dict[str, Decimal]:
        """
        Récupère les données CIMA H depuis la BDD avec cache
        
        Args:
            age: Âge pour lequel récupérer les données
        
        Returns:
            Dictionnaire avec Nx, Mx, Dx, lx, dx, qx, Cx
        
        Raises:
            ValueError: Si les données n'existent pas pour cet âge
        """
        from apps.tarification.models import TableCIMA_H
        
        # Cache simple pour éviter les requêtes répétées
        if not hasattr(self, '_cima_h_cache'):
            self._cima_h_cache = {}
        
        if age not in self._cima_h_cache:
            try:
                cima_data = TableCIMA_H.objects.get(x=age)
                self._cima_h_cache[age] = {
                    'Nx': cima_data.Nx,
                    'Mx': cima_data.Mx,
                    'Dx': cima_data.Dx,
                    'lx': cima_data.lx,
                    'dx': cima_data.dxx,
                    'qx': cima_data.qx,
                    'Cx': cima_data.Cx
                }
            except TableCIMA_H.DoesNotExist:
                raise ValueError(f"Données CIMA H introuvables pour l'âge {age}")
        
        return self._cima_h_cache[age]