# apps/tarification/management/commands/load_taux_emprunteur.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from apps.core.models import Banque
from apps.tarification.models import TableTauxEmprunteur


class Command(BaseCommand):
    help = 'Charge les taux emprunteur pour toutes les banques partenaires'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Chargement des taux emprunteur...")
        
        # Date de validité par défaut
        date_debut = timezone.now().date()
        
        # Compteurs
        total_inserted = 0
        total_updated = 0
        
        # === BGFI ===
        total_inserted, total_updated = self.load_bgfi(date_debut, total_inserted, total_updated)
        
        # === CHARDEN ===
        total_inserted, total_updated = self.load_charden(date_debut, total_inserted, total_updated)
        
        # === HOPE ===
        total_inserted, total_updated = self.load_hope(date_debut, total_inserted, total_updated)
        
        # === ECOBANK ===
        total_inserted, total_updated = self.load_ecobank(date_debut, total_inserted, total_updated)
        
        # === CDCO ===
        total_inserted, total_updated = self.load_cdco(date_debut, total_inserted, total_updated)
        
        # Résumé
        self.stdout.write(self.style.SUCCESS(f"\n✅ Chargement terminé !"))
        self.stdout.write(self.style.SUCCESS(f"   • {total_inserted} taux insérés"))
        self.stdout.write(self.style.SUCCESS(f"   • {total_updated} taux mis à jour"))
        self.stdout.write(self.style.SUCCESS(f"   • Total : {total_inserted + total_updated} enregistrements"))

    def load_bgfi(self, date_debut, total_inserted, total_updated):
        """Charge les taux BGFI (grille complète en années)"""
        self.stdout.write("\n📊 Chargement BGFI...")
        
        try:
            banque = Banque.objects.get(code_banque='BGFI')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.WARNING("   ⚠️  Banque BGFI non trouvée, ignorée"))
            return total_inserted, total_updated
        
        # Grille BGFI (emprunteur_bgfi1.png + emprunteur_bgfi2.png)
        grille_bgfi = [
            # Tranche 29 ans et moins
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 1, 'taux': '0.370'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 2, 'taux': '0.490'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 3, 'taux': '0.610'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 4, 'taux': '0.740'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 5, 'taux': '0.860'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 6, 'taux': '1.200'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 7, 'taux': '1.390'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 8, 'taux': '1.600'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 9, 'taux': '1.810'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 10, 'taux': '2.040'},
            
            # Tranche 30-39 ans
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 1, 'taux': '0.430'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 2, 'taux': '0.610'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 3, 'taux': '0.800'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 4, 'taux': '1.010'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 5, 'taux': '1.230'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 6, 'taux': '2.310'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 7, 'taux': '2.730'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 8, 'taux': '3.180'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 9, 'taux': '3.650'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 10, 'taux': '4.150'},
            
            # Tranche 40-49 ans
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 1, 'taux': '0.640'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 2, 'taux': '1.040'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 3, 'taux': '1.470'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 4, 'taux': '1.920'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 5, 'taux': '2.410'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 6, 'taux': '4.960'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 7, 'taux': '5.910'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 8, 'taux': '6.920'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 9, 'taux': '7.990'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 10, 'taux': '9.110'},
            
            # Tranche 50-59 ans
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 1, 'taux': '1.180'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 2, 'taux': '2.090'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 3, 'taux': '3.070'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 4, 'taux': '4.110'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 5, 'taux': '5.220'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 6, 'taux': '10.250'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 7, 'taux': '13.260'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 8, 'taux': '15.480'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 9, 'taux': '17.800'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 10, 'taux': '20.210'},
            
            # Tranche 60-64 ans
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 1, 'taux': '2.450'},
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 2, 'taux': '4.590'},
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 3, 'taux': '6.860'},
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 4, 'taux': '9.250'},
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 5, 'taux': '11.780'},
        ]
        
        inserted, updated = self._insert_taux(
            banque, grille_bgfi, date_debut, 
            frais_accessoires=5000, 
            use_duree_mois=False
        )
        
        self.stdout.write(self.style.SUCCESS(f"   ✅ BGFI : {inserted} insérés, {updated} mis à jour"))
        return total_inserted + inserted, total_updated + updated

    def load_charden(self, date_debut, total_inserted, total_updated):
        """Charge les taux Charden (grille en MOIS)"""
        self.stdout.write("\n📊 Chargement CHARDEN...")
        
        try:
            banque = Banque.objects.get(code_banque='CHARDEN')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.WARNING("   ⚠️  Banque CHARDEN non trouvée, ignorée"))
            return total_inserted, total_updated
        
        # Grille Charden (emprunteur_charden.png) - DURÉES EN MOIS
        grille_charden = [
            # 29 ans et moins
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 6, 'taux': '0.080'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 12, 'taux': '0.160'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 18, 'taux': '0.240'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 24, 'taux': '0.310'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 30, 'taux': '0.390'},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 36, 'taux': '0.470'},
            
            # 30-39 ans
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 6, 'taux': '0.130'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 12, 'taux': '0.260'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 18, 'taux': '0.390'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 24, 'taux': '0.530'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 30, 'taux': '0.670'},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 36, 'taux': '0.820'},
            
            # 40-49 ans
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 6, 'taux': '0.270'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 12, 'taux': '0.550'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 18, 'taux': '0.820'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 24, 'taux': '1.090'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 30, 'taux': '1.390'},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 36, 'taux': '1.680'},
            
            # 50-59 ans
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 6, 'taux': '0.510'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 12, 'taux': '1.010'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 18, 'taux': '1.520'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 24, 'taux': '2.020'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 30, 'taux': '2.580'},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 36, 'taux': '3.130'},
            
            # 60-62 ans
            {'tranche': '60-62 ans', 'age_min': 60, 'age_max': 62, 'duree': 6, 'taux': '0.780'},
            {'tranche': '60-62 ans', 'age_min': 60, 'age_max': 62, 'duree': 12, 'taux': '1.550'},
            {'tranche': '60-62 ans', 'age_min': 60, 'age_max': 62, 'duree': 18, 'taux': '2.330'},
            {'tranche': '60-62 ans', 'age_min': 60, 'age_max': 62, 'duree': 24, 'taux': '3.100'},
            {'tranche': '60-62 ans', 'age_min': 60, 'age_max': 62, 'duree': 30, 'taux': '3.940'},
            {'tranche': '60-62 ans', 'age_min': 60, 'age_max': 62, 'duree': 36, 'taux': '4.780'},
            
            # 63 ans
            {'tranche': '63 ans', 'age_min': 63, 'age_max': 63, 'duree': 6, 'taux': '0.780'},
            {'tranche': '63 ans', 'age_min': 63, 'age_max': 63, 'duree': 12, 'taux': '1.550'},
            {'tranche': '63 ans', 'age_min': 63, 'age_max': 63, 'duree': 18, 'taux': '2.330'},
            {'tranche': '63 ans', 'age_min': 63, 'age_max': 63, 'duree': 24, 'taux': '3.100'},
            
            # 64 ans
            {'tranche': '64 ans', 'age_min': 64, 'age_max': 64, 'duree': 6, 'taux': '0.780'},
            {'tranche': '64 ans', 'age_min': 64, 'age_max': 64, 'duree': 12, 'taux': '1.550'},
        ]
        
        inserted, updated = self._insert_taux(
            banque, grille_charden, date_debut, 
            frais_accessoires=2500, 
            use_duree_mois=True  # ⚠️ IMPORTANT : durées en MOIS
        )
        
        self.stdout.write(self.style.SUCCESS(f"   ✅ CHARDEN : {inserted} insérés, {updated} mis à jour"))
        return total_inserted + inserted, total_updated + updated

    def load_hope(self, date_debut, total_inserted, total_updated):
        """Charge les taux Hope (taux fixe 0.5%)"""
        self.stdout.write("\n📊 Chargement HOPE...")
        
        try:
            banque = Banque.objects.get(code_banque='HOPE')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.WARNING("   ⚠️  Banque HOPE non trouvée, ignorée"))
            return total_inserted, total_updated
        
        # Hope : Taux fixe 0.5% pour tous les âges (limite 64 ans)
        grille_hope = [
            {'tranche': 'Tous âges', 'age_min': 18, 'age_max': 64, 'duree': 1, 'taux': '0.500'},
        ]
        
        inserted, updated = self._insert_taux(
            banque, grille_hope, date_debut, 
            frais_accessoires=2500, 
            use_duree_mois=False
        )
        
        self.stdout.write(self.style.SUCCESS(f"   ✅ HOPE : {inserted} insérés, {updated} mis à jour"))
        return total_inserted + inserted, total_updated + updated

    def load_ecobank(self, date_debut, total_inserted, total_updated):
        """Charge les taux Ecobank (taux fixe 0.55%)"""
        self.stdout.write("\n📊 Chargement ECOBANK...")
        
        try:
            banque = Banque.objects.get(code_banque='ECOBANK')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.WARNING("   ⚠️  Banque ECOBANK non trouvée, ignorée"))
            return total_inserted, total_updated
        
        # Ecobank : Taux fixe 0.55%
        grille_ecobank = [
            {'tranche': 'Tous âges', 'age_min': 18, 'age_max': 64, 'duree': 1, 'taux': '0.550'},
        ]
        
        inserted, updated = self._insert_taux(
            banque, grille_ecobank, date_debut, 
            frais_accessoires=5000, 
            use_duree_mois=False
        )
        
        self.stdout.write(self.style.SUCCESS(f"   ✅ ECOBANK : {inserted} insérés, {updated} mis à jour"))
        return total_inserted + inserted, total_updated + updated

    def load_cdco(self, date_debut, total_inserted, total_updated):
        """Charge les taux CDCO (taux fixe 0.5%)"""
        self.stdout.write("\n📊 Chargement CDCO...")
        
        try:
            banque = Banque.objects.get(code_banque='CDCO')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.WARNING("   ⚠️  Banque CDCO non trouvée, ignorée"))
            return total_inserted, total_updated
        
        # CDCO : Taux fixe 0.5% (d'après Simulateur_Emprunteur__CDCO.xlsx)
        grille_cdco = [
            {'tranche': 'Tous âges', 'age_min': 18, 'age_max': 64, 'duree': 1, 'taux': '0.500'},
        ]
        
        inserted, updated = self._insert_taux(
            banque, grille_cdco, date_debut, 
            frais_accessoires=2500, 
            use_duree_mois=False
        )
        
        self.stdout.write(self.style.SUCCESS(f"   ✅ CDCO : {inserted} insérés, {updated} mis à jour"))
        return total_inserted + inserted, total_updated + updated

    def _insert_taux(self, banque, grille, date_debut, frais_accessoires, use_duree_mois=False):
        """Fonction utilitaire pour insérer/mettre à jour les taux"""
        inserted = 0
        updated = 0
        
        for ligne in grille:
            # Préparer les données
            defaults = {
                'tranche_age': ligne['tranche'],
                'age_min': ligne['age_min'],
                'age_max': ligne['age_max'],
                'taux_pourcentage': Decimal(ligne['taux']),
                'frais_accessoires': Decimal(frais_accessoires),
                'produit': 'emprunteur',
                'date_debut_validite': date_debut,
                'actif': True,
            }
            
            # Durée en mois OU en années
            if use_duree_mois:
                defaults['duree_mois'] = ligne['duree']
                defaults['duree_annees'] = None
                lookup = {
                    'banque': banque,
                    'age_min': ligne['age_min'],
                    'age_max': ligne['age_max'],
                    'duree_mois': ligne['duree'],
                }
            else:
                defaults['duree_annees'] = ligne['duree']
                defaults['duree_mois'] = None
                lookup = {
                    'banque': banque,
                    'age_min': ligne['age_min'],
                    'age_max': ligne['age_max'],
                    'duree_annees': ligne['duree'],
                }
            
            # Insertion ou mise à jour
            obj, created = TableTauxEmprunteur.objects.update_or_create(
                **lookup,
                defaults=defaults
            )
            
            if created:
                inserted += 1
            else:
                updated += 1
        
        return inserted, updated