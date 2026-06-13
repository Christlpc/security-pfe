"""
Views pour l'API Simulateur NSIA
Phase 3 : Endpoints REST
"""
from decimal import Decimal
from django.forms import ValidationError
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

from apps.core.models import Banque
from apps.simulateur.services.calculateur_epargne_plus import CalculateurEpargnePlus
from apps.simulateur.services.export_service import ExportService
from apps.simulateur.services.generateur_bia import GenerateurBIA, generer_bia
from drf_spectacular.utils import extend_schema


from .models import Beneficiaire, Simulation, Souscription
from .serializers import (
    BaremeSurprimeSerializer,
    EpargnePlusInputSerializer,
    EpargnePlusOutputSerializer,
    QuestionnaireMedicalCreateSerializer,
    QuestionnaireMedicalDetailSerializer,
    QuestionnaireMedicalSerializer,
    DetailQ2Serializer,
    RachatAnticipeInputSerializer,
    RachatAnticipeOutputSerializer,
    SimulateurEmprunteurInputSerializer,
    SimulateurRetraiteInputSerializer,
    SimulateurEtudesInputSerializer,
    SimulateurElikiaInputSerializer,
    SimulateurMobateliInputSerializer,
    SimulateurMobateliSurMesureInputSerializer,
    SimulationCreateSerializer,
    SimulationSerializer,
    SimulationDetailSerializer,
    SimulationResultatSerializer,
    SouscriptionSerializer,
    ConvertirEnSouscriptionSerializer,
)
from .services.calculateur_emprunteur import CalculateurEmprunteur
from .services.calculateur_retraite import CalculateurRetraite
from .services.calculateur_etudes import CalculateurEtudes
from .services.calculateur_elikia import CalculateurElikia
from .services.calculateur_mobateli import CalculateurMobateli
from .services.calculateur_mobateli_sur_mesure import CalculateurMobateliSurMesure

from apps.simulateur.models import QuestionnaireMedical, Simulation

from apps.simulateur.services.calculateur_surprime import (
    CalculateurSurprime,
    calculer_et_appliquer_surprime,
)
from apps.core.permissions import IsGestionnaire, IsResponsableBanque


# ============================================================
# Dates de contrat — source unique d'affichage
# ============================================================
# Liste exhaustive des champs date calculés par les serializers.
# Le serializer reste le SEUL endroit qui calcule les dates ; cette
# fonction se contente de les recopier dans la réponse de calcul afin
# que le frontend les AFFICHE dès le calcul (sauvegarder=false), sans
# attendre la sauvegarde. Principe : « le back calcule, le front affiche ».
CHAMPS_DATES_CONTRAT = [
    'date_signature',
    'date_effet',
    'date_octroi',
    'date_premiere_echeance',
    'date_premiere_prime',
    'date_premiere_cotisation',
    'date_echeance',
    'date_fin',
    'date_souscription',
]


def injecter_dates_contrat(resultats, parametres):
    """Recopie les dates de contrat calculées (validated_data du serializer)
    dans le dictionnaire de résultats renvoyé au frontend.

    - N'écrase jamais une valeur déjà présente dans `resultats`.
    - Convertit les objets date en ISO (YYYY-MM-DD).
    Retourne `resultats` (modifié sur place pour les dicts).
    """
    if not isinstance(resultats, dict):
        return resultats
    for champ in CHAMPS_DATES_CONTRAT:
        if champ in resultats and resultats[champ]:
            continue
        valeur = parametres.get(champ)
        if valeur is None:
            continue
        resultats[champ] = valeur.isoformat() if hasattr(valeur, 'isoformat') else valeur
    return resultats


