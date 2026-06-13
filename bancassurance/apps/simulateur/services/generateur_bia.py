# apps/simulateur/services/generateur_bia.py
"""
GÉNÉRATEUR BIA MULTI-PRODUITS
Service de génération des Bulletins Individuels d'Adhésion (BIA)

Supporte 3 produits :
- Emprunteur Groupe
- Elikia Scolaire (BCI)
- Mobateli (BCI)

Génère un PDF professionnel en 3 pages :
- Page 1 : Image produit (PDF)
- Page 2 : Formulaire complet (Q1 + Q2)
- Page 3 : Convention banque-NSIA (PDF)

Auteur : Équipe NSIA Tech
Version : 3.0 (Phase C - Multi-produits)
"""

import os
from pathlib import Path
from datetime import datetime
from io import BytesIO

from django.conf import settings
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404

from weasyprint import HTML, CSS
from PyPDF2 import PdfMerger

from apps.simulateur.models import Simulation, QuestionnaireMedical


class GenerateurBIA:
    """
    Générateur de BIA Multi-Produits
    
    Usage:
        generateur = GenerateurBIA(simulation_id)
        pdf_bytes = generateur.generer()
    """
    
    # Chemins des fichiers statiques
    STATIC_DIR = Path(settings.STATIC_ROOT) if settings.STATIC_ROOT else Path(settings.BASE_DIR) / 'static'
    IMAGES_DIR = STATIC_DIR / 'bia' / 'images'
    CONVENTIONS_DIR = STATIC_DIR / 'bia' / 'conventions'
    
    # Mapping des produits vers leurs templates
    TEMPLATE_MAPPING = {
        'emprunteur': 'pdf/bia_emprunteur_groupe.html',
        'elikia': 'pdf/bia_elikia_scolaire.html',
        'mobateli': 'pdf/bia_mobateli.html',
        'retraite': 'pdf/bia_confort_retraite.html',
        'etudes': 'pdf/bia_confort_etudes.html',
        'epargne_plus': 'pdf/bia_epargne_plus.html',
    }

    # Mapping des produits vers leurs images (Page 1) — défaut
    PRODUITS_IMAGES = {
        'emprunteur': 'emprunteur_page1.pdf',
        'elikia': 'elikia_page1.pdf',
        'mobateli': 'mobateli_page1.pdf',
        'retraite': 'retraite_page1.pdf',
        'etudes': 'etudes_page1.pdf',
        'epargne_plus': 'epargne_page1.pdf',
    }

    # Overrides d'image Page 1 par banque/produit
    # Quand une banque a une page de garde différente (ex: BOA appelle Mobateli "Likama")
    PRODUITS_IMAGES_PAR_BANQUE = {
        ('BOA', 'mobateli'): 'likama_page1.pdf',
        ('BOA', 'emprunteur'): 'emprunteur_boa_page1.pdf',
        ('BOA', 'epargne_plus'): 'epargne_boa_page1.pdf',
        ('BGFI', 'epargne_plus'): 'epargne_bgfi_page1.pdf',
    }
    
    def __init__(self, simulation_id):
        """
        Initialise le générateur
        
        Args:
            simulation_id (UUID): ID de la simulation
        """
        self.simulation = get_object_or_404(
            Simulation.objects.select_related(
                'banque',
                'agence',
                'gestionnaire'
            ).prefetch_related(
                'beneficiaires',
                'questionnaire_medical__details_medicaux'
            ),
            id=simulation_id
        )
        
        # Récupérer le questionnaire médical s'il existe
        try:
            self.questionnaire = self.simulation.questionnaire_medical
        except QuestionnaireMedical.DoesNotExist:
            self.questionnaire = None
        
        # Déterminer le produit
        self.produit = self.simulation.produit.lower()

        # Recuperer la banque
        self.banque = self.simulation.banque

        # Vérifier que le produit est supporté
        if self.produit not in self.TEMPLATE_MAPPING:
            raise ValueError(
                f"Produit '{self.produit}' non supporté. "
                f"Produits disponibles : {', '.join(self.TEMPLATE_MAPPING.keys())}"
            )
    
    def generer(self):
        """
        Génère le BIA complet (5 pages)
        
        Returns:
            bytes: PDF complet en bytes
        """
        # Créer le merger PDF
        merger = PdfMerger()
        
        # Page 1 : Image produit
        page1_bytes = self._generer_page1()
        if page1_bytes:
            merger.append(BytesIO(page1_bytes))
        
        # Page 2 : Formulaire Q1/Q2
        page2_bytes = self._generer_page2()
        if page2_bytes:
            merger.append(BytesIO(page2_bytes))
        
        # Page 3 : Convention banque
        page3_bytes = self._generer_page3()
        if page3_bytes:
            merger.append(BytesIO(page3_bytes))
        
        # Assembler le PDF final
        output = BytesIO()
        merger.write(output)
        merger.close()
        
        # Retourner les bytes
        output.seek(0)
        return output.read()
    
    def _generer_page1(self):
        """
        Génère la page 1 (image du produit)
        
        Returns:
            bytes: PDF de la page 1 ou None si fichier manquant
        """
     


        

        # Chercher d'abord un override par banque/produit, sinon le défaut
        banque_code = self.simulation.banque.code_banque
        image_filename = self.PRODUITS_IMAGES_PAR_BANQUE.get(
            (banque_code, self.produit),
            self.PRODUITS_IMAGES.get(self.produit)
        )
        
        if not image_filename:
            print(f"⚠️ Warning: Aucune image trouvée pour le produit '{self.produit}'")
            return None
        
        image_path = self.IMAGES_DIR / image_filename
        
        if not image_path.exists():
            print(f"⚠️ Warning: Fichier image manquant: {image_path}")
            return None
        
        # Lire le fichier PDF de l'image produit
        with open(image_path, 'rb') as f:
            return f.read()
    
    # Questions médicales du BIA (champ technique → libellé)
    MEDICAL_QUESTIONS = [
        ('a_infirmite', "Êtes-vous atteint d'une infirmité ?"),
        ('malade_6_derniers_mois', "Avez-vous été malade au cours des 6 derniers mois ?"),
        ('souvent_fatigue', "Êtes-vous souvent fatigué(e) ?"),
        ('perte_poids_recente', "Avez-vous maigri depuis les 6 derniers mois ?"),
        ('prise_poids_recente', "Avez-vous grossi depuis les 6 derniers mois ?"),
        ('a_ganglions', "Avez-vous des ganglions, furoncles, abcès ou maladies de la peau ?"),
        ('fievre_persistante', "Toussez-vous depuis quelques temps avec en plus de la fièvre ?"),
        ('plaies_buccales', "Avez-vous des plaies dans la bouche ?"),
        ('diarrhee_frequente', "Faites-vous souvent la diarrhée ?"),
        ('ballonnement', "Êtes-vous souvent ballonné(e) ?"),
        ('oedemes_membres_inferieurs', "Avez-vous eu des œdèmes des Membres Inférieurs (O.M.I) ?"),
        ('essoufflement', "Êtes-vous essoufflé(e) au moindre effort ?"),
        ('a_eu_perfusion', "Avez-vous déjà reçu une perfusion ?"),
        ('a_eu_transfusion', "Avez-vous déjà reçu une transfusion de sang ?"),
    ]

    def _build_medical_questions(self):
        """
        Construit la liste medical_questions pour le template BIA.

        Chaque entrée : {label, value (bool), precisez, periode, lieu}
        Les détails viennent de DetailMedical (details_medicaux) quand la réponse est OUI.
        """
        if not self.questionnaire:
            return []

        # Indexer les détails par question_field pour accès O(1)
        details_par_question = {}
        for detail in self.questionnaire.details_medicaux.all():
            details_par_question[detail.question_field] = detail

        questions = []
        for field_name, label in self.MEDICAL_QUESTIONS:
            value = getattr(self.questionnaire, field_name, False)
            detail = details_par_question.get(field_name)
            questions.append({
                'label': label,
                'value': value,
                'precisez': detail.precisez if detail else '',
                'periode': detail.periode_traitement if detail else '',
                'lieu': detail.lieu_traitement if detail else '',
            })
        return questions

    def _generer_page2(self):
        """
        Génère la page 2 (formulaire Q1 + Q2)

        Returns:
            bytes: PDF de la page 2
        """
        # Sélectionner le bon template selon le produit
        template_name = self.TEMPLATE_MAPPING[self.produit]

        # Préparer le contexte pour le template
        context = {
            'simulation': self.simulation,
            'questionnaire': self.questionnaire,
            'medical_questions': self._build_medical_questions(),
            'today': datetime.now(),
        }

        # Rendre le template HTML
        html_string = render_to_string(template_name, context)

        # Convertir HTML en PDF avec WeasyPrint
        html = HTML(string=html_string, base_url=settings.STATIC_URL)
        pdf_bytes = html.write_pdf()

        return pdf_bytes
    
    def _generer_page3(self):
        """
        Génère la page 3 (convention banque-NSIA)
        
        Returns:
            bytes: PDF de la page 3 ou None si fichier manquant
        """
        banque_code = self.simulation.banque.code_banque.lower()
        convention_filename = f'{banque_code}_{self.produit}_convention.pdf'
        convention_path = self.CONVENTIONS_DIR / convention_filename
        
        if not convention_path.exists():
            print(f"⚠️ Warning: Convention manquante pour {self.simulation.banque.nom_court}: {convention_path}")
            return None
        
        # Lire le fichier PDF de la convention
        with open(convention_path, 'rb') as f:
            return f.read()
    
    def sauvegarder(self, output_path):
        """
        Génère et sauvegarde le BIA dans un fichier
        
        Args:
            output_path (str|Path): Chemin du fichier de sortie
        """
        pdf_bytes = self.generer()
        
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)
        
        print(f"✅ BIA {self.produit.upper()} généré avec succès: {output_path}")


