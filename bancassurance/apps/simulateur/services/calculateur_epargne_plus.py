# apps/simulateur/services/calculateur_epargne_plus.py
"""
Calculateur pour ÉPARGNE PLUS
Produit d'épargne avec capitalisation mensuelle d'intérêts

Formule :
- Prime nette = Prime brute × (1 - taux_frais_total)
- Valeur mois M+1 = Valeur mois M + Prime nette + (Valeur mois M × Taux mensuel)
"""

from typing import Dict, Any, List
from decimal import Decimal, ROUND_HALF_UP

from apps.simulateur.services.base import CalculateurBase
from apps.tarification.models import TableParametresEpargnePlus


class CalculateurEpargnePlus(CalculateurBase):
    """
    Calculateur pour le produit Épargne Plus
    Simule l'épargne avec capitalisation mensuelle
    """
    PRODUIT_CODE = 'epargne_plus'

    """
    Calcule le capital acquis Épargne Plus + tableau mensuel détaillé.
    Logique identique au fichier Excel Prime_Epargne_Plus.xlsx.

    Args:
        prime_mensuelle : cotisation mensuelle du client (FCFA)
        duree_ans       : durée du contrat en années (minimum 5)
        i               : taux d'intérêt annuel (défaut 3.04%)
        gp              : frais de gestion (défaut 3%)
        e               : frais de tirage (défaut 1%)
        a               : frais d'acquisition (défaut 3%)
        pen             : pénalité de rachat avant 10 ans (défaut 5%)

    Returns:
        dict :
            - capital_acquis            : capital total à la fin du contrat
            - capital_apres_penalite    : capital après déduction pénalité (si < 10 ans)
            - cumul_cotisations         : total des primes brutes versées
            - interets_totaux           : intérêts générés sur la durée
            - tableau                   : liste de dicts, un par mois (voir ci-dessous)

        Chaque élément du tableau contient :
            - mois              : numéro du mois (1 à n)
            - prime_brute       : cotisation mensuelle brute
            - cumul_primes      : cumul des primes brutes jusqu'à ce mois
            - prime_nette       : prime après déduction des frais
            - capital_debut     : capital en début de période (Vm,o)
            - interet_cumul     : intérêt cumulé jusqu'à ce mois
            - capital_fin       : capital en fin de période (Vm,f)
    """

    def __init__(self, banque):
        """
        Initialise le calculateur avec vérification BCI et BOA
        
        Args:
            banque: Instance du modèle Banque
        
        Raises:
            ValueError: Si la banque n'est pas BCI et BOA
        """
        super().__init__(banque)
        # La vérification ProduitBanque est faite automatiquement par CalculateurBase
    
    def valider_parametres(self, parametres: Dict[str, Any]) -> None:
        pass
    
    def calculer(
        self,
        parametres: Dict[str, Any],
        avec_details: bool = False
    ) -> Dict[str, Any]:
        """
        Calcule une simula"tion Épargne Plus
        
        Args:
            parametres: {
                'cotisation_mensuelle': int,  # Cotisation mensuelle en FCFA
                'duree_annees': int,          # Durée en années
                'banque': Banque,             # Instance Banque
                
                # Optionnels
                'nom': str,
                'prenom': str,
                'date_naissance': date,
                'telephone': str,
                'email': str,
            }
            avec_details: Si True, retourne l'évolution mois par mois
            
        Returns:
            dict avec tous les résultats de la simulation
        """
        from apps.tarification.models import TableParametresEpargnePlus
        
        # Récupérer les paramètres
        cotisation = int(str(parametres['cotisation_mensuelle']))
        duree_annees = int(parametres['duree_annees'])
        banque = self.banque_tarification
        
        # Charger la configuration de la banque
        try:
            config = TableParametresEpargnePlus.get_parametres(banque)
        except ValueError as e:
            raise ValueError(f"Configuration Épargne Plus manquante : {str(e)}")
        
        # Validation
        if cotisation < config.cotisation_minimum:
            raise ValueError(
                f"Cotisation mensuelle minimum : {config.cotisation_minimum:,} FCFA"
            )
        
        if duree_annees < config.duree_minimum_annees:
            raise ValueError(
                f"Durée minimum : {config.duree_minimum_annees} ans"
            )
        
        i   = float(config.taux_interet_annuel)
        gp  = float(config.taux_frais_gestion)
        e   = float(config.taux_frais_tirage)
        a   = float(config.taux_frais_acquisition)
        pen = float(config.taux_penalite_rachat)
                
        #print(i, gp, e, a, pen)
         # Taux mensuel par équivalence composée
        ip = (1 + i) ** (1 / 12) - 1

        # Prime après déduction des frais (gp + e + a = 7%)
        prime_nette = cotisation * (1 - gp - e - a)

        n = int(duree_annees * 12)

        # Série G : capital début période (annuité-due)
        # G[0] = 0, G[m] = (G[m-1] + prime_nette) * (1 + ip)
        G = [0.0] * (n + 1)
        for m in range(1, n + 1):
            G[m] = (G[m - 1] + prime_nette) * (1 + ip)

        # Série H : intérêt cumulé
        H = [0.0] * (n + 1)
        H[1] = G[1] * ip
        for m in range(2, n):
            H[m] = G[m] * ((1 + ip) ** m - 1) - H[m - 1]
        # Dernier mois : G au-delà de la durée sans nouveau dépôt
        G_dernier = G[n - 1] * (1 + ip)
        H[n] = G_dernier * ((1 + ip) ** n - 1) - H[n - 1]

        # Tableau mensuel
        tableau = []
        for m in range(1, n + 1):
            tableau.append({
                "mois":          m,
                "prime_brute":   cotisation,
                "cumul_primes":  cotisation * m,
                "prime_nette":   round(prime_nette, 2),
                "capital_debut": round(G[m - 1], 2),
                "interet_cumul": round(H[m], 2),
                "capital_fin":   round(m * prime_nette + H[m], 2),
            })

        # Résumé
        capital = n * prime_nette + H[n]
        capital_apres_penalite = capital * (1 - pen) if duree_annees < 10 else capital

        

        # Construction du résultat
        resultats = {
            # Cotisations
            "capital_acquis": round(capital, 2),
            "capital_apres_penalite": round(capital_apres_penalite, 2),
            "cumul_cotisations":  cotisation * n,
            "interets_totaux": round(capital - prime_nette * n, 2),
            "nombre_mensualites": duree_annees * 12,
            #"tableau": tableau,
            
            # Frais d'adhésion
            'frais_adhesion': config.frais_adhesion_minimum,
            
            # Rendement
            #'rendement_pourcent': float(rendement_pourcent),
            #'taux_interet_annuel_pourcent': float(config.taux_interet_annuel * Decimal('100')),
            'taux_interet_annuel_pourcent': float(3.25),
            'taux_interet_mensuel_pourcent': float(config.taux_interet_mensuel * Decimal('100')),
            
            # Frais détaillés
            'taux_frais_gestion_pourcent': float(config.taux_frais_gestion * Decimal('100')),
            'taux_frais_acquisition_pourcent': float(config.taux_frais_acquisition * Decimal('100')),
            'taux_frais_tirage_pourcent': float(config.taux_frais_tirage * Decimal('100')),
            'taux_frais_total_pourcent': float(config.taux_frais_total * Decimal('100')),
            #'taux_net_cotisation_pourcent': float(taux_net * Decimal('100')),
            
            # Pénalités
            'penalite_rachat_avant_annees': config.duree_penalite_rachat_annees,
            'taux_penalite_rachat_pourcent': float(config.taux_penalite_rachat * Decimal('100')),
            
            # Informations produit
            'produit': 'epargne_plus',
            'produit_nom': 'Épargne Plus',
            'banque_code': banque.code_banque,
            'banque_nom': banque.nom_court,
            #'periodicite': config.periodicite,
            'periodicite_tirage': config.periodicite_tirage,
        }
        
        # Ajouter l'évolution si demandée
        if avec_details:
            resultats['evolution_mensuelle'] = tableau
        
        return resultats
    
    def calculer_rachat_anticipe(
        self,
        parametres: Dict[str, Any],
        mois_rachat: int
    ) -> Dict[str, Any]:
        """
        Calcule le montant en cas de rachat anticipé
        
        Args:
            parametres: Mêmes paramètres que calculer
            mois_rachat: Mois du rachat (1-based, de 1 à duree_mois)
            
        Returns:
            dict avec valeur_rachat, penalite, montant_net, etc.
        """
        # Calculer la simulation complète avec détails
        simulation = self.calculer(parametres, avec_details=True)
        
        # Vérifier que le mois de rachat est valide
        if mois_rachat < 1 or mois_rachat > simulation['duree_mois']:
            raise ValueError(
                f"Mois de rachat invalide : {mois_rachat}. "
                f"Doit être entre 1 et {simulation['duree_mois']}"
            )
        
        # Récupérer la valeur au mois de rachat
        detail_mois = simulation['evolution_mensuelle'][mois_rachat - 1]
        valeur_rachat = Decimal(str(detail_mois['valeur_cumulee']))
        cotisations_versees = Decimal(str(detail_mois['cotisations_cumulees_brutes']))
        
        # Calculer l'ancienneté en années
        anciennete_annees = mois_rachat / 12
        
        # Vérifier si pénalité applicable
        penalite_avant = simulation['penalite_rachat_avant_annees']
        
        if anciennete_annees < penalite_avant:
            # Appliquer pénalité
            taux_penalite = Decimal(str(simulation['taux_penalite_rachat_pourcent'])) / Decimal('100')
            penalite = (valeur_rachat * taux_penalite).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            montant_net = valeur_rachat - penalite
            avec_penalite = True
        else:
            # Pas de pénalité
            penalite = Decimal('0')
            montant_net = valeur_rachat
            avec_penalite = False
        
        banque = parametres['banque']
        config = TableParametresEpargnePlus.get_parametres(banque)
        
        
         # NOUVEAU : Valider délai minimum de rachat
        delai_minimum = config.delai_minimum_rachat_mois
        if mois_rachat < delai_minimum:
            raise ValueError(
                f"Rachat impossible avant {delai_minimum} mois de cotisations. "
                f"Demandé : {mois_rachat} mois"
            )
        
        return {
            'mois_rachat': mois_rachat,
            'anciennete_annees': round(anciennete_annees, 2),
            'valeur_avant_penalite': float(valeur_rachat),
            'avec_penalite': avec_penalite,
            'penalite': float(penalite),
            'montant_net_rachat': float(montant_net),
            'cotisations_versees': float(cotisations_versees),
            'gain_ou_perte': float(montant_net - cotisations_versees),
            'produit': 'epargne_plus',
            'banque_code': simulation['banque_code'],
        }
    
    @classmethod
    def get_limites(cls, banque) -> Dict[str, Any]:
        """
        Retourne les limites et contraintes pour une banque
        
        Args:
            banque: Instance Banque
            
        Returns:
            dict avec limites (cotisation_minimum, duree_minimum, etc.)
        """
        from apps.tarification.models import TableParametresEpargnePlus
        
        try:
            config = TableParametresEpargnePlus.get_parametres(banque)
            
            return {
                'cotisation_minimum': config.cotisation_minimum,
                'duree_minimum_annees': config.duree_minimum_annees,
                'duree_penalite_rachat_annees': config.duree_penalite_rachat_annees,
                'frais_adhesion': config.frais_adhesion_minimum,
                'periodicite': config.periodicite,
                #'taux_interet_annuel_pourcent': float(config.taux_interet_annuel * Decimal('100')),
                'taux_interet_annuel_pourcent': float(config.taux_interet_annuel * Decimal('100')),
                'banque_code': banque.code_banque,
            }
        except ValueError:
            # Valeurs par défaut si pas de configuration
            return {
                'cotisation_minimum': 5000,
                'duree_minimum_annees': 5,
                'duree_penalite_rachat_annees': 10,
                'frais_adhesion': 5000,
                'periodicite': 'Mensuel',
                'taux_interet_annuel_pourcent': 3.04,
                'banque_code': banque.code_banque,
            }
       
    def calculer_rachat_partiel(self,parametres: Dict[str, Any],mois_rachat: int,pourcentage_rachat: float) -> Dict[str, Any]:
        """
        ✅ NOUVEAU : Calcule un rachat partiel selon règles BGFI
        
        Args:
            parametres: Mêmes que calculer
            mois_rachat: Mois du rachat
            pourcentage_rachat: % à racheter (ex: 50.0 pour 50%)
        
        Returns:
            dict avec montant_rachat_partiel, solde_restant, etc.
        """
        from apps.tarification.models import TableParametresEpargnePlus
        from decimal import Decimal
        
        banque = parametres['banque']
        config = TableParametresEpargnePlus.get_parametres(banque)
        
        # Valider délai minimum
        if mois_rachat < config.delai_minimum_rachat_mois:
            raise ValueError(
                f"Rachat impossible avant {config.delai_minimum_rachat_mois} mois"
            )
        
        # Déterminer le max autorisé selon durée
        if mois_rachat < 24:
            max_autorise = float(config.rachat_partiel_max_12_23_mois)
        else:
            max_autorise = float(config.rachat_partiel_max_24_plus_mois)
        
        # Valider le pourcentage demandé
        if pourcentage_rachat > max_autorise:
            raise ValueError(
                f"Rachat partiel maximum : {max_autorise}% pour cette durée. "
                f"Demandé : {pourcentage_rachat}%"
            )
        
        # Calculer la simulation complète
        simulation = self.calculer(parametres, avec_details=True)
        detail_mois = simulation['evolution_mensuelle'][mois_rachat - 1]
        
        valeur_totale = Decimal(str(detail_mois['valeur_cumulee']))
        pourcentage_decimal = Decimal(str(pourcentage_rachat)) / Decimal('100')
        
        # Calculer rachat partiel
        montant_rachete = valeur_totale * pourcentage_decimal
        
        # Pénalité si < 10 ans
        anciennete_annees = mois_rachat / 12
        if anciennete_annees < config.duree_penalite_rachat_annees:
            taux_penalite = config.taux_penalite_rachat
            penalite = montant_rachete * taux_penalite
            montant_net = montant_rachete - penalite
            avec_penalite = True
        else:
            penalite = Decimal('0')
            montant_net = montant_rachete
            avec_penalite = False
        
        solde_restant = valeur_totale - montant_rachete
        
        return {
            'mois_rachat': mois_rachat,
            'anciennete_annees': round(anciennete_annees, 2),
            'type_rachat': 'partiel',
            'pourcentage_rachete': pourcentage_rachat,
            'valeur_totale_avant_rachat': float(valeur_totale),
            'montant_rachete_brut': float(montant_rachete),
            'avec_penalite': avec_penalite,
            'penalite': float(penalite),
            'montant_net_percu': float(montant_net),
            'solde_restant_contrat': float(solde_restant),
            'pourcentage_max_autorise': max_autorise,
            'produit': 'epargne_plus',
            'banque_code': banque.code_banque,
        }
    
    def valider_cotisation_exceptionnelle(
        self,
        parametres: Dict[str, Any],
        montant_exceptionnel: int
    ) -> None:
        """
        ✅ NOUVEAU : Valide une cotisation exceptionnelle
        
        Args:
            parametres: Doit contenir 'cotisation_mensuelle' et 'banque'
            montant_exceptionnel: Montant de la cotisation exceptionnelle
        
        Raises:
            ValueError si montant < minimum requis
        """
        from apps.tarification.models import TableParametresEpargnePlus
        
        banque = parametres['banque']
        cotisation_mensuelle = parametres['cotisation_mensuelle']
        config = TableParametresEpargnePlus.get_parametres(banque)
        
        # Minimum = multiplicateur × cotisation mensuelle
        multiplicateur = config.cotisation_exceptionnelle_minimum_multiplicateur
        minimum_requis = cotisation_mensuelle * multiplicateur
        
        if montant_exceptionnel < minimum_requis:
            raise ValueError(
                f"Cotisation exceptionnelle minimum : {minimum_requis:,} FCFA "
                f"({multiplicateur}× cotisation mensuelle de {cotisation_mensuelle:,} FCFA). "
                f"Montant demandé : {montant_exceptionnel:,} FCFA"
            )
