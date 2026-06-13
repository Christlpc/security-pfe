# apps/simulateur/services/calculateur_surprime.py
"""
Calculateur de surprime basé sur le questionnaire médical
Logique SIMPLE et AJUSTABLE en attendant les règles NSIA
"""

from decimal import Decimal
from typing import Dict, Tuple


class CalculateurSurprime:
    """
    Calcule le taux de surprime basé sur le questionnaire médical
    
    LOGIQUE TEMPORAIRE :
    - IMC hors norme : +2 à +5 points
    - Habitudes (fumeur, alcool) : +2 à +8 points
    - Antécédents médicaux : +5 à +15 points
    - Score total → Taux surprime (0%, 5%, 10%, 15%, 20%)
    """
    
    # ============================================
    # CONFIGURATION DES BARÈMES (FACILEMENT AJUSTABLE)
    # ============================================
    
    # Barème IMC
    IMC_DENUTRITION = 18.5  # En dessous = dénutrition
    IMC_NORMAL_MAX = 24.9   # Jusqu'à = normal
    IMC_SURPOIDS_MAX = 29.9 # Jusqu'à = surpoids
    # Au-dessus = obésité
    
    POINTS_IMC = {
        'denutrition': 5,   # IMC < 18.5
        'normal': 0,        # IMC 18.5-24.9
        'surpoids': 2,      # IMC 25-29.9
        'obesite': 5,       # IMC ≥ 30
    }
    
    # Barème Fumeur
    POINTS_FUMEUR = {
        'leger': 2,         # < 5 cigarettes/jour
        'modere': 5,        # 5-10 cigarettes/jour
        'lourd': 8,         # > 10 cigarettes/jour
    }
    
    # Barème Alcool
    POINTS_ALCOOL = 3
    
    # Barème Antécédents médicaux
    POINTS_ANTECEDENTS = {
        'faible': 0,        # 0-1 "Oui"
        'modere': 5,        # 2-3 "Oui"
        'eleve': 10,        # 4-5 "Oui"
        'tres_eleve': 15,   # ≥ 6 "Oui"
    }
    
    # Points bonus pour questions critiques
    POINTS_BONUS_PERFUSION = 5
    POINTS_BONUS_TRANSFUSION = 5
    POINTS_BONUS_ESSOUFFLEMENT = 3
    
    # Conversion Score → Taux de surprime
    TRANCHES_SURPRIME = [
        (0, 5, Decimal('0.00'), 'FAIBLE'),          # 0-5 pts → 0%
        (6, 10, Decimal('5.00'), 'MODERE'),         # 6-10 pts → 5%
        (11, 15, Decimal('10.00'), 'ELEVE'),        # 11-15 pts → 10%
        (16, 20, Decimal('15.00'), 'TRES_ELEVE'),   # 16-20 pts → 15%
        (21, 999, Decimal('20.00'), 'TRES_ELEVE'),  # > 20 pts → 20%
    ]
    
    def __init__(self):
        """Initialisation du calculateur"""
        pass
    
    # ============================================
    # CALCUL PRINCIPAL
    # ============================================
    
    def calculer_surprime(self, questionnaire) -> Dict:
        """
        Calcule le taux de surprime à partir du questionnaire médical
        
        Args:
            questionnaire: Instance de QuestionnaireMedical
            
        Returns:
            dict: {
                'score_risque': int,
                'taux_surprime': Decimal,
                'categorie_risque': str,
                'details': dict avec breakdown des points
            }
        """
        # 1. Calcul des points par catégorie
        points_imc = self._calculer_points_imc(questionnaire)
        points_fumeur = self._calculer_points_fumeur(questionnaire)
        points_alcool = self._calculer_points_alcool(questionnaire)
        points_antecedents, nb_antecedents = self._calculer_points_antecedents(questionnaire)
        points_bonus = self._calculer_points_bonus(questionnaire)
        
        # 2. Score total
        score_total = (
            points_imc + 
            points_fumeur + 
            points_alcool + 
            points_antecedents + 
            points_bonus
        )
        
        # 3. Conversion score → taux surprime et catégorie
        taux_surprime, categorie_risque = self._determiner_surprime(score_total)
        
        # 4. Détails pour traçabilité
        details = {
            'imc_valeur': float(questionnaire.imc) if questionnaire.imc else None,
            'imc_categorie': questionnaire.get_categorie_imc(),
            'points_imc': points_imc,
            'fumeur': questionnaire.fumeur,
            'nb_cigarettes': questionnaire.nb_cigarettes_jour,
            'points_fumeur': points_fumeur,
            'consomme_alcool': questionnaire.consomme_alcool,
            'points_alcool': points_alcool,
            'nb_antecedents': nb_antecedents,
            'points_antecedents': points_antecedents,
            'points_bonus': points_bonus,
            'score_total': score_total,
        }
        
        return {
            'score_risque': score_total,
            'taux_surprime': taux_surprime,
            'categorie_risque': categorie_risque,
            'details': details,
        }
    
    # ============================================
    # CALCULS PAR CATÉGORIE
    # ============================================
    
    def _calculer_points_imc(self, questionnaire) -> int:
        """
        Calcule les points de risque liés à l'IMC
        
        Returns:
            int: Points de risque IMC (0-5)
        """
        if not questionnaire.imc:
            return 0
        
        imc = float(questionnaire.imc)
        
        if imc < self.IMC_DENUTRITION:
            return self.POINTS_IMC['denutrition']
        elif imc <= self.IMC_NORMAL_MAX:
            return self.POINTS_IMC['normal']
        elif imc <= self.IMC_SURPOIDS_MAX:
            return self.POINTS_IMC['surpoids']
        else:  # Obésité
            return self.POINTS_IMC['obesite']
    
    def _calculer_points_fumeur(self, questionnaire) -> int:
        """
        Calcule les points de risque liés au tabagisme
        
        Returns:
            int: Points de risque fumeur (0-8)
        """
        if not questionnaire.fumeur:
            return 0
        
        nb_cig = questionnaire.nb_cigarettes_jour or 0
        
        if nb_cig < 5:
            return self.POINTS_FUMEUR['leger']
        elif nb_cig <= 10:
            return self.POINTS_FUMEUR['modere']
        else:  # > 10
            return self.POINTS_FUMEUR['lourd']
    
    def _calculer_points_alcool(self, questionnaire) -> int:
        """
        Calcule les points de risque liés à l'alcool
        
        Returns:
            int: Points de risque alcool (0 ou 3)
        """
        return self.POINTS_ALCOOL if questionnaire.consomme_alcool else 0
    
    def _calculer_points_antecedents(self, questionnaire) -> Tuple[int, int]:
        """
        Calcule les points de risque liés aux antécédents médicaux
        
        Returns:
            tuple: (points, nombre_antecedents)
        """
        nb_antecedents = questionnaire.compter_antecedents()
        
        if nb_antecedents <= 1:
            points = self.POINTS_ANTECEDENTS['faible']
        elif nb_antecedents <= 3:
            points = self.POINTS_ANTECEDENTS['modere']
        elif nb_antecedents <= 5:
            points = self.POINTS_ANTECEDENTS['eleve']
        else:  # ≥ 6
            points = self.POINTS_ANTECEDENTS['tres_eleve']
        
        return points, nb_antecedents
    
    def _calculer_points_bonus(self, questionnaire) -> int:
        """
        Calcule les points bonus pour des conditions critiques
        
        Returns:
            int: Points bonus (0-13)
        """
        points = 0
        
        if questionnaire.a_eu_perfusion:
            points += self.POINTS_BONUS_PERFUSION
        
        if questionnaire.a_eu_transfusion:
            points += self.POINTS_BONUS_TRANSFUSION
        
        if questionnaire.essoufflement:
            points += self.POINTS_BONUS_ESSOUFFLEMENT
        
        return points
    
    def _determiner_surprime(self, score: int) -> Tuple[Decimal, str]:
        """
        Détermine le taux de surprime et la catégorie en fonction du score
        
        Args:
            score: Score de risque total
            
        Returns:
            tuple: (taux_surprime, categorie_risque)
        """
        for min_score, max_score, taux, categorie in self.TRANCHES_SURPRIME:
            if min_score <= score <= max_score:
                return taux, categorie
        
        # Par défaut (ne devrait jamais arriver)
        return Decimal('20.00'), 'TRES_ELEVE'
    
    # ============================================
    # MÉTHODES UTILITAIRES
    # ============================================
    
    def obtenir_bareme_complet(self) -> Dict:
        """
        Retourne le barème complet pour documentation/interface
        
        Returns:
            dict: Structure complète des barèmes
        """
        return {
            'imc': {
                'seuils': {
                    'denutrition': f"< {self.IMC_DENUTRITION}",
                    'normal': f"{self.IMC_DENUTRITION} - {self.IMC_NORMAL_MAX}",
                    'surpoids': f"{self.IMC_NORMAL_MAX + 0.1} - {self.IMC_SURPOIDS_MAX}",
                    'obesite': f">= {self.IMC_SURPOIDS_MAX + 0.1}",
                },
                'points': self.POINTS_IMC,
            },
            'fumeur': {
                'categories': {
                    'leger': "< 5 cigarettes/jour",
                    'modere': "5-10 cigarettes/jour",
                    'lourd': "> 10 cigarettes/jour",
                },
                'points': self.POINTS_FUMEUR,
            },
            'alcool': {
                'points': self.POINTS_ALCOOL,
            },
            'antecedents': {
                'tranches': {
                    'faible': "0-1 réponse OUI",
                    'modere': "2-3 réponses OUI",
                    'eleve': "4-5 réponses OUI",
                    'tres_eleve': "≥ 6 réponses OUI",
                },
                'points': self.POINTS_ANTECEDENTS,
            },
            'bonus_critiques': {
                'perfusion': self.POINTS_BONUS_PERFUSION,
                'transfusion': self.POINTS_BONUS_TRANSFUSION,
                'essoufflement': self.POINTS_BONUS_ESSOUFFLEMENT,
            },
            'tranches_surprime': [
                {
                    'score_min': min_score,
                    'score_max': max_score,
                    'taux': float(taux),
                    'categorie': categorie,
                }
                for min_score, max_score, taux, categorie in self.TRANCHES_SURPRIME
            ],
        }
    
    def simuler_score(self, **params) -> Dict:
        """
        Simule un score de risque sans sauvegarder
        Utile pour tester différents scénarios
        
        Args:
            **params: Paramètres simulés (imc, fumeur, nb_cig, etc.)
            
        Returns:
            dict: Résultat simulé
        """
        # Créer un objet factice avec les paramètres
        class FakeQuestionnaire:
            def __init__(self, **kwargs):
                for key, value in kwargs.items():
                    setattr(self, key, value)
            
            def compter_antecedents(self):
                return self.nb_antecedents or 0
            
            def get_categorie_imc(self):
                return "Simulé"
        
        fake_q = FakeQuestionnaire(**params)
        return self.calculer_surprime(fake_q)


# ============================================
# FONCTION HELPER
# ============================================

def calculer_et_appliquer_surprime(questionnaire) -> Dict:
    """
    Calcule la surprime et met à jour le questionnaire
    
    Args:
        questionnaire: Instance QuestionnaireMedical
        
    Returns:
        dict: Résultats du calcul
    """
    calculateur = CalculateurSurprime()
    resultats = calculateur.calculer_surprime(questionnaire)
    
    # Mise à jour du questionnaire
    questionnaire.score_risque = resultats['score_risque']
    questionnaire.taux_surprime = resultats['taux_surprime']
    questionnaire.categorie_risque = resultats['categorie_risque']
    
    # Détermination du statut
    if resultats['score_risque'] > 20:
        questionnaire.statut = 'expertise_requise'
    else:
        questionnaire.statut = 'accepte'
    
    questionnaire.save()
    
    return resultats