# ============================================
# FONCTION HELPER POUR UTILISATION RAPIDE
# ============================================

def generer_bia(simulation_id, output_path=None):
    """
    Fonction helper pour générer un BIA rapidement
    
    Args:
        simulation_id (UUID): ID de la simulation
        output_path (str|Path, optional): Chemin du fichier de sortie.
            Si None, retourne les bytes du PDF.
    
    Returns:
        bytes|None: Bytes du PDF si output_path=None, sinon None
    
    Usage:
        # Générer et obtenir les bytes
        pdf_bytes = generer_bia(simulation_id)
        
        # Générer et sauvegarder
        generer_bia(simulation_id, 'output/bia.pdf')
    """
    generateur = GenerateurBIA(simulation_id)
    
    if output_path:
        generateur.sauvegarder(output_path)
        return None
    else:
        return generateur.generer()


# ============================================
# CLASSE POUR GÉNÉRATION EN MASSE
# ============================================

class GenerateurBIABatch:
    """
    Générateur de BIA en masse pour plusieurs simulations
    
    Usage:
        generateur = GenerateurBIABatch()
        generateur.generer_pour_banque('EK', output_dir='exports/')
    """
    
    def __init__(self):
        self.generateur = None
    
    def generer_pour_banque(self, banque_code, output_dir=None, produit=None):
        """
        Génère les BIA pour toutes les simulations d'une banque
        
        Args:
            banque_code (str): Code de la banque (ex: 'EK', 'BGFI', 'BCI')
            output_dir (str|Path): Répertoire de sortie
            produit (str, optional): Filtrer par produit spécifique
        
        Returns:
            list: Liste des chemins des fichiers générés
        """
        from apps.core.models import Banque
        
        banque = get_object_or_404(Banque, code_banque=banque_code)
        
        # Construire le filtre
        filters = {
            'banque': banque,
            'statut__in': ['calculee', 'calculee_avec_surprime', 'validee']
        }
        
        if produit:
            filters['produit'] = produit
        
        simulations = Simulation.objects.filter(**filters)
        
        if output_dir is None:
            output_dir = Path(settings.MEDIA_ROOT) / 'bia_exports' / banque_code.lower()
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        fichiers_generes = []
        
        for simulation in simulations:
            try:
                filename = f"BIA_{simulation.reference}.pdf"
                output_path = output_dir / filename
                
                generer_bia(simulation.id, output_path)
                fichiers_generes.append(str(output_path))
                
                print(f"✅ BIA généré: {filename} ({simulation.produit})")
            
            except Exception as e:
                print(f"❌ Erreur pour {simulation.reference}: {e}")
        
        print(f"\n📊 Résumé: {len(fichiers_generes)}/{simulations.count()} BIA générés")
        return fichiers_generes
    
    def generer_pour_produit(self, produit, output_dir=None):
        """
        Génère les BIA pour un produit spécifique (toutes banques)
        
        Args:
            produit (str): Nom du produit ('emprunteur', 'elikia', 'mobateli')
            output_dir (str|Path): Répertoire de sortie
        
        Returns:
            list: Liste des chemins des fichiers générés
        """
        simulations = Simulation.objects.filter(
            produit=produit,
            statut__in=['calculee', 'calculee_avec_surprime', 'validee']
        ).order_by('banque__code', 'date_creation')
        
        if output_dir is None:
            output_dir = Path(settings.MEDIA_ROOT) / 'bia_exports' / produit.lower()
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        fichiers_generes = []
        
        for simulation in simulations:
            try:
                # Créer sous-dossier par banque
                banque_dir = output_dir / simulation.banque.code_banque.lower()
                banque_dir.mkdir(exist_ok=True)
                
                filename = f"BIA_{simulation.reference}.pdf"
                output_path = banque_dir / filename
                
                generer_bia(simulation.id, output_path)
                fichiers_generes.append(str(output_path))
                
                print(f"✅ BIA généré: {simulation.banque.code_banque}/{filename}")
            
            except Exception as e:
                print(f"❌ Erreur pour {simulation.reference}: {e}")
        
        print(f"\n📊 Résumé: {len(fichiers_generes)}/{simulations.count()} BIA générés")
        return fichiers_generes
    
    def generer_pour_periode(self, date_debut, date_fin, output_dir=None):
        """
        Génère les BIA pour une période donnée
        
        Args:
            date_debut (date): Date de début
            date_fin (date): Date de fin
            output_dir (str|Path): Répertoire de sortie
        
        Returns:
            list: Liste des chemins des fichiers générés
        """
        simulations = Simulation.objects.filter(
            date_creation__gte=date_debut,
            date_creation__lte=date_fin,
            statut__in=['calculee', 'calculee_avec_surprime', 'validee']
        ).order_by('produit', 'banque__code', 'date_creation')
        
        if output_dir is None:
            output_dir = Path(settings.MEDIA_ROOT) / 'bia_exports' / f"{date_debut}_{date_fin}"
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        fichiers_generes = []
        
        for simulation in simulations:
            try:
                # Créer sous-dossier par produit et banque
                produit_dir = output_dir / simulation.produit.lower()
                produit_dir.mkdir(exist_ok=True)
                
                banque_dir = produit_dir / simulation.banque.code_banque.lower()
                banque_dir.mkdir(exist_ok=True)
                
                filename = f"BIA_{simulation.reference}.pdf"
                output_path = banque_dir / filename
                
                generer_bia(simulation.id, output_path)
                fichiers_generes.append(str(output_path))
                
                print(f"✅ BIA généré: {simulation.produit}/{simulation.banque.code_banque}/{filename}")
            
            except Exception as e:
                print(f"❌ Erreur pour {simulation.reference}: {e}")
        
        print(f"\n📊 Résumé: {len(fichiers_generes)}/{simulations.count()} BIA générés")
        return fichiers_generes


