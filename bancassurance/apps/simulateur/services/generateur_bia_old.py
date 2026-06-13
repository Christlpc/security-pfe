# apps/simulateur/services/generateur_bia.py
"""
Service de génération du Bulletin d'Adhésion (BIA)
Génère un PDF de 3 pages : Image produit + Formulaire Q1/Q2 + Convention
"""

from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from weasyprint import HTML, CSS
from PyPDF2 import PdfMerger, PdfReader
from io import BytesIO
import os
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any

from apps.simulateur.models import Simulation, QuestionnaireMedical


class GenerateurBIA:
    """
    Générateur de Bulletin d'Adhésion (BIA) pour les assurances
    
    Structure du BIA :
    - Page 1 : Image descriptive du produit (conditions, garanties, tarifs)
    - Page 2 : Formulaire Q1 (simulation) + Q2 (questionnaire médical)
    - Page 3 : Extrait de la convention banque-NSIA
    """
    
    # Configuration des chemins
    STATIC_BIA_DIR = Path(settings.STATIC_ROOT) / 'bia' if hasattr(settings, 'STATIC_ROOT') else Path('static/bia')
    TEMPLATE_PAGE2 = 'pdf/bia_page2.html'
    
    # Mapping produits → fichiers images
    PRODUITS_IMAGES = {
        'emprunteur': 'emprunteur.pdf',
        'retraite': 'retraite.pdf',
        'etudes': 'etudes.pdf',
        'elikia': 'elikia.pdf',
        'mobateli': 'mobateli.pdf',
    }
    
    def __init__(self, simulation: Simulation):
        """
        Initialise le générateur pour une simulation donnée
        
        Args:
            simulation: Instance de Simulation à exporter
        """
        self.simulation = simulation
        self.questionnaire = self._get_questionnaire()
        self.banque = simulation.banque
        self.produit = self._detect_produit()
    
    def _get_questionnaire(self) -> Optional[QuestionnaireMedical]:
        """Récupère le questionnaire médical s'il existe"""
        try:
            return self.simulation.questionnaire_medical
        except QuestionnaireMedical.DoesNotExist:
            return None
    
    def _detect_produit(self) -> str:
        """
        Détecte le type de produit de la simulation
        
        Returns:
            str: Type de produit ('emprunteur', 'retraite', etc.)
        """
        # Pour l'instant, on suppose que c'est Emprunteur par défaut
        # TODO: Ajouter un champ 'produit' au modèle Simulation
        if hasattr(self.simulation, 'produit'):
            return self.simulation.produit
        return 'emprunteur'
    
    def generer(self) -> bytes:
        """
        Génère le BIA complet (3 pages) et retourne le PDF en bytes
        
        Returns:
            bytes: Contenu du PDF généré
            
        Raises:
            FileNotFoundError: Si les images de page 1 ou 3 sont manquantes
            Exception: En cas d'erreur de génération
        """
        try:
            # 1. Générer la page 2 (formulaire)
            page2_pdf = self._generer_page2()
            
            # 2. Assembler les 3 pages
            pdf_final = self._assembler_pages(page2_pdf)
            
            return pdf_final
            
        except Exception as e:
            raise Exception(f"Erreur lors de la génération du BIA : {str(e)}")
    
    def _generer_page2(self) -> bytes:
        """
        Génère la page 2 (formulaire Q1 + Q2) en HTML puis convertit en PDF
        
        Returns:
            bytes: PDF de la page 2
        """
        # Préparer le contexte pour le template Django
        context = self._preparer_contexte()
        
        # Rendre le template HTML
        html_content = render_to_string(self.TEMPLATE_PAGE2, context)
        
        # Convertir HTML → PDF avec WeasyPrint
        pdf_bytes = HTML(string=html_content, base_url=settings.STATIC_URL).write_pdf()
        
        return pdf_bytes
    
    def _preparer_contexte(self) -> Dict[str, Any]:
        """
        Prépare le contexte pour le template Django
        
        Returns:
            dict: Contexte avec toutes les données nécessaires
        """
        # Calcul de l'âge
        age = None
        """if self.simulation.donnees_entree.date_naissance:
            today = timezone.now().date()
            age = today.year - self.simulation.donnees_entree.date_naissance.year
            if today.month < self.simulation.donnees_entree.date_naissance.month or \
               (today.month == self.simulation.donnees_entree.date_naissance.month and today.day < self.simulation.donnees_entree.date_naissance.day):
                age -= 1"""
        
        context = {
            # Données simulation
            'simulation': self.simulation,
            'age': age,
            
            # Questionnaire médical
            'questionnaire': self.questionnaire,
            'has_questionnaire': self.questionnaire is not None,
            
            # Banque
            'banque': self.banque,
            'logo_banque_url': self._get_logo_url(self.banque.code_banque),
            
            # Métadonnées
            'today': timezone.now(),
            'reference': self.simulation.reference,
            'produit': self.produit,
            
            # Informations légales NSIA
            'nsia_info': self._get_nsia_info(),
        }
        
        return context
    
    def _get_logo_url(self, banque_code: str) -> str:
        """Retourne l'URL du logo de la banque"""
        logo_path = self.STATIC_BIA_DIR / 'logos' / f'{banque_code.lower()}.png'
        if logo_path.exists():
            return f'/static/bia/logos/{banque_code.lower()}.png'
        # Logo par défaut NSIA
        return '/static/bia/logos/nsia.png'
    
    def _get_nsia_info(self) -> Dict[str, str]:
        """Retourne les informations légales NSIA"""
        return {
            'nom_complet': 'NSIA VIE ASSURANCES',
            'forme_juridique': 'Société Anonyme',
            'capital': '3 176 000 000 F CFA',
            'rccm': 'CG/BZV/08B1365',
            'siege': '1 Avenue Cardinal Emile BIAYENDA',
            'ville': 'Brazzaville',
            'pays': 'République du Congo',
            'bp': 'BP : 1151 Brazzaville',
            'tel': '(242) 22 282 24 92',
            'fax': '(242) 22 282 24 93',
            'email': 'nsiaViecongo@groupensia.com',
            'texte_legal': 'Entreprise régie par le Code des Assurances CIMA'
        }
    
    def _assembler_pages(self, page2_pdf: bytes) -> bytes:
        """
        Assemble les 3 pages du BIA : Page1 (image) + Page2 (formulaire) + Page3 (convention)
        
        Args:
            page2_pdf: PDF de la page 2 généré
            
        Returns:
            bytes: PDF complet assemblé
        """
        merger = PdfMerger()
        
        try:
            # Page 1 : Image produit
            page1_path = self._get_page1_path()
            if page1_path and page1_path.exists():
                merger.append(str(page1_path))
            else:
                # Si l'image n'existe pas, ajouter une page placeholder
                merger.append(BytesIO(self._generer_placeholder_page1()))
            
            # Page 2 : Formulaire généré
            merger.append(BytesIO(page2_pdf))
            
            # Page 3 : Convention banque
            page3_path = self._get_page3_path()
            if page3_path and page3_path.exists():
                merger.append(str(page3_path))
            else:
                # Si l'image n'existe pas, ajouter une page placeholder
                merger.append(BytesIO(self._generer_placeholder_page3()))
            
            # Écrire le PDF final en mémoire
            output = BytesIO()
            merger.write(output)
            merger.close()
            
            output.seek(0)
            return output.read()
            
        except Exception as e:
            merger.close()
            raise Exception(f"Erreur lors de l'assemblage des pages : {str(e)}")
    
    def _get_page1_path(self) -> Optional[Path]:
        """Retourne le chemin vers l'image du produit (page 1)"""
        filename = self.PRODUITS_IMAGES.get(self.produit)
        if not filename:
            return None
        
        path = self.STATIC_BIA_DIR / 'produits' / filename
        return path if path.exists() else None
    
    def _get_page3_path(self) -> Optional[Path]:
        """Retourne le chemin vers la convention banque (page 3)"""
        banque_code = self.banque.code_banque.lower()
        filename = f'{banque_code}.pdf'
        
        path = self.STATIC_BIA_DIR / 'conventions' / filename
        return path if path.exists() else None
    
    def _generer_placeholder_page1(self) -> bytes:
        """
        Génère une page placeholder pour la page 1 (en attendant l'image réelle)
        
        Returns:
            bytes: PDF placeholder
        """
        html_placeholder = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{ size: A4; margin: 0; }}
                body {{ 
                    margin: 0; 
                    padding: 50px;
                    font-family: Arial;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 297mm;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }}
                h1 {{ font-size: 36pt; margin-bottom: 20px; }}
                p {{ font-size: 14pt; text-align: center; line-height: 1.6; }}
                .box {{ 
                    background: rgba(255,255,255,0.1); 
                    padding: 30px; 
                    border-radius: 10px;
                    max-width: 600px;
                }}
            </style>
        </head>
        <body>
            <div class="box">
                <h1>ASSURANCE EMPRUNTEUR</h1>
                <h2>{self.produit.upper()}</h2>
                <p>
                    <strong>Garanties :</strong> Décès • Invalidité Permanente • Incapacité Temporaire
                </p>
                <p>
                    <strong>Protection complète</strong> de votre prêt et de votre famille
                </p>
                <p style="margin-top: 30px; font-size: 10pt; opacity: 0.8;">
                    Page 1 : Image du produit à intégrer<br>
                    (Conditions, garanties, tarifs détaillés)
                </p>
            </div>
        </body>
        </html>
        """
        
        return HTML(string=html_placeholder).write_pdf()
    
    def _generer_placeholder_page3(self) -> bytes:
        """
        Génère une page placeholder pour la page 3 (en attendant l'image réelle)
        
        Returns:
            bytes: PDF placeholder
        """
        html_placeholder = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{ size: A4; margin: 50px; }}
                body {{ font-family: Arial; font-size: 10pt; line-height: 1.6; }}
                h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
                h2 {{ color: #34495e; margin-top: 20px; }}
                .article {{ margin: 15px 0; padding: 10px; background: #f8f9fa; }}
                .footer {{ 
                    position: fixed; 
                    bottom: 30px; 
                    text-align: center; 
                    width: 100%; 
                    font-size: 8pt; 
                    color: #7f8c8d;
                }}
            </style>
        </head>
        <body>
            <h1>CONVENTION D'ASSURANCE COLLECTIVE</h1>
            <h2>Entre {self.banque.nom_complet} et NSIA VIE ASSURANCES</h2>
            
            <div class="article">
                <strong>Article 1 : Objet de la convention</strong>
                <p>
                    La présente convention a pour objet de définir les modalités de l'assurance
                    collective souscrite par {self.banque.nom_complet} auprès de NSIA VIE ASSURANCES
                    pour garantir les prêts accordés à ses clients.
                </p>
            </div>
            
            <div class="article">
                <strong>Article 2 : Garanties</strong>
                <p>
                    L'assurance garantit le remboursement du capital restant dû en cas de :
                </p>
                <ul>
                    <li>Décès de l'assuré</li>
                    <li>Invalidité Permanente Totale (IPT)</li>
                    <li>Incapacité Temporaire de Travail (ITT)</li>
                </ul>
            </div>
            
            <div class="article">
                <strong>Article 3 : Conditions d'adhésion</strong>
                <p>
                    L'adhésion est ouverte aux emprunteurs âgés de 18 à 64 ans au moment de la
                    souscription, sous réserve d'acceptation du questionnaire médical par NSIA.
                </p>
            </div>
            
            <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;">
                <strong>Page 3 :</strong> Extrait de la convention {self.banque.nom_complet} - NSIA à intégrer<br>
                <em>(Clauses complètes, conditions CIMA, mentions légales)</em>
            </p>
            
            <div class="footer">
                Convention {self.banque.nom_complet} - NSIA VIE ASSURANCES • Code CIMA • {timezone.now().year}
            </div>
        </body>
        </html>
        """
        
        return HTML(string=html_placeholder).write_pdf()
    
    def sauvegarder(self, destination: str = None) -> str:
        """
        Génère et sauvegarde le BIA sur disque
        
        Args:
            destination: Chemin où sauvegarder (optionnel, sinon /tmp)
            
        Returns:
            str: Chemin du fichier sauvegardé
        """
        pdf_content = self.generer()
        
        if not destination:
            destination = f'/tmp/BIA_{self.simulation.reference}.pdf'
        
        with open(destination, 'wb') as f:
            f.write(pdf_content)
        
        return destination
    
    def get_filename(self) -> str:
        """
        Retourne le nom de fichier suggéré pour le BIA
        
        Returns:
            str: Nom de fichier (ex: BIA_EMPRUNTEUR_SIM-CDCO-001.pdf)
        """
        return f'BIA_{self.produit.upper()}_{self.simulation.reference}.pdf'


# ============================================
# FONCTION HELPER
# ============================================

def generer_bia(simulation_id: int) -> bytes:
    """
    Fonction helper pour générer un BIA rapidement
    
    Args:
        simulation_id: ID de la simulation
        
    Returns:
        bytes: Contenu PDF du BIA
        
    Example:
        >>> pdf_content = generer_bia(123)
        >>> with open('bia.pdf', 'wb') as f:
        ...     f.write(pdf_content)
    """
    from apps.simulateur.models import Simulation
    
    simulation = Simulation.objects.select_related('banque', 'createur').get(id=simulation_id)
    generateur = GenerateurBIA(simulation)
    return generateur.generer()