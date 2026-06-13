# apps/simulateur/services/generateur_bia.py
"""
PHASE B : GÉNÉRATEUR BIA EMPRUNTEUR GROUPE
Service de génération du Bulletin Individuel d'Adhésion (BIA)

Génère un PDF professionnel en 3 pages :
- Page 1 : Image produit Emprunteur
- Page 2 : Formulaire complet (Q1 + Q2)
- Page 3 : Convention banque-NSIA

Auteur : Équipe NSIA Tech
Version : 2.0 (Phase B)
"""

import os
from pathlib import Path
from datetime import datetime
from io import BytesIO

from django.conf import settings
from django.template.loader import render_to_string
from django.shortcuts import get_object_or_404

from weasyprint import HTML, CSS
from PyPDF2 import PdfMerger, PdfReader, PdfWriter

from apps.simulateur.models import Simulation, QuestionnaireMedical


class GenerateurBIA:
    """
    Générateur de BIA Emprunteur Groupe
    
    Usage:
        generateur = GenerateurBIA(simulation_id)
        pdf_bytes = generateur.generer()
    """
    
    # Chemins des fichiers statiques
    STATIC_DIR = Path(settings.STATIC_ROOT) if settings.STATIC_ROOT else Path(settings.BASE_DIR) / 'static'
    IMAGES_DIR = STATIC_DIR / 'bia' / 'images'
    CONVENTIONS_DIR = STATIC_DIR / 'bia' / 'conventions'
    
    # Mapping des produits vers leurs images
    PRODUITS_IMAGES = {
        'emprunteur': 'emprunteur_page1.pdf',
        'retraite': 'retraite_page1.pdf',
        'etudes': 'etudes_page1.pdf',
        'elikia': 'elikia_page1.pdf',
        'mobateli': 'mobateli_page1.pdf',
        'epargne': 'epargne_page1.pdf',
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
    def _normaliser_pdf(self, pdf_bytes, pages=None):
        reader = PdfReader(BytesIO(pdf_bytes))
        writer = PdfWriter()

        if pages is None:
            pages = range(len(reader.pages))

        for i in pages:
            writer.add_page(reader.pages[i])

        buffer = BytesIO()
        writer.write(buffer)
        buffer.seek(0)
        return buffer.read()
    
    def generer(self):
        """
        Génère le BIA complet (3 pages)
        
        Returns:
            bytes: PDF complet en bytes
        """
        # Créer le merger PDF
        merger = PdfMerger()
        
        # Page 1 : Image produit
        page1_bytes = self._generer_page1()
        if page1_bytes:
            merger.append(BytesIO(self._normaliser_pdf(page1_bytes)))
        
        # Page 2 : Formulaire Q1/Q2
        page2_bytes = self._generer_page2()
        if page2_bytes:
            merger.append(BytesIO(self._normaliser_pdf(page2_bytes)))
        
        # Page 3 : Convention banque
        page3_bytes = self._generer_page3()
        if page3_bytes:
            merger.append(BytesIO(self._normaliser_pdf(page3_bytes)))
        
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
        produit = self.simulation.produit.lower()
        image_filename = self.PRODUITS_IMAGES.get(produit)
        
        if not image_filename:
            print(f"⚠️ Warning: Aucune image trouvée pour le produit '{produit}'")
            return None
        
        image_path = self.IMAGES_DIR / image_filename
        
        if not image_path.exists():
            print(f"⚠️ Warning: Fichier image manquant: {image_path}")
            return None
        
        # Lire le fichier PDF de l'image produit
        with open(image_path, 'rb') as f:
            return f.read()
    
    def _generer_page2(self):
        """
        Génère la page 2 (formulaire Q1 + Q2)
        
        Returns:
            bytes: PDF de la page 2
        """
        # Préparer le contexte pour le template
        context = {
            'simulation': self.simulation,
            'questionnaire': self.questionnaire,
            'today': datetime.now(),
        }
        
        # Rendre le template HTML
        html_string = render_to_string('pdf/bia_emprunteur_groupe.html', context)
        
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
        convention_filename = f'{banque_code}_convention.pdf'
        convention_path = self.CONVENTIONS_DIR / convention_filename
        
        if not convention_path.exists():
            print(f"⚠️ Warning: Convention manquante pour {self.simulation.banque.nom_complet}: {convention_path}")
            return None
        print("HELLO", convention_path)
        
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
        
        print(f"✅ BIA généré avec succès: {output_path}")


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
    
    def generer_pour_banque(self, banque_code, output_dir=None):
        """
        Génère les BIA pour toutes les simulations d'une banque
        
        Args:
            banque_code (str): Code de la banque (ex: 'EK', 'BGFI')
            output_dir (str|Path): Répertoire de sortie
        
        Returns:
            list: Liste des chemins des fichiers générés
        """
        from apps.core.models import Banque
        
        banque = get_object_or_404(Banque, code_banque=banque_code)
        simulations = Simulation.objects.filter(
            banque=banque,
            statut__in=['calculee', 'calculee_avec_surprime', 'validee']
        )
        
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
                
                print(f"✅ BIA généré: {filename}")
            
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
        ).order_by('banque__code', 'date_creation')
        
        if output_dir is None:
            output_dir = Path(settings.MEDIA_ROOT) / 'bia_exports' / f"{date_debut}_{date_fin}"
        
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


# ============================================
# EXEMPLES D'UTILISATION
# ============================================

"""
EXEMPLE 1 : Générer un BIA pour une simulation

from apps.simulateur.services.generateur_bia import generer_bia

# Obtenir les bytes du PDF
pdf_bytes = generer_bia(simulation_id)

# Ou sauvegarder directement
generer_bia(simulation_id, 'media/bia/BIA_SIM_001.pdf')


EXEMPLE 2 : Générer tous les BIA d'une banque

from apps.simulateur.services.generateur_bia import GenerateurBIABatch

generateur = GenerateurBIABatch()
fichiers = generateur.generer_pour_banque('EK', output_dir='exports/ecobank/')


EXEMPLE 3 : Générer les BIA d'une période

from datetime import date
from apps.simulateur.services.generateur_bia import GenerateurBIABatch

generateur = GenerateurBIABatch()
fichiers = generateur.generer_pour_periode(
    date_debut=date(2025, 1, 1),
    date_fin=date(2025, 12, 31),
    output_dir='exports/2025/'
)


EXEMPLE 4 : Utilisation dans une vue Django

from django.http import HttpResponse
from apps.simulateur.services.generateur_bia import generer_bia

def telecharger_bia(request, simulation_id):
    pdf_bytes = generer_bia(simulation_id)
    
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="BIA_{simulation_id}.pdf"'
    
    return response


EXEMPLE 5 : Command Django pour génération en masse

# management/commands/generer_bia_batch.py

from django.core.management.base import BaseCommand
from apps.simulateur.services.generateur_bia import GenerateurBIABatch

class Command(BaseCommand):
    help = 'Génère les BIA en masse pour une banque'
    
    def add_arguments(self, parser):
        parser.add_argument('banque_code', type=str, help='Code de la banque')
    
    def handle(self, *args, **options):
        banque_code = options['banque_code']
        
        generateur = GenerateurBIABatch()
        fichiers = generateur.generer_pour_banque(banque_code)
        
        self.stdout.write(
            self.style.SUCCESS(f'{len(fichiers)} BIA générés avec succès')
        )

# Utilisation:
# python manage.py generer_bia_batch EK
"""