class SimulationQuestionnaireMixin:
    """
    Mixin pour ajouter des actions liées au questionnaire dans SimulationViewSet
    À ajouter dans apps/simulateur/views.py
    """
    
    @action(detail=True, methods=['get'], url_path='questionnaire-medical')
    def questionnaire_medical(self, request, pk=None):
        """
        Récupère le questionnaire médical d'une simulation
        
        GET /api/v1/simulations/{id}/questionnaire-medical/
        """
        simulation = self.get_object()
        
        try:
            questionnaire = simulation.questionnaire_medical
            serializer = QuestionnaireMedicalDetailSerializer(questionnaire)
            return Response(serializer.data)
        except QuestionnaireMedical.DoesNotExist:
            return Response(
                {'detail': 'Aucun questionnaire médical pour cette simulation'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], url_path='creer-questionnaire-medical')
    def creer_questionnaire_medical(self, request, pk=None):
        """
        Crée un questionnaire médical pour une simulation
        
        POST /api/v1/simulations/{id}/creer-questionnaire-medical/
        Body: données du questionnaire
        """
        simulation = self.get_object()
        
        # Vérifier qu'il n'existe pas déjà
        if hasattr(simulation, 'questionnaire_medical'):
            return Response(
                {'detail': 'Un questionnaire existe déjà pour cette simulation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ajouter la simulation aux données
        data = request.data.copy()
        data['simulation'] = simulation.id
        
        # Créer via le serializer
        serializer = QuestionnaireMedicalCreateSerializer(
            data=data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        questionnaire = serializer.save()
        
        # Retourner le détail
        output_serializer = QuestionnaireMedicalDetailSerializer(questionnaire)
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
class SimulateurEmprunteurViewSet(viewsets.ViewSet):
    """
    ViewSet pour le simulateur Emprunteur
    
    Endpoints:
    - POST /api/v1/simulateur/emprunteur/ : Calculer une simulation
    """
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        """
        Calcule une simulation Emprunteur ADI — toutes banques.

        POST /api/v1/simulateur/emprunteur/

        Body (BIA complet) :
        {
            "numero_client_nsia": "",
            "nom_conseiller": "",
            "numero_convention": "1000100",

            "titre_assure": "M",
            "nom": "Doe",
            "prenom": "John",
            "date_naissance": "1982-03-26",
            "lieu_naissance": "Brazzaville",
            "situation_matrimoniale": "marie",
            "qualite_assure": "emprunteur",
            "adresse_geographique": "123 Avenue de la Paix",
            "cellulaire": "+242066123456",
            "email": "john.doe@example.com",
            "profession": "Comptable",
            "employeur": "Total",
            "numero_compte": "0012458796",

            "montant_pret": 650000,
            "duree_mois": 9,
            "duree_differe": 0,
            "taux_interet": 8.5,
            "periodicite_remboursement": "mensuel",
            "date_effet": "2026-04-01",
            "date_octroi": "2026-03-28",
            "origine_des_fonds": "Salaire",

            "beneficiaires": [
                {"qualite": "organisme_pret", "nom_prenoms": "BCI", "part_pourcentage": 100, "ordre": 1}
            ]
        }
        """
        # Validation des données d'entrée
        serializer = SimulateurEmprunteurInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        parametres = serializer.validated_data
        # print(parametres)
        sauvegarder = parametres.pop('sauvegarder', True)
        
        # Récupérer la banque depuis le contexte (middleware)
        banque = request.user.banque if hasattr(request.user, 'banque') else None
        
        if not banque:
            return Response(
                {'error': 'Banque non trouvée pour cet utilisateur'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Initialiser le calculateur
            calculateur = CalculateurEmprunteur(banque)
            
            # Effectuer le calcul
            resultats = calculateur.calculer(parametres)
            resultats = injecter_dates_contrat(resultats, parametres)
            
            # Sauvegarder la simulation si demandé
            simulation = None
            if sauvegarder:
                simulation = self._sauvegarder_simulation(
                    user=request.user,
                    banque=banque,
                    parametres=parametres,
                    resultats=resultats
                )
            
            # Préparer la réponse
            response_data = {
                'resultats': resultats,
                'message': 'Simulation calculée avec succès'
            }
            
            if simulation:
                response_data['simulation'] = SimulationDetailSerializer(simulation).data
            
            return Response(response_data, status=status.HTTP_200_OK)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    

    def _sauvegarder_simulation(self, user, banque, parametres, resultats):
        """
        Sauvegarde une simulation Emprunteur — fidèle au BIA NSIA.
        Tout est stocké dans donnees_entree (JSONField).
        """
        donnees_entree = {
            # --- RÉSERVÉ NSIA ---
            'numero_client_nsia': parametres.get('numero_client_nsia', ''),
            'nom_conseiller': parametres.get('nom_conseiller', ''),
            'numero_convention': parametres.get('numero_convention', ''),

            # --- 1. SOUSCRIPTEUR = la banque (emprunteur groupe) ---
            # Pas de données souscripteur en input : c'est toujours la banque.
            # Le template lit directement simulation.banque.

            # --- 2. ASSURÉ ---
            'titre_assure': parametres.get('titre_assure', ''),
            'date_naissance': parametres['date_naissance'].isoformat(),
            'lieu_naissance': parametres.get('lieu_naissance', ''),
            'situation_matrimoniale': parametres.get('situation_matrimoniale', ''),
            'qualite_assure': parametres.get('qualite_assure', 'emprunteur'),
            'adresse_geographique': parametres.get('adresse_geographique', ''),
            'adresse_postale': parametres.get('adresse_postale', ''),
            'cellulaire': parametres.get('cellulaire', ''),
            'telephone_domicile': parametres.get('telephone_domicile', ''),
            'telephone_bureau': parametres.get('telephone_bureau', ''),
            'email_professionnel': parametres.get('email_professionnel', ''),
            'profession': parametres.get('profession', ''),
            'employeur': parametres.get('employeur', ''),
            'adresse_employeur': parametres.get('adresse_employeur', ''),
            'telephone_employeur': parametres.get('telephone_employeur', ''),
            'poste_occupe': parametres.get('poste_occupe', ''),
            'numero_compte': parametres.get('numero_compte', ''),
            'correspondant_nom': parametres.get('correspondant_nom', ''),
            'correspondant_telephone': parametres.get('correspondant_telephone', ''),
            'correspondant_cellulaire': parametres.get('correspondant_cellulaire', ''),
            'deja_souscrit_nsia': parametres.get('deja_souscrit_nsia', False),
            'details_contrat_nsia': parametres.get('details_contrat_nsia', ''),

            # --- II. GARANTIES (prêt) ---
            'montant_pret': float(parametres['montant_pret']),
            'duree_mois': parametres['duree_mois'],
            'duree_differe': parametres.get('duree_differe', 0),
            'taux_interet': float(parametres['taux_interet']) if parametres.get('taux_interet') else None,
            'taux_tps': float(parametres['taux_tps']) if parametres.get('taux_tps') else None,
            'taux_surprime': float(parametres.get('taux_surprime', 0)),
            'type_pret': parametres.get('type_pret', ''),
            'periodicite_remboursement': parametres.get('periodicite_remboursement', ''),
            'date_effet': parametres['date_effet'].isoformat() if parametres.get('date_effet') else None,
            'date_octroi': parametres['date_octroi'].isoformat() if parametres.get('date_octroi') else None,
            'date_premiere_echeance': parametres['date_premiere_echeance'].isoformat() if parametres.get('date_premiere_echeance') else None,
            'origine_des_fonds': parametres.get('origine_des_fonds', ''),
            'age_emprunteur': parametres.get('age_emprunteur'),
        }

        simulation = Simulation.objects.create(
            banque=banque,
            gestionnaire=user,
            agence=user.agence,
            produit='emprunteur',
            statut='calculee',
            donnees_entree=donnees_entree,
            resultats_calcul=resultats,
            nom_client=parametres.get('nom', ''),
            prenom_client=parametres.get('prenom', ''),
            email_client=parametres.get('email', ''),
            telephone_client=parametres.get('cellulaire', '') or parametres.get('telephone_domicile', ''),
        )

        # --- 4. BÉNÉFICIAIRES ---
        beneficiaires_data = parametres.get('beneficiaires', [])

        if beneficiaires_data:
            total_parts = sum(Decimal(str(b.get('part_pourcentage', 0))) for b in beneficiaires_data)

            if abs(total_parts - Decimal('100.00')) > Decimal('0.01'):
                simulation.delete()
                raise ValidationError(
                    f"La somme des parts des bénéficiaires doit être 100% (actuellement : {total_parts}%)")

            for benef_data in beneficiaires_data:
                Beneficiaire.objects.create(
                    simulation=simulation,
                    qualite=benef_data.get('qualite', 'organisme_pret'),
                    nom_prenoms=benef_data.get('nom_prenoms', ''),
                    part_pourcentage=Decimal(str(benef_data.get('part_pourcentage', 0))),
                    ordre=benef_data.get('ordre', 1)
                )
        else:
            Beneficiaire.creer_beneficiaire_par_defaut(simulation)

        return simulation

class SimulateurRetraiteViewSet(viewsets.ViewSet):
    """
    ViewSet pour le simulateur Retraite
    
    Endpoints:
    - POST /api/v1/simulateur/retraite/ : Calculer une simulation retraite
    """
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        """
        Calcule une simulation retraite
        
        POST /api/v1/simulateur/retraite/
        
        Body:
        {
            "prime_periodique_commerciale": 80000,
            "capital_deces": 0,
            "duree": 7,
            "age": 42,
            "periodicite": "S",
            "nom": "Dupont",
            "prenom": "Jean",
            "email": "jean.dupont@example.com",
            "telephone": "+242123456789",
            "sauvegarder": true
        }
        
        Returns:
        {
            "simulation": {...},
            "resultats": {
                "prime_periodique_commerciale": 81000,
                "capital_garanti": 654321,
                "prime_deces": 5000,
                "prime_epargne": 75000,
                "prime_totale": 567000,
                "periodicite": "S",
                "periodicite_libelle": "Semestrielle",
                ...
            },
            "message": "Simulation calculée avec succès"
        }
        """
        # Validation des données d'entrée
        serializer = SimulateurRetraiteInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        parametres = serializer.validated_data
        sauvegarder = parametres.pop('sauvegarder', True)
        
        # Récupérer la banque depuis le contexte (middleware)
        banque = request.user.banque if hasattr(request.user, 'banque') else None
        
        if not banque:
            return Response(
                {'error': 'Banque non trouvée pour cet utilisateur'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Initialiser le calculateur
            calculateur = CalculateurRetraite(banque)

            # Mapper les champs pour compatibilité calculateur
            params_calcul = dict(parametres)
            params_calcul['periodicite'] = parametres.get('periodicite_code', 'M')

            # Effectuer le calcul
            resultats = calculateur.calculer(params_calcul)
            resultats = injecter_dates_contrat(resultats, parametres)
            
            # Sauvegarder la simulation si demandé
            simulation = None
            if sauvegarder:
                simulation = self._sauvegarder_simulation(
                    request.user,
                    banque,
                    parametres,
                    resultats
                )
            
            # Préparer la réponse
            response_data = {
                'resultats': resultats,
                'message': 'Simulation calculée avec succès'
            }
            
            if simulation:
                response_data['simulation'] = SimulationDetailSerializer(simulation).data
            
            return Response(response_data, status=status.HTTP_200_OK)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _sauvegarder_simulation(self, user, banque, parametres, resultats):
        """
        Sauvegarde une simulation Retraite — fidèle au BIA NSIA.
        Tout est stocké dans donnees_entree (JSONField).
        """
        donnees_entree = {
            # --- RÉSERVÉ NSIA ---
            'numero_client_nsia': parametres.get('numero_client_nsia', ''),
            'nom_conseiller': parametres.get('nom_conseiller', ''),
            'numero_convention': parametres.get('numero_convention', ''),

            # --- 1. SOUSCRIPTEUR ---
            'assure_est_souscripteur': parametres.get('assure_est_souscripteur', True),
            'souscripteur': parametres.get('souscripteur'),

            # --- 2. ASSURÉ ---
            'titre_assure': parametres.get('titre_assure', ''),
            'date_naissance': parametres['date_naissance'].isoformat(),
            'lieu_naissance': parametres.get('lieu_naissance', ''),
            'situation_matrimoniale': parametres.get('situation_matrimoniale', ''),
            'adresse_geographique': parametres.get('adresse_geographique', ''),
            'adresse_postale': parametres.get('adresse_postale', ''),
            'cellulaire': parametres.get('cellulaire', ''),
            'telephone_domicile': parametres.get('telephone_domicile', ''),
            'telephone_bureau': parametres.get('telephone_bureau', ''),
            'mobile': parametres.get('mobile', ''),
            'email_professionnel': parametres.get('email_professionnel', ''),
            'profession': parametres.get('profession', ''),
            'employeur': parametres.get('employeur', ''),
            'adresse_employeur': parametres.get('adresse_employeur', ''),
            'telephone_employeur': parametres.get('telephone_employeur', ''),
            'numero_compte': parametres.get('numero_compte', ''),
            'correspondant_nom': parametres.get('correspondant_nom', ''),
            'correspondant_telephone': parametres.get('correspondant_telephone', ''),
            'correspondant_mobile': parametres.get('correspondant_mobile', ''),
            'deja_souscrit_nsia': parametres.get('deja_souscrit_nsia', False),
            'details_contrat_nsia': parametres.get('details_contrat_nsia', ''),

            # --- 3. BÉNÉFICIAIRES ---
            'beneficiaire_terme_assure': parametres.get('beneficiaire_terme_assure', True),
            'beneficiaires_terme': parametres.get('beneficiaires_terme', []),
            'beneficiaire_deces_conjoint': parametres.get('beneficiaire_deces_conjoint', False),
            'beneficiaire_deces_enfants': parametres.get('beneficiaire_deces_enfants', False),
            'beneficiaire_deces_autres': parametres.get('beneficiaire_deces_autres', False),

            # --- II. COTISATION ---
            'prime_periodique_commerciale': float(parametres['prime_periodique_commerciale']),
            'periodicite': parametres.get('periodicite', ''),
            'mode_paiement': parametres.get('mode_paiement', ''),
            'origine_des_fonds': parametres.get('origine_des_fonds', ''),

            # --- III. GARANTIES SOUSCRITES ---
            'duree': parametres['duree'],
            'age': parametres['age'],
            'capital_deces': float(parametres.get('capital_deces', 0)),
            'date_premiere_cotisation': parametres['date_premiere_cotisation'].isoformat() if parametres.get('date_premiere_cotisation') else None,
            'date_effet': parametres['date_effet'].isoformat() if parametres.get('date_effet') else None,
            'date_fin': parametres['date_fin'].isoformat() if parametres.get('date_fin') else None,
            'date_signature': parametres['date_signature'].isoformat(),
        }

        simulation = Simulation.objects.create(
            banque=banque,
            gestionnaire=user,
            agence=user.agence,
            produit='retraite',
            statut='calculee',
            donnees_entree=donnees_entree,
            resultats_calcul=resultats,
            nom_client=parametres.get('nom', ''),
            prenom_client=parametres.get('prenom', ''),
            email_client=parametres.get('email', ''),
            telephone_client=parametres.get('cellulaire', '') or parametres.get('mobile', '') or parametres.get('telephone_domicile', ''),
        )

        # --- BÉNÉFICIAIRES en cas de décès ---
        beneficiaires_data = parametres.get('beneficiaires', [])

        if beneficiaires_data:
            total_parts = sum(Decimal(str(b.get('part_pourcentage', 0))) for b in beneficiaires_data)

            if abs(total_parts - Decimal('100.00')) > Decimal('0.01'):
                simulation.delete()
                raise ValidationError(
                    f"La somme des parts des bénéficiaires doit être 100% (actuellement : {total_parts}%)")

            for benef_data in beneficiaires_data:
                Beneficiaire.objects.create(
                    simulation=simulation,
                    qualite=benef_data.get('qualite', 'conjoint'),
                    nom_prenoms=benef_data.get('nom_prenoms', ''),
                    part_pourcentage=Decimal(str(benef_data.get('part_pourcentage', 0))),
                    ordre=benef_data.get('ordre', 1)
                )
        else:
            Beneficiaire.creer_beneficiaire_par_defaut(simulation)

        return simulation

class SimulateurEtudesViewSet(viewsets.ViewSet):
    """
    ViewSet pour le simulateur Études
    
    Endpoints:
    - POST /api/v1/simulateur/etudes/ : Calculer une simulation études
    """
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        """
        Calcule une simulation études
        
        POST /api/v1/simulateur/etudes/
        
        Body:
        {
            "age_parent": 30,
            "age_enfant": 0,
            "montant_rente": 1100000,
            "duree_paiement": 14,
            "duree_service": 5,
            "nom": "Dupont",
            "prenom": "Jean",
            "email": "jean.dupont@example.com",
            "telephone": "+242123456789",
            "sauvegarder": true
        }
        
        Returns:
        {
            "simulation": {...},
            "resultats": {
                "prime_unique": 500000,
                "prime_annuelle": 50000,
                "prime_mensuelle": 4500,
                "montant_rente_annuel": 1100000,
                "age_parent": 30,
                "age_enfant": 0,
                "duree_paiement": 14,
                "duree_service": 5,
                "debut_service": 14,
                "fin_service": 19,
                ...
            },
            "message": "Simulation calculée avec succès"
        }
        """
        # Validation des données d'entrée
        serializer = SimulateurEtudesInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        parametres = serializer.validated_data
        sauvegarder = parametres.pop('sauvegarder', True)
        
        # Récupérer la banque depuis le contexte (middleware)
        banque = request.user.banque if hasattr(request.user, 'banque') else None
        
        if not banque:
            return Response(
                {'error': 'Banque non trouvée pour cet utilisateur'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Initialiser le calculateur
            calculateur = CalculateurEtudes(banque)
            
            # Effectuer le calcul
            resultats = calculateur.calculer(parametres)
            resultats = injecter_dates_contrat(resultats, parametres)
            
            # Sauvegarder la simulation si demandé
            simulation = None
            if sauvegarder:
                simulation = self._sauvegarder_simulation(
                    request.user,
                    banque,
                    parametres,
                    resultats
                )
            
            # Préparer la réponse
            response_data = {
                'resultats': resultats,
                'message': 'Simulation calculée avec succès'
            }
            
            if simulation:
                response_data['simulation'] = SimulationDetailSerializer(simulation).data
            
            return Response(response_data, status=status.HTTP_200_OK)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _sauvegarder_simulation(self, user, banque, parametres, resultats):
        """
        Sauvegarde une simulation Études — fidèle au BIA NSIA.
        Tout est stocké dans donnees_entree (JSONField).
        """
        donnees_entree = {
            # --- RÉSERVÉ NSIA ---
            'numero_client_nsia': parametres.get('numero_client_nsia', ''),
            'nom_conseiller': parametres.get('nom_conseiller', ''),
            'numero_convention': parametres.get('numero_convention', ''),

            # --- 1. PARTIES CONTRACTANTES (Souscripteur) ---
            'assure_est_souscripteur': parametres.get('assure_est_souscripteur', True),
            'souscripteur': parametres.get('souscripteur'),

            # --- 2. ASSURÉ ---
            'titre_assure': parametres.get('titre_assure', ''),
            'date_naissance': parametres['date_naissance'].isoformat(),
            'lieu_naissance': parametres.get('lieu_naissance', ''),
            'situation_matrimoniale': parametres.get('situation_matrimoniale', ''),
            'adresse_geographique': parametres.get('adresse_geographique', ''),
            'adresse_postale': parametres.get('adresse_postale', ''),
            'cellulaire': parametres.get('cellulaire', ''),
            'telephone_domicile': parametres.get('telephone_domicile', ''),
            'telephone_bureau': parametres.get('telephone_bureau', ''),
            'email_professionnel': parametres.get('email_professionnel', ''),
            'profession': parametres.get('profession', ''),
            'employeur': parametres.get('employeur', ''),
            'adresse_employeur': parametres.get('adresse_employeur', ''),
            'telephone_employeur': parametres.get('telephone_employeur', ''),
            'poste_occupe': parametres.get('poste_occupe', ''),
            'numero_compte': parametres.get('numero_compte', ''),
            'correspondant_nom': parametres.get('correspondant_nom', ''),
            'correspondant_telephone': parametres.get('correspondant_telephone', ''),
            'correspondant_cellulaire': parametres.get('correspondant_cellulaire', ''),
            'deja_souscrit_nsia': parametres.get('deja_souscrit_nsia', False),
            'details_contrat_nsia': parametres.get('details_contrat_nsia', ''),

            # --- 3. BÉNÉFICIAIRES au terme ---
            'beneficiaire_terme_assure': parametres.get('beneficiaire_terme_assure', True),
            'beneficiaires_terme': parametres.get('beneficiaires_terme', []),

            # --- II. GARANTIES SOUSCRITES ---
            'age_enfant': parametres['age_enfant'],
            'age_parent': parametres['age_parent'],
            'montant_rente': float(parametres['montant_rente']),
            'duree_paiement': parametres['duree_paiement'],
            'duree_service': parametres['duree_service'],

            # --- PAIEMENT ---
            'mode_paiement': parametres.get('mode_paiement', ''),
            'periodicite': parametres.get('periodicite', ''),
            'date_premiere_cotisation': parametres['date_premiere_cotisation'].isoformat() if parametres.get('date_premiere_cotisation') else None,
            'date_effet': parametres['date_effet'].isoformat() if parametres.get('date_effet') else None,
            'date_echeance': parametres['date_echeance'].isoformat() if parametres.get('date_echeance') else None,
            'date_fin': parametres['date_fin'].isoformat() if parametres.get('date_fin') else None,
            'date_signature': parametres['date_signature'].isoformat(),
            'origine_des_fonds': parametres.get('origine_des_fonds', ''),
        }

        simulation = Simulation.objects.create(
            banque=banque,
            gestionnaire=user,
            agence=user.agence,
            produit='etudes',
            statut='calculee',
            donnees_entree=donnees_entree,
            resultats_calcul=resultats,
            nom_client=parametres.get('nom', ''),
            prenom_client=parametres.get('prenom', ''),
            email_client=parametres.get('email', ''),
            telephone_client=parametres.get('cellulaire', '') or parametres.get('telephone_domicile', ''),
        )

        # --- BÉNÉFICIAIRES en cas de décès ---
        beneficiaires_data = parametres.get('beneficiaires', [])

        if beneficiaires_data:
            total_parts = sum(Decimal(str(b.get('part_pourcentage', 0))) for b in beneficiaires_data)

            if abs(total_parts - Decimal('100.00')) > Decimal('0.01'):
                simulation.delete()
                raise ValidationError(
                    f"La somme des parts des bénéficiaires doit être 100% (actuellement : {total_parts}%)")

            for benef_data in beneficiaires_data:
                Beneficiaire.objects.create(
                    simulation=simulation,
                    qualite=benef_data.get('qualite', 'enfant'),
                    nom_prenoms=benef_data.get('nom_prenoms', ''),
                    part_pourcentage=Decimal(str(benef_data.get('part_pourcentage', 0))),
                    ordre=benef_data.get('ordre', 1)
                )
        else:
            Beneficiaire.creer_beneficiaire_par_defaut(simulation)

        return simulation

class SimulateurElikiaViewSet(viewsets.ViewSet):
    """
    ViewSet pour le simulateur Elikia (BCI)
    
    Endpoints:
    - POST /api/v1/simulateur/elikia/ : Calculer une simulation elikia
    """
    permission_classes = [IsAuthenticated]
    
    def create(self, request):
        """
        Calcule une simulation Elikia Scolaire — toutes banques.

        POST /api/v1/simulateur/elikia/

        Body (BIA complet) :
        {
            "numero_client_nsia": "123456",
            "nom_conseiller": "M. Bakala",
            "numero_convention": "1000359",

            "assure_est_souscripteur": true,

            "titre_assure": "M",
            "nom": "Mbemba",
            "prenom": "Christ",
            "date_naissance": "1985-06-15",
            "lieu_naissance": "Brazzaville",
            "situation_matrimoniale": "marie",
            "adresse_geographique": "123 Avenue de la Paix",
            "cellulaire": "+242069000000",
            "telephone_domicile": "+242022123456",
            "email": "c.mbemba@email.com",
            "profession": "Ingénieur",
            "employeur": "Total Energies",
            "numero_compte": "CG001-00012345-01",

            "eleves": [
                {"nom_prenoms": "Mbemba Junior", "date_naissance": "2015-01-10", "qualite": "Fils"}
            ],

            "rente_annuelle": 200000,
            "duree_rente": 5,
            "duree_contrat": 10,

            "mode_paiement": "prelevement_bancaire",
            "type_cotisation": "cotisations_annuelles",
            "origine_des_fonds": "Salaire",

            "beneficiaires": [
                {"qualite": "enfant", "nom_prenoms": "Mbemba Junior", "part_pourcentage": 100, "ordre": 1}
            ]
        }
        """
        # Validation des données d'entrée
        serializer = SimulateurElikiaInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        parametres = serializer.validated_data
        sauvegarder = parametres.pop('sauvegarder', True)
        
        # Récupérer la banque depuis le contexte (middleware)
        banque = request.user.banque if hasattr(request.user, 'banque') else None
        
        if not banque:
            return Response(
                {'error': 'Banque non trouvée pour cet utilisateur'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Initialiser le calculateur (vérifie automatiquement ProduitBanque)
            calculateur = CalculateurElikia(banque)
            
            # Effectuer le calcul
            resultats = calculateur.calculer(parametres)
            resultats = injecter_dates_contrat(resultats, parametres)
            
            # Sauvegarder la simulation si demandé
            simulation = None
            if sauvegarder:
                simulation = self._sauvegarder_simulation(
                    request.user,
                    banque,
                    parametres,
                    resultats
                )
            
            # Préparer la réponse
            response_data = {
                'resultats': resultats,
                'message': 'Simulation calculée avec succès'
            }
            
            if simulation:
                response_data['simulation'] = SimulationDetailSerializer(simulation).data
            
            return Response(response_data, status=status.HTTP_200_OK)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
       
    
    def _sauvegarder_simulation(self, user, banque, parametres, resultats):
        """
        Sauvegarde une simulation Elikia — fidèle au BIA NSIA.
        Tout est stocké dans donnees_entree (JSONField).
        """
        donnees_entree = {
            # --- RÉSERVÉ NSIA ---
            'numero_client_nsia': parametres.get('numero_client_nsia', ''),
            'nom_conseiller': parametres.get('nom_conseiller', ''),
            'numero_convention': parametres.get('numero_convention', ''),

            # --- 1. PARTIES CONTRACTANTES (Souscripteur) ---
            'assure_est_souscripteur': parametres.get('assure_est_souscripteur', True),
            'souscripteur': parametres.get('souscripteur'),

            # --- 2. ASSURÉ ---
            'titre_assure': parametres.get('titre_assure', ''),
            'date_naissance': parametres['date_naissance'].isoformat(),
            'lieu_naissance': parametres.get('lieu_naissance', ''),
            'situation_matrimoniale': parametres.get('situation_matrimoniale', ''),
            'adresse_geographique': parametres.get('adresse_geographique', ''),
            'adresse_postale': parametres.get('adresse_postale', ''),
            'cellulaire': parametres.get('cellulaire', ''),
            'telephone_domicile': parametres.get('telephone_domicile', ''),
            'telephone_bureau': parametres.get('telephone_bureau', ''),
            'email_professionnel': parametres.get('email_professionnel', ''),
            'profession': parametres.get('profession', ''),
            'employeur': parametres.get('employeur', ''),
            'adresse_employeur': parametres.get('adresse_employeur', ''),
            'telephone_employeur': parametres.get('telephone_employeur', ''),
            'poste_occupe': parametres.get('poste_occupe', ''),
            'numero_compte': parametres.get('numero_compte', ''),
            'correspondant_nom': parametres.get('correspondant_nom', ''),
            'correspondant_telephone': parametres.get('correspondant_telephone', ''),
            'correspondant_cellulaire': parametres.get('correspondant_cellulaire', ''),

            # --- 3. ÉLÈVE / ÉTUDIANT BÉNÉFICIAIRE ---
            'eleves': parametres.get('eleves', []),

            # --- II. CAPITAUX SOUSCRITS ---
            'rente_annuelle': int(parametres['rente_annuelle']),
            'duree_rente': parametres['duree_rente'],
            'age_parent': parametres['age_parent'],

            # --- PAIEMENT ---
            'mode_paiement': parametres.get('mode_paiement', ''),
            'operateur_mobile_money': parametres.get('operateur_mobile_money', ''),
            'type_cotisation': parametres.get('type_cotisation', ''),
            'duree_contrat': parametres.get('duree_contrat'),
            'date_premiere_prime': parametres['date_premiere_prime'].isoformat() if parametres.get('date_premiere_prime') else None,
            'date_effet': parametres['date_effet'].isoformat() if parametres.get('date_effet') else None,
            'date_echeance': parametres['date_echeance'].isoformat() if parametres.get('date_echeance') else None,
            'date_fin': parametres['date_fin'].isoformat() if parametres.get('date_fin') else None,
            'date_signature': parametres['date_signature'].isoformat(),
            'origine_des_fonds': parametres.get('origine_des_fonds', ''),
        }

        simulation = Simulation.objects.create(
            banque=banque,
            gestionnaire=user,
            agence=user.agence,
            produit='elikia',
            statut='calculee',
            donnees_entree=donnees_entree,
            resultats_calcul=resultats,
            nom_client=parametres.get('nom', ''),
            prenom_client=parametres.get('prenom', ''),
            email_client=parametres.get('email', ''),
            telephone_client=parametres.get('cellulaire', '') or parametres.get('telephone_domicile', ''),
        )

        # --- BÉNÉFICIAIRES en cas de décès ---
        beneficiaires_data = parametres.get('beneficiaires', [])

        if beneficiaires_data:
            total_parts = sum(Decimal(str(b.get('part_pourcentage', 0))) for b in beneficiaires_data)

            if abs(total_parts - Decimal('100.00')) > Decimal('0.01'):
                simulation.delete()
                raise ValidationError(
                    f"La somme des parts des bénéficiaires doit être 100% (actuellement : {total_parts}%)")

            for benef_data in beneficiaires_data:
                Beneficiaire.objects.create(
                    simulation=simulation,
                    qualite=benef_data.get('qualite', 'enfant'),
                    nom_prenoms=benef_data.get('nom_prenoms', ''),
                    part_pourcentage=Decimal(str(benef_data.get('part_pourcentage', 0))),
                    ordre=benef_data.get('ordre', 1)
                )

        return simulation

class SimulateurMobateliViewSet(viewsets.ViewSet):
    """
    ViewSet Mobateli — fidèle au Bulletin d'Adhésion NSIA (BIA).

    POST /api/v1/simulateur/mobateli/

    Body complet (toutes les sections du BIA) :
    {
        // RÉSERVÉ NSIA
        "numero_client_nsia": "123456",
        "nom_conseiller": "M. Bakala",

        // 1. SOUSCRIPTEUR
        "assure_est_souscripteur": true,

        // 2. ASSURÉ
        "titre_assure": "M",
        "nom": "Mbemba", "prenom": "Christ",
        "date_naissance": "1985-06-15",
        "lieu_naissance": "Brazzaville",
        "nationalite": "Congolaise",
        "situation_matrimoniale": "marie",
        "cellulaire": "+242069000000",
        "email": "c.mbemba@email.com",
        "profession": "Ingénieur", "employeur": "Total",

        // 3. FAMILLE (si FF)
        "conjoint": {"civilite": "MME", "nom": "Mbemba", "prenoms": "Grace",
                      "date_naissance": "1988-03-20"},
        "enfants": [{"nom_prenoms": "Mbemba Junior", "date_naissance": "2015-01-10"}],

        // 4. BÉNÉFICIAIRES
        "beneficiaires_predefinis": ["conjoint", "enfants"],
        "beneficiaires": [
            {"qualite": "conjoint", "nom_prenoms": "Mbemba Grace", "part_pourcentage": 60, "ordre": 1},
            {"qualite": "enfant", "nom_prenoms": "Mbemba Junior", "part_pourcentage": 40, "ordre": 2}
        ],

        // II. CAPITAUX ET PRIMES
        "capital_dtc_iad": 5000000,
        "garanties": {
            "deces_accidentel": {"souscrite": false},
            "ipt": {"souscrite": false},
            "ipp": {"souscrite": false},
            "frais_funeraires": {"souscrite": true, "option": "option_3"}
        },

        // PAIEMENT
        "mode_paiement": "prelevement_bancaire",
        "type_cotisation": "cotisations_annuelles",
        "duree_contrat": 10,
        "origine_des_fonds": "Salaire"
    }
    """
    permission_classes = [IsAuthenticated]

    def create(self, request):
        """Calcule et sauvegarde une simulation Mobateli."""
        # Validation des données d'entrée
        serializer = SimulateurMobateliInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        parametres = serializer.validated_data
        sauvegarder = parametres.pop('sauvegarder', True)
        
        # Récupérer la banque depuis le contexte (middleware)
        banque = request.user.banque if hasattr(request.user, 'banque') else None
        
        if not banque:
            return Response(
                {'error': 'Banque non trouvée pour cet utilisateur'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Initialiser le calculateur (vérifie automatiquement ProduitBanque)
            calculateur = CalculateurMobateli(banque)
            
            # Effectuer le calcul
            resultats = calculateur.calculer(parametres)
            resultats = injecter_dates_contrat(resultats, parametres)
            
            # Sauvegarder la simulation si demandé
            simulation = None
            if sauvegarder:
                simulation = self._sauvegarder_simulation(
                    request.user,
                    banque,
                    parametres,
                    resultats
                )
            
            # Préparer la réponse
            response_data = {
                'resultats': resultats,
                'message': 'Simulation calculée avec succès'
            }
            
            if simulation:
                response_data['simulation'] = SimulationDetailSerializer(simulation).data
            
            return Response(response_data, status=status.HTTP_200_OK)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _sauvegarder_simulation(self, user, banque, parametres, resultats):
        """
        Sauvegarde une simulation Mobateli.
        Toutes les données BIA sont dans donnees_entree (JSONField)
        — même pattern que emprunteur, elikia, etc.
        """
        # Sérialiser les dates
        def _iso(val):
            return val.isoformat() if val else None

        donnees_entree = {
            # --- RÉSERVÉ NSIA ---
            'numero_client_nsia': parametres.get('numero_client_nsia', ''),
            'nom_conseiller': parametres.get('nom_conseiller', ''),
            'numero_convention': parametres.get('numero_convention', ''),

            # --- 1. SOUSCRIPTEUR ---
            'assure_est_souscripteur': parametres.get('assure_est_souscripteur', True),
            'souscripteur': parametres.get('souscripteur'),

            # --- 2. ASSURÉ (identité) ---
            'titre_assure': parametres.get('titre_assure', ''),
            'nom': parametres.get('nom', ''),
            'prenom': parametres.get('prenom', ''),
            'date_naissance': _iso(parametres['date_naissance']),
            'lieu_naissance': parametres.get('lieu_naissance', ''),
            'nationalite': parametres.get('nationalite', ''),
            'numero_piece_identite': parametres.get('numero_piece_identite', ''),
            'type_piece_identite': parametres.get('type_piece_identite', ''),
            'situation_matrimoniale': parametres.get('situation_matrimoniale', ''),

            # --- 2. ASSURÉ (contacts) ---
            'adresse_geographique': parametres.get('adresse_geographique', ''),
            'adresse_postale': parametres.get('adresse_postale', ''),
            'telephone_domicile': parametres.get('telephone_domicile', ''),
            'cellulaire': parametres.get('cellulaire', ''),
            'telephone_bureau': parametres.get('telephone_bureau', ''),
            'email': parametres.get('email', ''),
            'email_professionnel': parametres.get('email_professionnel', ''),

            # --- 2. ASSURÉ (emploi) ---
            'profession': parametres.get('profession', ''),
            'employeur': parametres.get('employeur', ''),
            'adresse_employeur': parametres.get('adresse_employeur', ''),
            'telephone_employeur': parametres.get('telephone_employeur', ''),
            'poste_occupe': parametres.get('poste_occupe', ''),
            'numero_compte': parametres.get('numero_compte', ''),

            # --- 2. ASSURÉ (correspondant) ---
            'correspondant_nom': parametres.get('correspondant_nom', ''),
            'correspondant_telephone': parametres.get('correspondant_telephone', ''),
            'correspondant_cellulaire': parametres.get('correspondant_cellulaire', ''),

            # --- 3. FAMILLE ---
            'conjoint': parametres.get('conjoint'),
            'enfants': parametres.get('enfants'),

            # --- 4. BÉNÉFICIAIRES (cases pré-cochées) ---
            'beneficiaires_predefinis': parametres.get('beneficiaires_predefinis', []),

            # --- II. CAPITAUX & GARANTIES ---
            'capital_dtc_iad': int(parametres['capital_dtc_iad']),
            'age': parametres['age'],
            'garanties': parametres.get('garanties'),
            'option_frais_funeraires': self._extraire_option_ff(parametres),

            # --- PAIEMENT ---
            'mode_paiement': parametres.get('mode_paiement', ''),
            'type_cotisation': parametres.get('type_cotisation', ''),
            'duree_contrat': parametres.get('duree_contrat'),
            'date_premiere_prime': _iso(parametres.get('date_premiere_prime')),
            'date_effet': _iso(parametres.get('date_effet')),
            'date_echeance': _iso(parametres.get('date_echeance')),
            'origine_des_fonds': parametres.get('origine_des_fonds', ''),
        }

        simulation = Simulation.objects.create(
            banque=banque,
            gestionnaire=user,
            agence=user.agence,
            produit='mobateli',
            statut='calculee',
            donnees_entree=donnees_entree,
            resultats_calcul=resultats,
            # 4 champs communs à tous les produits
            nom_client=parametres.get('nom', ''),
            prenom_client=parametres.get('prenom', ''),
            email_client=parametres.get('email', ''),
            telephone_client=parametres.get('cellulaire', '') or parametres.get('telephone_domicile', ''),
        )

        # --- 4. BÉNÉFICIAIRES ---
        beneficiaires_data = parametres.get('beneficiaires', [])

        if beneficiaires_data:
            total_parts = sum(Decimal(str(b.get('part_pourcentage', 0))) for b in beneficiaires_data)

            if abs(total_parts - Decimal('100.00')) > Decimal('0.01'):
                simulation.delete()
                raise ValidationError(
                    f"La somme des parts des bénéficiaires doit être 100% (actuellement : {total_parts}%)"
                )

            for benef_data in beneficiaires_data:
                Beneficiaire.objects.create(
                    simulation=simulation,
                    qualite=benef_data.get('qualite', 'conjoint'),
                    nom_prenoms=benef_data.get('nom_prenoms', ''),
                    part_pourcentage=Decimal(str(benef_data.get('part_pourcentage', 0))),
                    ordre=benef_data.get('ordre', 1)
                )
        else:
            Beneficiaire.creer_beneficiaire_par_defaut(simulation)

        return simulation

    @staticmethod
    def _extraire_option_ff(parametres):
        """Extrait l'option Frais Funéraires depuis la structure garanties."""
        garanties = parametres.get('garanties')
        if not garanties:
            return None
        ff = garanties.get('frais_funeraires', {})
        if isinstance(ff, dict) and ff.get('souscrite'):
            return ff.get('option', '')
        return None


class SimulateurMobateliSurMesureViewSet(viewsets.ViewSet):
    """
    ViewSet pour le simulateur Mobateli Sur Mesure.
    Reproduction fidèle du simulateur Excel (Simulateur MOBATELI.xlsm).

    Deux volets :
    - DTC   : Input = prime → Output = capital (calcul actuariel inverse via CIMA_H)
    - DTC+FF : Input = capital → Output = prime (lookup forfaitaire + frais funéraires)

    Endpoint :
    - POST /api/v1/simulateur/mobateli-sur-mesure/
    """
    permission_classes = [IsAuthenticated]

    def create(self, request):
        """
        Calcule une simulation Mobateli Sur Mesure.

        POST /api/v1/simulateur/mobateli-sur-mesure/

        Body (volet DTC — prime → capital) :
        {
            "volet": "dtc",
            "prime": 500000,
            "date_naissance": "1988-06-15",
            "date_souscription": "2025-04-28",
            "duree": 1,
            "type_prime": "annuelle"
        }

        Body (volet DTC+FF — capital → prime) :
        {
            "volet": "dtc_ff",
            "capital": 5000000,
            "date_naissance": "1980-05-27",
            "date_souscription": "2025-04-28"
        }
        """
        serializer = SimulateurMobateliSurMesureInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parametres = serializer.validated_data
        sauvegarder = parametres.pop('sauvegarder', True)

        banque = request.user.banque if hasattr(request.user, 'banque') else None
        if not banque:
            return Response(
                {'error': 'Banque non trouvée pour cet utilisateur'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            calculateur = CalculateurMobateliSurMesure(banque)
            resultats = calculateur.calculer(parametres)
            resultats = injecter_dates_contrat(resultats, parametres)

            simulation = None
            if sauvegarder:
                simulation = self._sauvegarder_simulation(
                    request.user, banque, parametres, resultats
                )

            response_data = {
                'resultats': resultats,
                'message': 'Simulation Mobateli Sur Mesure calculée avec succès'
            }

            if simulation:
                response_data['simulation'] = SimulationDetailSerializer(simulation).data

            return Response(response_data, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _sauvegarder_simulation(self, user, banque, parametres, resultats):
        """
        Sauvegarde une simulation Mobateli Sur Mesure.
        Toutes les données BIA sont dans donnees_entree (JSONField)
        — même pattern que le forfaitaire.
        """
        volet = parametres['volet']

        # Sérialiser les dates
        def _iso(val):
            return val.isoformat() if val else None

        donnees_entree = {
            # --- MODE SUR MESURE ---
            'mode_calcul': 'sur_mesure',
            'volet': volet,
            'age': parametres['age'],
            'date_naissance': _iso(parametres['date_naissance']),
            'date_souscription': _iso(parametres['date_souscription']),

            # --- RÉSERVÉ NSIA ---
            'numero_client_nsia': parametres.get('numero_client_nsia', ''),
            'nom_conseiller': parametres.get('nom_conseiller', ''),
            'numero_convention': parametres.get('numero_convention', ''),

            # --- 1. SOUSCRIPTEUR ---
            'assure_est_souscripteur': parametres.get('assure_est_souscripteur', True),
            'souscripteur': parametres.get('souscripteur'),

            # --- 2. ASSURÉ (identité) ---
            'titre_assure': parametres.get('titre_assure', ''),
            'nom': parametres.get('nom', ''),
            'prenom': parametres.get('prenom', ''),
            'lieu_naissance': parametres.get('lieu_naissance', ''),
            'nationalite': parametres.get('nationalite', ''),
            'numero_piece_identite': parametres.get('numero_piece_identite', ''),
            'type_piece_identite': parametres.get('type_piece_identite', ''),
            'situation_matrimoniale': parametres.get('situation_matrimoniale', ''),

            # --- 2. ASSURÉ (contacts) ---
            'adresse_geographique': parametres.get('adresse_geographique', ''),
            'adresse_postale': parametres.get('adresse_postale', ''),
            'telephone_domicile': parametres.get('telephone_domicile', ''),
            'cellulaire': parametres.get('cellulaire', ''),
            'telephone_bureau': parametres.get('telephone_bureau', ''),
            'email': parametres.get('email', ''),
            'email_professionnel': parametres.get('email_professionnel', ''),

            # --- 2. ASSURÉ (emploi) ---
            'profession': parametres.get('profession', ''),
            'employeur': parametres.get('employeur', ''),
            'adresse_employeur': parametres.get('adresse_employeur', ''),
            'telephone_employeur': parametres.get('telephone_employeur', ''),
            'poste_occupe': parametres.get('poste_occupe', ''),
            'numero_compte': parametres.get('numero_compte', ''),

            # --- 2. ASSURÉ (correspondant) ---
            'correspondant_nom': parametres.get('correspondant_nom', ''),
            'correspondant_telephone': parametres.get('correspondant_telephone', ''),
            'correspondant_cellulaire': parametres.get('correspondant_cellulaire', ''),

            # --- 3. FAMILLE ---
            'conjoint': parametres.get('conjoint'),
            'enfants': parametres.get('enfants'),

            # --- 4. BÉNÉFICIAIRES (cases pré-cochées) ---
            'beneficiaires_predefinis': parametres.get('beneficiaires_predefinis', []),

            # --- II. CAPITAUX & GARANTIES ---
            # Pour DTC : capital_dtc_iad = résultat calculé (prime → capital)
            # Pour DTC+FF : capital_dtc_iad = input utilisateur (palier choisi)
            'capital_dtc_iad': (
                int(resultats['capital_dtc_iad'])
                if volet == 'dtc' and resultats.get('capital_dtc_iad')
                else int(parametres['capital_dtc_iad']) if parametres.get('capital_dtc_iad') else None
            ),
            'garanties': parametres.get('garanties'),

            # --- PAIEMENT ---
            'mode_paiement': parametres.get('mode_paiement', ''),
            'type_cotisation': parametres.get('type_cotisation', ''),
            'duree_contrat': parametres.get('duree_contrat'),
            'date_premiere_prime': _iso(parametres.get('date_premiere_prime')),
            'date_effet': _iso(parametres.get('date_effet')),
            'date_echeance': _iso(parametres.get('date_echeance')),
            'origine_des_fonds': parametres.get('origine_des_fonds', ''),
        }

        # Champs spécifiques au volet
        if volet == 'dtc':
            donnees_entree['prime'] = float(parametres['prime'])
            donnees_entree['duree'] = parametres.get('duree', 1)
            donnees_entree['type_prime'] = parametres.get('type_prime', 'annuelle')
        else:
            donnees_entree['capital'] = float(parametres['capital'])

        simulation = Simulation.objects.create(
            banque=banque,
            gestionnaire=user,
            agence=user.agence,
            produit='mobateli',
            statut='calculee',
            donnees_entree=donnees_entree,
            resultats_calcul=resultats,
            nom_client=parametres.get('nom', ''),
            prenom_client=parametres.get('prenom', ''),
            email_client=parametres.get('email', ''),
            telephone_client=parametres.get('cellulaire', '') or parametres.get('telephone_domicile', ''),
        )

        # --- BÉNÉFICIAIRES ---
        beneficiaires_data = parametres.get('beneficiaires', [])

        if beneficiaires_data:
            total_parts = sum(Decimal(str(b.get('part_pourcentage', 0))) for b in beneficiaires_data)

            if abs(total_parts - Decimal('100.00')) > Decimal('0.01'):
                simulation.delete()
                raise ValidationError(
                    f"La somme des parts des bénéficiaires doit être 100% (actuellement : {total_parts}%)"
                )

            for benef_data in beneficiaires_data:
                Beneficiaire.objects.create(
                    simulation=simulation,
                    qualite=benef_data.get('qualite', 'conjoint'),
                    nom_prenoms=benef_data.get('nom_prenoms', ''),
                    part_pourcentage=Decimal(str(benef_data.get('part_pourcentage', 0))),
                    ordre=benef_data.get('ordre', 1)
                )
        else:
            Beneficiaire.creer_beneficiaire_par_defaut(simulation)

        return simulation


class SimulationViewSet(SimulationQuestionnaireMixin,viewsets.ModelViewSet):
    """
    ViewSet pour gérer les simulations (CRUD)
    
    Endpoints:
    - GET    /api/v1/simulateur/historique/         : Liste des simulations
    - GET    /api/v1/simulateur/historique/{id}/    : Détail d'une simulation
    - PATCH  /api/v1/simulateur/historique/{id}/    : Modifier une simulation
    - DELETE /api/v1/simulateur/historique/{id}/    : Supprimer une simulation
    - POST   /api/v1/simulateur/historique/{id}/souscrire/ : Convertir en souscription
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SimulationCreateSerializer
    
    def get_queryset(self):
        """
        Retourne les simulations filtrées par banque de l'utilisateur.
        SECURITE : default deny — si le rôle n'est pas explicitement géré,
        aucune simulation n'est retournée.
        """
        user = self.request.user
        queryset = Simulation.objects.all()

        # Filtrage par rôle (du plus privilégié au moins privilégié)
        if user.est_super_admin or user.est_admin_nsia:
            pass  # Admins voient tout
        elif user.est_responsable_banque:
            queryset = queryset.filter(banque=user.banque)
        elif user.est_responsable_agence:
            queryset = queryset.filter(agence=user.agence)
        elif user.est_gestionnaire:
            queryset = queryset.filter(gestionnaire=user)
        else:
            # SECURITE : default deny — rôle non géré = aucun accès
            return Simulation.objects.none()
 
            
        
        # Filtres depuis les query params
        produit = self.request.query_params.get('produit')
        if produit:
            queryset = queryset.filter(produit=produit)
        
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        date_debut = self.request.query_params.get('date_debut')
        if date_debut:
            queryset = queryset.filter(date_creation__gte=date_debut)
        
        date_fin = self.request.query_params.get('date_fin')
        if date_fin:
            queryset = queryset.filter(date_creation__lte=date_fin)
        
        # Recherche textuelle
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search) |
                Q(nom_client__icontains=search) |
                Q(prenom_client__icontains=search) |
                Q(email_client__icontains=search)
            )
        
        return queryset.order_by('-date_creation')
    
    def get_serializer_class(self):
        """Utilise le serializer détaillé pour retrieve"""
        if self.action == 'retrieve':
            return SimulationDetailSerializer
        return SimulationCreateSerializer
    

    
    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """
        GET /api/v1/simulations/historique/dashboard/

        Retourne les KPI du dashboard :
        - Compteurs par statut (brouillon, calculée, proposition, contrat)
        - Tendances mois courant vs mois précédent
        - Répartition par produit
        - Taux de conversion

        Visibilité par rôle :
        - Gestionnaire → ses simulations uniquement
        - Responsable agence → toute la production de son agence
        - Responsable banque → toutes les opérations de sa banque
        """
        user = request.user

        # Queryset propre — filtre par rôle uniquement, pas de query params
        qs = Simulation.objects.filter(est_test=False)

        if hasattr(user, 'est_responsable_banque') and user.est_responsable_banque:
            qs = qs.filter(banque=user.banque)
        elif hasattr(user, 'est_responsable_agence') and user.est_responsable_agence:
            qs = qs.filter(agence=user.agence)
        elif hasattr(user, 'est_gestionnaire') and user.est_gestionnaire:
            qs = qs.filter(gestionnaire=user)

        now = timezone.now()
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        first_of_prev_month = (first_of_month - timedelta(days=1)).replace(day=1)

        # --- Compteurs globaux par statut ---
        total = qs.count()
        statuts_cibles = ['brouillon', 'calculee', 'validee', 'convertie']

        status_counts = {}
        current_counts = {}
        prev_counts = {}

        for statut in statuts_cibles:
            statut_qs = qs.filter(statut=statut)
            status_counts[statut] = statut_qs.count()
            current_counts[statut] = statut_qs.filter(
                date_creation__gte=first_of_month
            ).count()
            prev_counts[statut] = statut_qs.filter(
                date_creation__gte=first_of_prev_month,
                date_creation__lt=first_of_month,
            ).count()

        def calc_evolution(current, previous):
            if previous == 0:
                return 100 if current > 0 else 0
            return round(((current - previous) / previous) * 100)

        # --- Répartition par produit (comptage simple) ---
        by_product = {}
        for row in qs.values('produit').annotate(n=Count('id')).order_by('-n'):
            by_product[row['produit']] = row['n']

        # --- Taux de conversion ---
        total_converted = status_counts.get('convertie', 0)
        conversion_rate = round((total_converted / total) * 100, 1) if total > 0 else 0

        # --- Build response ---
        by_status = {}
        for statut in statuts_cibles:
            curr = current_counts[statut]
            prev = prev_counts[statut]
            by_status[statut] = {
                'count': status_counts[statut],
                'current_month': curr,
                'previous_month': prev,
                'evolution': calc_evolution(curr, prev),
            }

        return Response({
            'total': total,
            'by_status': by_status,
            'by_product': by_product,
            'conversion_rate': conversion_rate,
        })

    @action(detail=True, methods=['post'])
    def souscrire(self, request, pk=None):
        """
        Convertit une simulation en souscription

        POST /api/v1/simulateur/historique/{id}/souscrire/
        
        Body:
        {
            "nom": "Doe",
            "prenom": "John",
            "date_naissance": "1982-03-26",
            "email": "john.doe@example.com",
            "telephone": "+242123456789",
            "adresse": "123 Rue de la Paix, Brazzaville",
            "profession": "Ingénieur",
            "employeur": "TechCorp",
            "numero_compte": "123456789",
            "date_effet_contrat": "2025-02-01"
        }
        """
        simulation = self.get_object()
        
        # Vérifier si la simulation peut être convertie
        if not simulation.peut_etre_convertie():
            return Response(
                {'error': 'Cette simulation ne peut pas être convertie en souscription'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validation des données
        serializer = ConvertirEnSouscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        donnees = serializer.validated_data
        
        try:
            # Créer la souscription
            souscription = Souscription.objects.create(
                simulation=simulation,
                banque=simulation.banque,
                gestionnaire=request.user,
                statut='en_cours',
                nom=donnees['nom'],
                prenom=donnees['prenom'],
                date_naissance=donnees['date_naissance'],
                lieu_naissance=donnees.get('lieu_naissance', ''),
                email=donnees['email'],
                telephone=donnees['telephone'],
                adresse=donnees['adresse'],
                profession=donnees.get('profession', ''),
                employeur=donnees.get('employeur', ''),
                numero_compte=donnees.get('numero_compte', ''),
                documents=donnees.get('documents', {}),
                date_effet_contrat=donnees.get('date_effet_contrat'),
                montant_prime=simulation.get_montant_prime(),
                donnees_produit=simulation.resultats_calcul,
                notes=donnees.get('notes', ''),
                commentaires=donnees.get('commentaires', ''),
            )
            
            return Response(
                {
                    'message': 'Souscription créée avec succès',
                    'souscription': SouscriptionSerializer(souscription).data
                },
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la création de la souscription: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """
        Valide une simulation
        
        POST /api/v1/simulateur/historique/{id}/valider/
        """
        simulation = self.get_object()
        
        if simulation.statut == 'validee':
            return Response(
                {'error': 'Cette simulation est déjà validée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        simulation.marquer_comme_validee()
        
        return Response(
            {
                'message': 'Simulation validée avec succès',
                'simulation': SimulationDetailSerializer(simulation).data
            },
            status=status.HTTP_200_OK
        )


    def _verifier_acces_simulation(self, simulation, user):
        """
        SECURITE : vérifie que l'utilisateur a le droit d'accéder à cette simulation.
        Empêche les IDOR (accès à une simulation d'une autre banque).
        """
        if user.est_super_admin or user.est_admin_nsia:
            return True
        if user.est_responsable_banque:
            return simulation.banque == user.banque
        if user.est_responsable_agence:
            return simulation.agence == getattr(user, 'agence', None)
        if user.est_gestionnaire:
            return simulation.gestionnaire == user
        return False

    @action(detail=True, methods=['get'], url_path='telecharger-bia')
    def telecharger_bia(self, request, pk=None):
        """
        Télécharge le BIA en PDF

        GET /api/v1/simulations/{id}/telecharger-bia/
        """
        simulation = self.get_object()

        # SECURITE : vérification explicite de propriété (anti-IDOR)
        if not self._verifier_acces_simulation(simulation, request.user):
            return Response(
                {'error': 'Vous n\'avez pas accès à cette simulation.'},
                status=403
            )

        # Vérifier que la simulation a un questionnaire médical
        if not hasattr(simulation, 'questionnaire_medical'):
            return Response(
                {'error': 'Aucun questionnaire médical associé à cette simulation'},
                status=400
            )

        # Générer le BIA
        try:
            pdf_bytes = generer_bia(simulation.id)

            # Créer la réponse HTTP
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="BIA_{simulation.reference}.pdf"'

            # Audit logging
            logger.info(
                f"Export BIA: {request.user.username} a téléchargé le BIA de {simulation.reference}"
            )

            return response

        except Exception as e:
            logger.exception("Erreur génération BIA pour simulation %s", simulation.id)
            return Response(
                {'error': 'Erreur lors de la génération du BIA. Contactez le support.'},
                status=500
            )

    @action(detail=True, methods=['get'], url_path='apercu-bia')
    def apercu_bia(self, request, pk=None):
        """
        Affiche un aperçu du BIA dans le navigateur

        GET /api/v1/simulations/{id}/apercu-bia/
        """
        simulation = self.get_object()

        # SECURITE : vérification explicite de propriété (anti-IDOR)
        if not self._verifier_acces_simulation(simulation, request.user):
            return Response(
                {'error': 'Vous n\'avez pas accès à cette simulation.'},
                status=403
            )

        try:
            pdf_bytes = generer_bia(simulation.id)

            # Afficher dans le navigateur (inline)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="BIA_{simulation.reference}.pdf"'

            return response

        except Exception as e:
            logger.exception("Erreur aperçu BIA pour simulation %s", simulation.id)
            return Response(
                {'error': 'Erreur lors de la génération du BIA. Contactez le support.'},
                status=500
            )

class SouscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les souscriptions
    
    Endpoints:
    - GET    /api/v1/souscriptions/              : Liste des souscriptions
    - GET    /api/v1/souscriptions/{id}/         : Détail d'une souscription
    - PATCH  /api/v1/souscriptions/{id}/         : Modifier une souscription
    - POST   /api/v1/souscriptions/{id}/valider/ : Valider une souscription
    - POST   /api/v1/souscriptions/{id}/rejeter/ : Rejeter une souscription
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SouscriptionSerializer
    
    def get_queryset(self):
        """Retourne les souscriptions filtrées par banque"""
        user = self.request.user
        queryset = Souscription.objects.all()
        
        # Filtrer par banque
        if hasattr(user, 'banque') and user.banque:
            queryset = queryset.filter(banque=user.banque)
        
        # Filtres
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
        
        return queryset.order_by('-date_souscription')
    
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """
        Valide une souscription et génère le numéro de police
        
        POST /api/v1/souscriptions/{id}/valider/
        
        Body (optionnel):
        {
            "numero_police": "POL-BGFI-2025-00001"
        }
        """
        souscription = self.get_object()
        
        if souscription.statut == 'validee':
            return Response(
                {'error': 'Cette souscription est déjà validée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        numero_police = request.data.get('numero_police')
        souscription.valider(numero_police)
        
        return Response(
            {
                'message': 'Souscription validée avec succès',
                'souscription': SouscriptionSerializer(souscription).data
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def rejeter(self, request, pk=None):
        """
        Rejette une souscription
        
        POST /api/v1/souscriptions/{id}/rejeter/
        
        Body:
        {
            "motif": "Documents incomplets"
        }
        """
        souscription = self.get_object()
        
        if souscription.statut == 'rejetee':
            return Response(
                {'error': 'Cette souscription est déjà rejetée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        motif = request.data.get('motif')
        if not motif:
            return Response(
                {'error': 'Le motif de rejet est obligatoire'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        souscription.rejeter(motif)
        
        return Response(
            {
                'message': 'Souscription rejetée',
                'souscription': SouscriptionSerializer(souscription).data
            },
            status=status.HTTP_200_OK
        )

class QuestionnaireMedicalViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les questionnaires médicaux
    
    Endpoints:
    - GET /api/v1/questionnaires-medicaux/ : Liste des questionnaires
    - POST /api/v1/questionnaires-medicaux/ : Créer un questionnaire
    - GET /api/v1/questionnaires-medicaux/{id}/ : Détail questionnaire
    - PUT/PATCH /api/v1/questionnaires-medicaux/{id}/ : Modifier questionnaire
    - DELETE /api/v1/questionnaires-medicaux/{id}/ : Supprimer questionnaire
    
    Actions custom:
    - POST /api/v1/questionnaires-medicaux/{id}/recalculer-surprime/ : Recalcul
    - GET /api/v1/questionnaires-medicaux/bareme/ : Voir le barème
    - POST /api/v1/questionnaires-medicaux/{id}/appliquer-a-simulation/ : Appliquer surprime
    
    ⭐ NOUVEAUX ENDPOINTS DÉTAILS Q2:
    - GET /api/v1/questionnaires-medicaux/{id}/details/ : Liste des détails médicaux
    - POST /api/v1/questionnaires-medicaux/{id}/details/ : Ajouter un détail
    - GET /api/v1/questionnaires-medicaux/{id}/details/{detail_id}/ : Détail spécifique
    - PUT/PATCH /api/v1/questionnaires-medicaux/{id}/details/{detail_id}/ : Modifier détail
    - DELETE /api/v1/questionnaires-medicaux/{id}/details/{detail_id}/ : Supprimer détail
    """
    
    permission_classes = [IsAuthenticated]
    queryset = QuestionnaireMedical.objects.select_related(
        'simulation',
        'simulation__banque',
        'createur'
    ).prefetch_related('details_medicaux').all()  # ← Ajouter prefetch pour optimisation
    
    def get_serializer_class(self):
        """Choisir le serializer selon l'action"""
        if self.action == 'create':
            return QuestionnaireMedicalCreateSerializer
        elif self.action == 'retrieve':
            return QuestionnaireMedicalDetailSerializer
        return QuestionnaireMedicalSerializer
    
    def get_queryset(self):
        """
        Filtrage multi-tenant automatique selon le rôle de l'utilisateur
        """
        user = self.request.user
        qs = super().get_queryset()

        # Sécurité : si user non authentifié, ne rien retourner
        if not user.is_authenticated:
            return qs.none()

        # Super Admin NSIA : voir tous les questionnaires
        if user.role == 'SUPER_ADMIN':
            return qs

        # Admin NSIA : voir tous les questionnaires
        if user.role == 'ADMIN_NSIA':
            return qs

        # Responsable Banque : voir uniquement sa banque
        if user.role == 'RESPONSABLE_BANQUE' and user.banque:
            return qs.filter(simulation__banque=user.banque)

        # Gestionnaire : voir uniquement les questionnaires qu'il a créés
        if user.role == 'GESTIONNAIRE':
            return qs.filter(createur=user)

        # Support : voir tous les questionnaires (debug)
        if user.role == 'SUPPORT':
            return qs

        # Par défaut : ne rien retourner
        return qs.none()

    
    def create(self, request, *args, **kwargs):
        """
        Création d'un questionnaire médical
        Calcul automatique de la surprime
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Vérifier que la simulation existe et appartient à la banque de l'utilisateur
        simulation_id = serializer.validated_data.get('simulation').id
        simulation = get_object_or_404(Simulation, id=simulation_id)
        
        # Vérification multi-tenant
        if request.user.role in ['GESTIONNAIRE', 'RESPONSABLE_BANQUE']:
            if simulation.banque != request.user.banque:
                return Response(
                    {'detail': 'Vous ne pouvez pas créer un questionnaire pour une autre banque'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Vérifier qu'il n'existe pas déjà un questionnaire pour cette simulation
        if hasattr(simulation, 'questionnaire_medical'):
            return Response(
                {'detail': 'Un questionnaire médical existe déjà pour cette simulation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer le questionnaire (le calcul se fait automatiquement dans le serializer)
        questionnaire = serializer.save()
        
        # Retourner avec le serializer détaillé
        output_serializer = QuestionnaireMedicalDetailSerializer(questionnaire)
        
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    # ============================================
    # ⭐ NOUVEAUX ENDPOINTS : GESTION DES DÉTAILS Q2
    # ============================================
    
    @action(detail=True, methods=['get', 'post'], url_path='details')
    def details_medicaux(self, request, pk=None):
        """
        GET  → Liste des détails médicaux
        POST → Ajout d'un ou plusieurs détails médicaux
        """
        questionnaire = self.get_object()

        # ======================
        # GET
        # ======================
        if request.method == 'GET':
            details = questionnaire.details_medicaux.all().order_by('date_creation')
            serializer = DetailQ2Serializer(details, many=True)

            return Response({
                'questionnaire_id': str(questionnaire.id),
                'nombre_details': details.count(),
                'details': serializer.data
            })

        # ======================
        # POST
        # ======================
        data = request.data
        is_many = isinstance(data, list)

        # Injecter le questionnaire dans chaque item
        if is_many:
            for item in data:
                item['questionnaire'] = str(questionnaire.id)
        else:
            data['questionnaire'] = str(questionnaire.id)

        serializer = DetailQ2Serializer(data=data, many=is_many)

        if serializer.is_valid():
            details = serializer.save()

            return Response(
                DetailQ2Serializer(details, many=is_many).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'put', 'patch', 'delete'], 
            url_path='details/(?P<detail_id>[^/.]+)')
    def detail_medical_specifique(self, request, pk=None, detail_id=None):
        """
        Gérer un détail médical spécifique
        
        GET /api/v1/questionnaires-medicaux/{id}/details/{detail_id}/
        → Récupère un détail spécifique
        
        PUT/PATCH /api/v1/questionnaires-medicaux/{id}/details/{detail_id}/
        → Modifie un détail
        
        DELETE /api/v1/questionnaires-medicaux/{id}/details/{detail_id}/
        → Supprime un détail
        """
        questionnaire = self.get_object()
        
        # Récupérer le détail spécifique
        detail = get_object_or_404(
            DetailQ2,
            id=detail_id,
            questionnaire=questionnaire
        )
        
        if request.method == 'GET':
            serializer = DetailQ2Serializer(detail)
            return Response(serializer.data)
        
        elif request.method in ['PUT', 'PATCH']:
            partial = request.method == 'PATCH'
            serializer = DetailQ2Serializer(detail, data=request.data, partial=partial)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            detail.delete()
            return Response(
                {'message': 'Détail médical supprimé avec succès'},
                status=status.HTTP_204_NO_CONTENT
            )
    
    @action(detail=True, methods=['get'], url_path='questions-avec-oui')
    def questions_avec_oui(self, request, pk=None):
        """
        Liste les questions qui ont une réponse OUI
        (donc qui nécessitent des détails)
        
        GET /api/v1/questionnaires-medicaux/{id}/questions-avec-oui/
        
        Retourne:
        {
            "questionnaire_id": "...",
            "questions_oui": [
                {
                    "question_field": "malade_6_derniers_mois",
                    "question_label": "Avez-vous été malade...",
                    "a_details": true/false
                },
                ...
            ]
        }
        """
        questionnaire = self.get_object()
        
        # Liste des champs médicaux
        questions_medicales = [
            ('a_infirmite', "Êtes-vous atteint d'une infirmité ?"),
            ('malade_6_derniers_mois', "Avez-vous été malade au cours des 6 derniers mois ?"),
            ('souvent_fatigue', "Êtes-vous souvent fatigué(e) ?"),
            ('perte_poids_recente', "Avez-vous maigri depuis les 6 derniers mois ?"),
            ('prise_poids_recente', "Avez-vous grossi depuis les 6 derniers mois ?"),
            ('a_ganglions', "Avez-vous des ganglions, furoncles, abcès ou maladies de la peau ?"),
            ('fievre_persistante', "Toussez-vous depuis quelques temps avec fièvre ?"),
            ('plaies_buccales', "Avez-vous des plaies dans la bouche ?"),
            ('diarrhee_frequente', "Faites-vous souvent la diarrhée ?"),
            ('ballonnement', "Êtes-vous souvent ballonné(e) ?"),
            ('oedemes_membres_inferieurs', "Avez-vous eu des œdèmes des Membres Inférieurs (O.M.I) ?"),
            ('essoufflement', "Êtes-vous essoufflé(e) au moindre effort ?"),
            ('a_eu_perfusion', "Avez-vous déjà reçu une perfusion ?"),
            ('a_eu_transfusion', "Avez-vous déjà reçu une transfusion de sang ?"),
        ]
        
        questions_oui = []
        
        for field, label in questions_medicales:
            valeur = getattr(questionnaire, field, False)
            
            if valeur:  # Si OUI
                # Vérifier si des détails existent
                a_details = questionnaire.details_medicaux.filter(
                    question_field=field
                ).exists()
                
                questions_oui.append({
                    'question_field': field,
                    'question_label': label,
                    'a_details': a_details
                })
        
        return Response({
            'questionnaire_id': str(questionnaire.id),
            'nombre_questions_oui': len(questions_oui),
            'questions_oui': questions_oui
        })
    
    # ============================================
    # ENDPOINTS EXISTANTS (conservés)
    # ============================================
    
    @action(detail=True, methods=['post'], url_path='recalculer-surprime')
    def recalculer_surprime(self, request, pk=None):
        """
        Recalcule la surprime pour un questionnaire existant
        
        POST /api/v1/questionnaires-medicaux/{id}/recalculer-surprime/
        """
        questionnaire = self.get_object()
        
        # Recalcul
        resultats = calculer_et_appliquer_surprime(questionnaire)
        
        # Recharger depuis la DB
        questionnaire.refresh_from_db()
        
        # Préparer la réponse
        response_data = {
            'id': questionnaire.id,
            'score_risque': resultats['score_risque'],
            'taux_surprime': resultats['taux_surprime'],
            'categorie_risque': resultats['categorie_risque'],
            'statut': questionnaire.statut,
            'details': resultats['details'],
            'message': 'Surprime recalculée avec succès',
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'], url_path='bareme')
    def bareme(self, request):
        """
        Retourne le barème complet de calcul de surprime
        
        GET /api/v1/questionnaires-medicaux/bareme/
        """
        calculateur = CalculateurSurprime()
        bareme = calculateur.obtenir_bareme_complet()
        
        serializer = BaremeSurprimeSerializer(bareme)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='appliquer-a-simulation')
    def appliquer_a_simulation(self, request, pk=None):
        """
        Applique la surprime calculée à la simulation
        Recalcule la prime totale
        
        POST /api/v1/questionnaires-medicaux/{id}/appliquer-a-simulation/
        """
        questionnaire = self.get_object()
        simulation = questionnaire.simulation
        
        # Vérifier que le questionnaire a été calculé
        if questionnaire.statut == 'en_attente':
            return Response(
                {'detail': 'Le questionnaire n\'a pas encore été analysé'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier que la simulation est dans un état modifiable
        if simulation.statut not in ['calculee', 'calculee_avec_surprime']:
            return Response(
                {'detail': f'La simulation est en statut "{simulation.statut}" et ne peut plus être modifiée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Récupérer la prime de base
        prime_base = simulation.prime_totale or Decimal('0')
        
        # Calculer la surprime en montant
        taux_surprime = questionnaire.taux_surprime / Decimal('100')
        montant_surprime = prime_base * taux_surprime
        
        # Nouvelle prime totale
        prime_totale = prime_base + montant_surprime
        
        # Mettre à jour la simulation
        simulation.surprime_taux = questionnaire.taux_surprime
        simulation.prime_totale = prime_totale
        simulation.statut = 'calculee_avec_surprime'
        simulation.save()
        
        # Réponse
        response_data = {
            'simulation_id': simulation.id,
            'reference': simulation.reference,
            'prime_base': float(prime_base),
            'taux_surprime': float(questionnaire.taux_surprime),
            'montant_surprime': float(montant_surprime),
            'prime_totale': float(prime_totale),
            'statut': simulation.statut,
            'message': 'Surprime appliquée avec succès à la simulation',
        }
        
        return Response(response_data)

class ExportBIAView(APIView):
    """
    API pour exporter un BIA (Bulletin d'Adhésion) en PDF
    
    Endpoint: GET /api/v1/simulations/{id}/export-bia/
    
    Permissions:
        - Authentifié
        - Propriétaire de la simulation ou Admin/Support NSIA
        - Respect du contexte multi-tenant (banque)
    
    Returns:
        - 200: PDF du BIA (3 pages)
        - 403: Accès refusé (pas propriétaire ou mauvaise banque)
        - 404: Simulation non trouvée
        - 500: Erreur de génération
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, simulation_id):
        """
        Génère et retourne le BIA en PDF
        
        Args:
            simulation_id: ID de la simulation à exporter
            
        Returns:
            HttpResponse avec le PDF en pièce jointe
        """
        try:
            # 1. Récupérer la simulation avec les relations
            simulation = self._get_simulation(request.user, simulation_id)
            
            # 2. Vérifier que la simulation peut être exportée
            self._verifier_statut_simulation(simulation)
            
            # 3. Générer le BIA
            generateur = GenerateurBIA(simulation)
            pdf_content = generateur.generer()
            filename = generateur.get_filename()
            
            # 4. Préparer la réponse HTTP
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Length'] = len(pdf_content)
            
            # 5. Enregistrer l'action dans les logs (optionnel)
            self._log_export(simulation, request.user)
            
            return response
            
        except Simulation.DoesNotExist:
            return Response(
                {'error': 'Simulation non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération du BIA : {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_simulation(self, user, simulation_id):
        """
        Récupère la simulation avec vérification des permissions multi-tenant
        
        Args:
            user: Utilisateur connecté
            simulation_id: ID de la simulation
            
        Returns:
            Simulation: Instance de la simulation
            
        Raises:
            Simulation.DoesNotExist: Si simulation introuvable
            PermissionError: Si l'utilisateur n'a pas accès
        """
        # Récupérer la simulation avec les relations nécessaires
        simulation = Simulation.objects.select_related(
            'banque',
            #'createur',
            'questionnaire_medical'
        ).get(id=simulation_id)
        
        # Vérification des permissions multi-tenant
        if not self._can_access_simulation(user, simulation):
            raise PermissionError(
                "Vous n'avez pas accès à cette simulation. "
                "Vérifiez que vous appartenez à la même banque."
            )
        
        return simulation
    
    def _can_access_simulation(self, user, simulation):
        """
        Vérifie si l'utilisateur peut accéder à la simulation
        
        Args:
            user: Utilisateur connecté
            simulation: Instance de Simulation
            
        Returns:
            bool: True si accès autorisé
        """
        # Super Admin NSIA ou Admin NSIA : Accès total
        if hasattr(user, 'role') and user.role in ['super_admin_nsia', 'admin_nsia', 'support']:
            return True
        
        # Utilisateurs banque : Doivent appartenir à la même banque
        if hasattr(user, 'banque') and user.banque:
            return user.banque == simulation.banque
        
        # Créateur de la simulation : Accès autorisé
        if simulation.createur == user:
            return True
        
        return False
    
    def _verifier_statut_simulation(self, simulation):
        """
        Vérifie que la simulation peut être exportée
        
        Args:
            simulation: Instance de Simulation
            
        Raises:
            PermissionError: Si le statut ne permet pas l'export
        """
        # Liste des statuts autorisés pour l'export
        statuts_autorises = ['calculee', 'validee', 'convertie']
        
        if simulation.statut not in statuts_autorises:
            raise PermissionError(
                f"Impossible d'exporter une simulation au statut '{simulation.statut}'. "
                f"Statuts autorisés : {', '.join(statuts_autorises)}"
            )
    
    def _log_export(self, simulation, user):
        """
        Enregistre l'action d'export dans les logs (optionnel)
        
        Args:
            simulation: Simulation exportée
            user: Utilisateur qui a effectué l'export
        """
        # TODO: Implémenter un système de logging si nécessaire
        # Exemple: ActivityLog.objects.create(
        #     user=user,
        #     action='export_bia',
        #     simulation=simulation,
        #     timestamp=timezone.now()
        # )
        pass

class PreviewBIAView(APIView):
    """
    API pour prévisualiser un BIA sans le télécharger
    
    Endpoint: GET /api/v1/simulations/{id}/preview-bia/
    
    Affiche le PDF dans le navigateur au lieu de le télécharger
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, simulation_id):
        """
        Génère et affiche le BIA dans le navigateur
        
        Args:
            simulation_id: ID de la simulation
            
        Returns:
            HttpResponse avec le PDF en inline
        """
        try:
            # Réutiliser la logique de ExportBIAView
            export_view = ExportBIAView()
            simulation = export_view._get_simulation(request.user, simulation_id)
            export_view._verifier_statut_simulation(simulation)
            
            # Générer le BIA
            generateur = GenerateurBIA(simulation.id)
            pdf_content = generateur.generer()
            filename = generateur.get_filename()
            
            # Afficher dans le navigateur (inline au lieu de attachment)
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            response['Content-Length'] = len(pdf_content)
            
            return response
            
        except Simulation.DoesNotExist:
            return Response(
                {'error': 'Simulation non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération du BIA : {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class InfoExportBIAView(APIView):
    """
    API pour obtenir des informations sur l'export BIA d'une simulation
    
    Endpoint: GET /api/v1/simulations/{id}/bia-info/
    
    Retourne:
        - Statut de la simulation
        - Présence du questionnaire médical
        - Fichiers disponibles (pages 1 et 3)
        - Nom du fichier qui sera généré
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, simulation_id):
        """
        Retourne les informations sur l'export BIA
        
        Args:
            simulation_id: ID de la simulation
            
        Returns:
            dict: Informations sur l'export
        """
        try:
            # Récupérer la simulation
            export_view = ExportBIAView()
            simulation = export_view._get_simulation(request.user, simulation_id)
            
            # Instancier le générateur
            generateur = GenerateurBIA(simulation)
            
            # Vérifier les fichiers disponibles
            page1_exists = generateur._get_page1_path() is not None
            page3_exists = generateur._get_page3_path() is not None
            
            # Préparer les informations
            info = {
                'simulation': {
                    'id': simulation.id,
                    'reference': simulation.reference,
                    'statut': simulation.statut,
                    'peut_exporter': simulation.statut in ['calculee', 'validee', 'convertie']
                },
                'questionnaire_medical': {
                    'complete': generateur.questionnaire is not None,
                    'surprime_appliquee': (
                        generateur.questionnaire.taux_surprime > 0 
                        if generateur.questionnaire else False
                    )
                },
                'fichiers': {
                    'page1_produit': {
                        'disponible': page1_exists,
                        'type': 'Image produit',
                        'placeholder': not page1_exists
                    },
                    'page2_formulaire': {
                        'disponible': True,
                        'type': 'Formulaire Q1/Q2 généré dynamiquement'
                    },
                    'page3_convention': {
                        'disponible': page3_exists,
                        'type': f'Convention {simulation.banque.nom_complet} - NSIA',
                        'placeholder': not page3_exists
                    }
                },
                'export': {
                    'filename': generateur.get_filename(),
                    'produit': generateur.produit,
                    'banque': simulation.banque.nom_complet
                }
            }
            
            return Response(info, status=status.HTTP_200_OK)
            
        except Simulation.DoesNotExist:
            return Response(
                {'error': 'Simulation non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur : {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class ExportSimulationsViewSet(viewsets.ViewSet):
    """
    Views pour l'export des simulations en CSV et JSON
    Gère les filtres hiérarchiques : BANQUE > AGENCE > GESTIONNAIRE > PRODUIT
    """

    """
    ViewSet pour l'export des simulations
    
    Endpoints:
    - GET /export-csv/ : Export CSV avec les 21 colonnes fixes
    - GET /export-json/ : Export JSON complet (donnees_entree + resultats_calcul)
    
    Filtres hiérarchiques:
    - banque (code de la banque)
    - agence (nom de l'agence)
    - gestionnaire (ID du gestionnaire)
    - produit (emprunteur, retraite, etudes, elikia, mobateli)
    - statut (brouillon, calculee, validee, convertie)
    - date_debut (format: YYYY-MM-DD)
    - date_fin (format: YYYY-MM-DD)
    """
    
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.export_service = ExportService()
    
    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """
        Export CSV des simulations avec les 21 colonnes fixes
        
        Query params:
        - banque: Code de la banque (ex: CDCO)
        - agence: Nom de l'agence (ex: Centre-Ville)
        - gestionnaire: ID du gestionnaire
        - produit: Type de produit
        - statut: Statut des simulations
        - date_debut: Date de début (YYYY-MM-DD)
        - date_fin: Date de fin (YYYY-MM-DD)
        
        Returns:
            Fichier CSV téléchargeable
        """
        print("Je suis dans export")
        try:
            # Récupérer les simulations avec filtres
            simulations, filtres = self._appliquer_filtres(request)
            
            # Vérifier qu'il y a des données
            if not simulations.exists():
                return Response(
                    {'error': 'Aucune simulation trouvée avec ces filtres'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Générer le CSV
            fichier_csv = self.export_service.exporter_csv(simulations, filtres)
            nom_fichier = self.export_service.generer_nom_fichier('xlsx', filtres)
            print("LE NOM EST ICI",nom_fichier)
            
            # Créer la réponse HTTP
            response = HttpResponse(
                fichier_csv.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'export xlsx: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='export-json')
    def export_json(self, request):
        """
        Export JSON complet des simulations
        Inclut donnees_entree + resultats_calcul + métadonnées
        
        Query params: Identiques à export-csv
        
        Returns:
            Fichier JSON téléchargeable
        """
        try:
            # Récupérer les simulations avec filtres
            simulations, filtres = self._appliquer_filtres(request)
            
            # Vérifier qu'il y a des données
            if not simulations.exists():
                return Response(
                    {'error': 'Aucune simulation trouvée avec ces filtres'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Générer le JSON
            fichier_json = self.export_service.exporter_json(simulations, filtres)
            nom_fichier = self.export_service.generer_nom_fichier('json', filtres)
            
            # Créer la réponse HTTP
            response = HttpResponse(
                fichier_json.getvalue(),
                content_type='application/json; charset=utf-8'
            )
            response['Content-Disposition'] = f'attachment; filename="{nom_fichier}"'
            
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'export JSON: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='statistiques')
    def statistiques_export(self, request):
        """
        Retourne les statistiques sur les simulations disponibles pour export
        Utile pour afficher à l'utilisateur avant l'export
        
        Returns:
            JSON avec statistiques par produit, statut, etc.
        """
        try:
            simulations, filtres = self._appliquer_filtres(request)
            
            # Statistiques globales
            stats = {
                'total': simulations.count(),
                'filtres_appliques': filtres,
                'par_produit': {},
                'par_statut': {},
            }
            
            # Par produit
            for produit_code, produit_nom in Simulation.PRODUIT_CHOICES:
                count = simulations.filter(produit=produit_code).count()
                if count > 0:
                    stats['par_produit'][produit_nom] = count
            
            # Par statut
            for statut_code, statut_nom in Simulation.STATUT_CHOICES:
                count = simulations.filter(statut=statut_code).count()
                if count > 0:
                    stats['par_statut'][statut_nom] = count
            
            return Response(stats, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul des statistiques: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _appliquer_filtres(self, request):
        """
        Applique les filtres hiérarchiques sur les simulations
        BANQUE > AGENCE > GESTIONNAIRE > PRODUIT
        
        Args:
            request: Request HTTP avec query params
            
        Returns:
            tuple: (QuerySet filtré, dict des filtres appliqués)
        """
        user = self.request.user
        queryset = Simulation.objects.all()
        
        # Filtrer par banque si l'utilisateur est rattaché à une banque
        if user.est_responsable_banque:
            queryset = queryset.filter(banque=user.banque)
        if user.est_responsable_agence:
            queryset = queryset.filter(agence=user.agence)
        elif user.est_gestionnaire:
            queryset = queryset.filter(gestionnaire=user)
        elif user.est_admin_nsia:
            queryset = Simulation.objects.all()
        
        # Dictionnaire pour stocker les filtres appliqués
        filtres = {}
        
        # FILTRE 1 : Banque (code)
        banque_code = request.query_params.get('banque')
        if banque_code:
            from apps.core.models import Banque
            try:
                banque_obj = Banque.objects.get(code_banque__iexact=banque_code)
                queryset = queryset.filter(banque=banque_obj)
                filtres['banque'] = banque_code.upper()
            except Banque.DoesNotExist:
                queryset = queryset.none()
                filtres['banque'] = banque_code.upper()
        
        # FILTRE 2 : Agence
        agence = request.query_params.get('agence')
        if agence:
            queryset = queryset.filter(
                Q(donnees_entree__agence__icontains=agence) |
                Q(agence__icontains=agence)
            )
            filtres['agence'] = agence
        
        # FILTRE 3 : Gestionnaire (ID)
        gestionnaire_id = request.query_params.get('gestionnaire')
        if gestionnaire_id:
            queryset = queryset.filter(gestionnaire_id=gestionnaire_id)
            filtres['gestionnaire'] = gestionnaire_id
        
        # FILTRE 4 : Produit
        produit = request.query_params.get('produit')
        if produit:
            queryset = queryset.filter(produit=produit.lower())
            filtres['produit'] = produit.lower()
        
        # FILTRE 5 : Statut
        statut = request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut.lower())
            filtres['statut'] = statut.lower()
        
        # FILTRE 6 : Période (date_debut et date_fin)
        date_debut = request.query_params.get('date_debut')
        date_fin = request.query_params.get('date_fin')
        
        if date_debut:
            queryset = queryset.filter(date_creation__gte=date_debut)
            filtres['date_debut'] = date_debut
        
        if date_fin:
            queryset = queryset.filter(date_creation__lte=date_fin)
            filtres['date_fin'] = date_fin
        
        # Optimisation : select_related pour réduire les requêtes
        queryset = queryset.select_related('banque', 'gestionnaire').order_by('-date_creation')
        
        return queryset, filtres

class EpargnePlusViewSet(viewsets.ViewSet):
    """
    ViewSet pour ÉPARGNE PLUS
    
    Endpoints:
    - POST /api/v1/simulations/epargne-plus/
    - POST /api/v1/simulations/epargne-plus/rachat-anticipe/
    - POST /api/v1/simulations/epargne-plus/rachat-partiel/
    - GET /api/v1/simulations/epargne-plus/limites/
    """
    permission_classes = [IsAuthenticated]

    
    
    def _get_banque(self, request):
        """Récupère la banque depuis les paramètres ou l'utilisateur"""
        banque = request.user.banque if hasattr(request.user, 'banque') else None

        return banque
    
   
    @extend_schema(
        request=EpargnePlusInputSerializer,
        description="Simule un contrat Épargne Plus avec capitalisation mensuelle"
    )
    def create(self, request):
        """
        POST /api/v1/simulations/epargne-plus/?banque=BGFI
        
        Body: {
          "cotisation_mensuelle": 10000,
          "duree_annees": 5,
          "avec_details": false,
          "nom": "BOKASSA",
          "prenom": "Jean",
          "date_naissance": "1985-05-15",
          "telephone": "+242 06 123 45 67",
          "email": "jean.bokassa@example.com"
        }
        """
         # Validation des données d'entrée
        serializer = EpargnePlusInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        parametres = serializer.validated_data

        #print(parametres)

        sauvegarder = parametres.pop('sauvegarder', False)

        avec_details = parametres.pop('avec_details', False)
        
        # Récupérer la banque depuis le contexte (middleware)
        banque = request.user.banque if hasattr(request.user, 'banque') else None
        
        if not banque:
            return Response(
                {'error': 'Banque non trouvée pour cet utilisateur'},
               
                status=status.HTTP_400_BAD_REQUEST
            )
        

    
        try:
            # Initialiser le calculateur
            calculateur = CalculateurEpargnePlus(banque)
            
            # Effectuer le calcul
            resultats = calculateur.calculer(parametres, avec_details)
            resultats = injecter_dates_contrat(resultats, parametres)
            
            # Sauvegarder la simulation si demandé
            simulation = None
            if sauvegarder:
                simulation = self._sauvegarder_simulation(
                    user=request.user,
                    banque=banque,
                    parametres=parametres,
                    resultats=resultats
                )
            
            # Préparer la réponse
            response_data = {
                'resultats': resultats,
                'message': 'Simulation calculée avec succès'
            }
            
            if simulation:
                response_data['simulation'] = SimulationDetailSerializer(simulation).data

            
            return Response(response_data, status=status.HTTP_200_OK)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    

    def _sauvegarder_simulation(self, user, banque, parametres, resultats):
        """
        Sauvegarde une simulation Épargne Plus en base de données
        
        Args:
            request: Request Django REST
            parametres: Dict des paramètres d'entrée (cotisation, durée, etc.)
            resultats: Dict des résultats de simulation
            
        Returns:
            Simulation: Instance créée
        """

        donnees_entrees = {

            'cotisation_mensuelle': parametres['cotisation_mensuelle'],
            'duree_annees': parametres['duree_annees'],

            'periodicite': parametres['periodicite'],
            'numero_compte': parametres.get('numero_compte'),
            'numero_compte_cle': parametres.get('numero_compte_cle'),
            'banque_client': parametres.get('banque_client'),
            'agence_client': parametres.get('agence_client'),
            
            'profession': parametres.get('profession'),
            'employeur': parametres.get('employeur'),
            'situation_matrimoniale': parametres.get('situation_matrimoniale'),
            'adresse_postale': parametres.get('adresse_postale'),
            
            'titre_assure': parametres.get('titre_assure'),  # 'Monsieur' ou 'Madame'
            'lieu_naissance': parametres.get('lieu_naissance'),  # Ville de naissance
            'date_naissance': parametres['date_naissance'].isoformat(),

            'date_premiere_cotisation': parametres['date_premiere_cotisation'].isoformat(),
            'date_effet': parametres.get('date_effet', '').isoformat() if parametres.get('date_effet') else None,
            'date_echeance': parametres['date_echeance'].isoformat() if parametres.get('date_echeance') else None,
            'date_fin': parametres['date_fin'].isoformat() if parametres.get('date_fin') else None,

            'mode_paiement': parametres.get('mode_paiement'),
            'origine_fonds': parametres.get('origine_fonds'),
            'deja_souscrit_nsia': parametres.get('deja_souscrit_nsia'),
            'contrats_nsia_existants': parametres.get('contrats_nsia_existants'),

            'numero_convention': parametres.get('numero_convention'),  # N° convention banque-NSIA
        }
        try:
            # Récupérer la banque
            #banque = parametres.get('banque')
            
            # Créer la simulation
            simulation = Simulation.objects.create(
                gestionnaire=user,
                banque=banque,
                resultats_calcul=resultats,
                produit='epargne_plus',
                nom_client=parametres.get('nom', ''),
                prenom_client=parametres.get('prenom', ''),
                donnees_entree = donnees_entrees,
                telephone_client=parametres.get('telephone', ''),
                email_client=parametres.get('email', '')
            )

            # ============================================
            # GESTION DES BÉNÉFICIAIRES
            # ============================================
            beneficiaires_data = parametres.get('beneficiaires', [])
            
            if beneficiaires_data:
                # Valider que la somme des parts = 100%
                total_parts = sum(Decimal(str(b.get('part_pourcentage', 0))) for b in beneficiaires_data)
                
                if abs(total_parts - Decimal('100.00')) > Decimal('0.01'):
                    # Supprimer la simulation si validation échoue
                    simulation.delete()
                    raise ValidationError(
                        f"La somme des parts des bénéficiaires doit être 100% (actuellement : {total_parts}%)"
                    )
                # Si les autres beneficiaires retraite existent, on cree d'abord l'assuré comme beneficiaire
                Beneficiaire.creer_beneficiaire_par_defaut(simulation)
                
                # Créer les bénéficiaires fournis
                for benef_data in beneficiaires_data:
                    Beneficiaire.objects.create(
                        simulation=simulation,
                        qualite=benef_data.get('qualite', 'organisme_pret'),
                        nom_prenoms=benef_data.get('nom_prenoms', ''),
                        part_pourcentage=Decimal(str(benef_data.get('part_pourcentage', 0))),
                        ordre=benef_data.get('ordre', 1)
                    )
            else:
                # Aucun bénéficiaire fourni → Créer bénéficiaire par défaut
                # Organisme de prêt (la banque) à 100%
                # Ou uniquement l'assuré comme beneficiaire coté retraite
                Beneficiaire.creer_beneficiaire_par_defaut(simulation)
            
            
            return simulation
            
        except Exception as e:
            # Logger l'erreur mais ne pas bloquer la réponse
            print(f"Erreur sauvegarde simulation Épargne Plus: {str(e)}")
            return None
        
    @action(detail=False, methods=['post'], url_path='rachat-anticipe')
    @extend_schema(
        request=RachatAnticipeInputSerializer,
        description="Calcule le montant en cas de rachat anticipé (total)"
    )
    def rachat_anticipe(self, request):
        """
        POST /api/v1/simulations/epargne-plus/rachat-anticipe/?banque=BGFI
        
        Body: {
          "cotisation_mensuelle": 10000,
          "duree_annees": 5,
          "mois_rachat": 24
        }
        """
        serializer = RachatAnticipeInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            banque = self._get_banque(request)
            calculateur = CalculateurEpargnePlus()
            
            parametres = {
                'cotisation_mensuelle': serializer.validated_data['cotisation_mensuelle'],
                'duree_annees': serializer.validated_data['duree_annees'],
                'banque': banque,
            }
            mois_rachat = serializer.validated_data['mois_rachat']
            
            resultats = calculateur.calculer_rachat_anticipe(parametres, mois_rachat)
            
            return Response(resultats, status=status.HTTP_200_OK)
            
        except Banque.DoesNotExist:
            return Response({'error': 'Banque non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='rachat-partiel')
    @extend_schema(
        description="Calcule un rachat partiel selon les règles BGFI (50% ou 85% max)"
    )
    def rachat_partiel(self, request):
        """
        POST /api/v1/simulations/epargne-plus/rachat-partiel/?banque=BGFI
        
        Body: {
          "cotisation_mensuelle": 10000,
          "duree_annees": 5,
          "mois_rachat": 18,
          "pourcentage_rachat": 50.0
        }
        
        Règles BGFI:
        - 12-23 mois : max 50%
        - 24+ mois : max 85%
        """
        from rest_framework import serializers
        
        # Serializer inline pour rachat partiel
        class RachatPartielInputSerializer(serializers.Serializer):
            cotisation_mensuelle = serializers.IntegerField(
                required=True,
                min_value=5000,
                help_text="Cotisation mensuelle en FCFA"
            )
            duree_annees = serializers.IntegerField(
                required=True,
                min_value=5,
                help_text="Durée prévue du contrat"
            )
            mois_rachat = serializers.IntegerField(
                required=True,
                min_value=1,
                help_text="Mois du rachat (minimum 12 pour BGFI)"
            )
            pourcentage_rachat = serializers.FloatField(
                required=True,
                min_value=0.01,
                max_value=100.0,
                help_text="% à racheter (ex: 50.0 pour 50%)"
            )
        
        serializer = RachatPartielInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            banque = self._get_banque(request)
            calculateur = CalculateurEpargnePlus()
            
            parametres = {
                'cotisation_mensuelle': serializer.validated_data['cotisation_mensuelle'],
                'duree_annees': serializer.validated_data['duree_annees'],
                'banque': banque,
            }
            
            resultats = calculateur.calculer_rachat_partiel(
                parametres,
                mois_rachat=serializer.validated_data['mois_rachat'],
                pourcentage_rachat=serializer.validated_data['pourcentage_rachat']
            )
            
            return Response(resultats, status=status.HTTP_200_OK)
            
        except Banque.DoesNotExist:
            return Response({'error': 'Banque non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='limites')
    def limites(self, request):
        """
        GET /api/v1/simulations/epargne-plus/limites/?banque=BGFI
        
        Retourne les limites et contraintes pour Épargne Plus
        
        Response: {
          "cotisation_minimum": 10000,
          "duree_minimum_annees": 5,
          "duree_penalite_rachat_annees": 10,
          "frais_adhesion": 10000,
          "periodicite": "Mensuel",
          "taux_interet_annuel_pourcent": 3.04,
          "banque_code": "BGFI"
        }
        """
        try:
            banque = self._get_banque(request)
            limites = CalculateurEpargnePlus.get_limites(banque)
            return Response(limites)
            
        except Banque.DoesNotExist:
            return Response({'error': 'Banque non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)