# ============================================
# EXEMPLES D'UTILISATION
# ============================================

"""
EXEMPLE 1 : Générer un BIA pour une simulation (tous produits)

from apps.simulateur.services.generateur_bia import generer_bia

# Obtenir les bytes du PDF (Emprunteur, Elikia ou Mobateli)
pdf_bytes = generer_bia(simulation_id)

# Ou sauvegarder directement
generer_bia(simulation_id, 'media/bia/BIA_001.pdf')


EXEMPLE 2 : Générer tous les BIA Emprunteur d'une banque

from apps.simulateur.services.generateur_bia import GenerateurBIABatch

generateur = GenerateurBIABatch()
fichiers = generateur.generer_pour_banque('EK', produit='emprunteur')


EXEMPLE 3 : Générer tous les BIA Elikia (toutes banques)

generateur = GenerateurBIABatch()
fichiers = generateur.generer_pour_produit('elikia', output_dir='exports/elikia/')


EXEMPLE 4 : Générer tous les BIA Mobateli pour BCI

generateur = GenerateurBIABatch()
fichiers = generateur.generer_pour_banque('BCI', produit='mobateli')


EXEMPLE 5 : Générer les BIA d'une période

from datetime import date
from apps.simulateur.services.generateur_bia import GenerateurBIABatch

generateur = GenerateurBIABatch()
fichiers = generateur.generer_pour_periode(
    date_debut=date(2025, 1, 1),
    date_fin=date(2025, 12, 31),
    output_dir='exports/2025/'
)


EXEMPLE 6 : Utilisation dans une vue Django

from django.http import HttpResponse
from apps.simulateur.services.generateur_bia import generer_bia

def telecharger_bia(request, simulation_id):
    pdf_bytes = generer_bia(simulation_id)
    
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="BIA_{simulation_id}.pdf"'
    
    return response


EXEMPLE 7 : Command Django pour génération en masse

# management/commands/generer_bia_batch.py

from django.core.management.base import BaseCommand
from apps.simulateur.services.generateur_bia import GenerateurBIABatch

class Command(BaseCommand):
    help = 'Génère les BIA en masse'
    
    def add_arguments(self, parser):
        parser.add_argument('--banque', type=str, help='Code de la banque')
        parser.add_argument('--produit', type=str, help='Type de produit')
    
    def handle(self, *args, **options):
        banque_code = options.get('banque')
        produit = options.get('produit')
        
        generateur = GenerateurBIABatch()
        
        if banque_code and produit:
            fichiers = generateur.generer_pour_banque(banque_code, produit=produit)
        elif banque_code:
            fichiers = generateur.generer_pour_banque(banque_code)
        elif produit:
            fichiers = generateur.generer_pour_produit(produit)
        else:
            self.stdout.write(self.style.ERROR('Spécifiez --banque ou --produit'))
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'{len(fichiers)} BIA générés avec succès')
        )

# Utilisation:
# python manage.py generer_bia_batch --banque=BCI --produit=elikia
# python manage.py generer_bia_batch --produit=mobateli
"""