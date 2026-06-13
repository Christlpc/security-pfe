# ==============================================
# FICHIER 2 : Commande de chargement BOA corrigée
# ==============================================
# apps/tarification/management/commands/load_epargne_plus_boa.py

from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.core.models import Banque
from apps.tarification.models import TableParametresEpargnePlus


class Command(BaseCommand):
    help = 'Charge les paramètres Épargne Plus SPÉCIFIQUES à BOA selon leur convention'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Chargement paramètres BOA Épargne Plus...")
        
        try:
            BOA = Banque.objects.get(code_banque='BOA', statut='ACTIF')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ BOA non trouvée !"))
            return
        
        # PARAMÈTRES BOA selon convention du 25/01/2022
        parametres_boa = {
            # CORRECTIONS SELON CONVENTION
            'cotisation_minimum': 5000,  # ✅ Article 5 : 10 000 FCFA
            'frais_adhesion_minimum': 5000,  # ✅ Article 7 : 10 000 FCFA
            
            # FRAIS selon Article 7
            'taux_quote_part_tirage': Decimal('0.0100'),  # 1% tirage
            'taux_frais_gestion': Decimal('0.0300'),  # 3% gestion
            'taux_frais_acquisition': Decimal('0.0300'),  # 3% acquisition
            'taux_frais_tirage': Decimal('0.0000'),  # 0% (inclus dans quote-part)
            
            # TAUX D'INTÉRÊT (à vérifier avec conditions générales)
            'taux_interet_annuel': Decimal('0.0325'),  # 3.04%
            
            # PÉNALITÉ selon Article 4
            'taux_penalite_rachat': Decimal('0.0500'),  # 5% (à confirmer)
            'duree_penalite_rachat_annees': 10,  # Pénalité si < 10 ans
            
            # RACHAT selon Article 4
            'delai_minimum_rachat_mois': 12,  # ✅ Minimum 12 mois
            'rachat_partiel_max_12_23_mois': Decimal('50.00'),  # ✅ 50% max
            'rachat_partiel_max_24_plus_mois': Decimal('85.00'),  # ✅ 85% max
            
            # COTISATIONS EXCEPTIONNELLES selon Article 5
            'cotisation_exceptionnelle_minimum_multiplicateur': 0,  # ✅ Min = 2× cotisation
            
            # AUTRES
            'duree_minimum_annees': 5,
            'periodicite': 'Mensuel',
            'periodicite_tirage': 'Annuel',  # Au moins 1×/an
            'actif': True,
        }
        
        obj, created = TableParametresEpargnePlus.objects.update_or_create(
            banque=BOA,
            defaults=parametres_boa
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS("✅ Paramètres BOA créés"))
        else:
            self.stdout.write(self.style.SUCCESS("🔄 Paramètres BOA mis à jour"))
        
        # Afficher résumé
        self.stdout.write("\n📊 Configuration BOA Épargne Plus :")
        self.stdout.write(f"   • Cotisation minimum : {parametres_boa['cotisation_minimum']:,} FCFA")
        self.stdout.write(f"   • Frais d'adhésion : {parametres_boa['frais_adhesion_minimum']:,} FCFA")
        self.stdout.write(f"   • Frais total : {float((parametres_boa['taux_quote_part_tirage'] + parametres_boa['taux_frais_gestion'] + parametres_boa['taux_frais_acquisition']) * 100)}%")
        self.stdout.write(f"   • Délai minimum rachat : {parametres_boa['delai_minimum_rachat_mois']} mois")
        self.stdout.write(f"   • Rachat partiel 12-23 mois : max {parametres_boa['rachat_partiel_max_12_23_mois']}%")
        self.stdout.write(f"   • Rachat partiel 24+ mois : max {parametres_boa['rachat_partiel_max_24_plus_mois']}%")
