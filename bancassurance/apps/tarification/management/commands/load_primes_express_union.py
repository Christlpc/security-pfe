# apps/tarification/management/commands/load_primes_EXPRESS_UNION.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from apps.core.models import Banque
from apps.tarification.models import TablePrimesElikia, TablePrimesMobateli


class Command(BaseCommand):
    help = 'Charge les grilles tarifaires EXPRESS_UNION (Elikia + Mobateli)'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Chargement des grilles EXPRESS_UNION...")
        
        try:
            banque_EXPRESS_UNION = Banque.objects.get(code_banque='EXPRESS_UNION')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Banque EXPRESS_UNION non trouvée !"))
            return
        
        date_debut = timezone.now().date()
        
        # === ELIKIA SCOLAIRE ===
        inserted_elikia, updated_elikia = self.load_elikia(banque_EXPRESS_UNION, date_debut)
        
        # === MOBATELI ===
        inserted_mobateli, updated_mobateli = self.load_mobateli(banque_EXPRESS_UNION, date_debut)
        
        # Résumé
        self.stdout.write(self.style.SUCCESS(f"\n✅ Chargement terminé !"))
        self.stdout.write(self.style.SUCCESS(f"   • Elikia : {inserted_elikia} insérés, {updated_elikia} mis à jour"))
        self.stdout.write(self.style.SUCCESS(f"   • Mobateli : {inserted_mobateli} insérés, {updated_mobateli} mis à jour"))

    def load_elikia(self, banque, date_debut):
        """Charge les primes Elikia Scolaire (d'après EXPRESS_UNION_elikia.png)"""
        self.stdout.write("\n📊 Chargement ELIKIA SCOLAIRE...")
        
        # Grille Elikia (EXPRESS_UNION_elikia.png)
        grille_elikia = [
            # Rente 200 000
            {'rente': 200000, 'duree': 5, 'capital': 953308, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 5000},
            {'rente': 200000, 'duree': 5, 'capital': 953308, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 10000},
            {'rente': 200000, 'duree': 5, 'capital': 953308, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 20000},
            
            # Rente 400 000
            {'rente': 400000, 'duree': 5, 'capital': 1906616, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 10000},
            {'rente': 400000, 'duree': 5, 'capital': 1906616, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 20000},
            {'rente': 400000, 'duree': 5, 'capital': 1906616, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 37000},
            
            # Rente 600 000
            {'rente': 600000, 'duree': 5, 'capital': 2859924, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 15000},
            {'rente': 600000, 'duree': 5, 'capital': 2859924, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 30000},
            {'rente': 600000, 'duree': 5, 'capital': 2859924, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 55000},
            
            # Rente 800 000
            {'rente': 800000, 'duree': 5, 'capital': 3813233, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 20000},
            {'rente': 800000, 'duree': 5, 'capital': 3813233, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 40000},
            {'rente': 800000, 'duree': 5, 'capital': 3813233, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 73000},
            
            # Rente 1 000 000
            {'rente': 1000000, 'duree': 5, 'capital': 4766541, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 25000},
            {'rente': 1000000, 'duree': 5, 'capital': 4766541, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 50000},
            {'rente': 1000000, 'duree': 5, 'capital': 4766541, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 90000},
        ]
        
        inserted = 0
        updated = 0
        
        for ligne in grille_elikia:
            obj, created = TablePrimesElikia.objects.update_or_create(
                banque=banque,
                rente_annuelle=Decimal(ligne['rente']),
                duree_rente=ligne['duree'],
                age_min=ligne['age_min'],
                age_max=ligne['age_max'],
                defaults={
                    'tranche_age': ligne['tranche'],
                    'capital_garanti': Decimal(ligne['capital']),
                    'prime_nette_annuelle': Decimal(ligne['prime']),
                    'date_debut_validite': date_debut,
                    'actif': True,
                }
            )
            
            if created:
                inserted += 1
            else:
                updated += 1
        
        self.stdout.write(self.style.SUCCESS(f"   ✅ Elikia : {inserted} insérés, {updated} mis à jour"))
        return inserted, updated

    def load_mobateli(self, banque, date_debut):
        """Charge les primes Mobateli (d'après EXPRESS_UNION_mobateli.png)"""
        self.stdout.write("\n📊 Chargement MOBATELI...")
        
        # Grille Mobateli (EXPRESS_UNION_mobateli.png)
        grille_mobateli = [
            # Capital 2 000 000
            {'capital': 2000000, 'tranche': 'Moins de 45 ans', 'age_min': 18, 'age_max': 44, 'prime': 34900},
            {'capital': 2000000, 'tranche': '45-54 ans', 'age_min': 45, 'age_max': 54, 'prime': 45100},
            {'capital': 2000000, 'tranche': '55-64 ans', 'age_min': 55, 'age_max': 64, 'prime': 65100},
            
            # Capital 5 000 000
            {'capital': 5000000, 'tranche': 'Moins de 45 ans', 'age_min': 18, 'age_max': 44, 'prime': 50800},
            {'capital': 5000000, 'tranche': '45-54 ans', 'age_min': 45, 'age_max': 54, 'prime': 76300},
            {'capital': 5000000, 'tranche': '55-64 ans', 'age_min': 55, 'age_max': 64, 'prime': 126300},
            
            # Capital 7 500 000
            {'capital': 7500000, 'tranche': 'Moins de 45 ans', 'age_min': 18, 'age_max': 44, 'prime': 64050},
            {'capital': 7500000, 'tranche': '45-54 ans', 'age_min': 45, 'age_max': 54, 'prime': 102300},
            {'capital': 7500000, 'tranche': '55-64 ans', 'age_min': 55, 'age_max': 64, 'prime': 177300},
        ]
        
        inserted = 0
        updated = 0
        
        for ligne in grille_mobateli:
            obj, created = TablePrimesMobateli.objects.update_or_create(
                banque=banque,
                capital_dtc_iad=Decimal(ligne['capital']),
                age_min=ligne['age_min'],
                age_max=ligne['age_max'],
                defaults={
                    'tranche_age': ligne['tranche'],
                    'prime_nette': Decimal(ligne['prime']),
                    'date_debut_validite': date_debut,
                    'actif': True,
                }
            )
            
            if created:
                inserted += 1
            else:
                updated += 1
        
        self.stdout.write(self.style.SUCCESS(f"   ✅ Mobateli : {inserted} insérés, {updated} mis à jour"))
        return inserted, updated

"""

RÉSUMÉ DE L'ARCHITECTURE

apps/tarification/models.py
├── TableTauxEmprunteur      → Produits à TAUX (BGFI, Charden, Hope, Ecobank, CDCO)
├── TablePrimesElikia         → Elikia Scolaire (EXPRESS_UNION) - PRIMES FORFAITAIRES
├── TablePrimesMobateli       → Mobateli (EXPRESS_UNION) - PRIMES FORFAITAIRES
├── TableCIMA_H               → Tables actuarielles (Retraite)
├── TablePrimesEtudes         → Études (toutes banques)
└── TableTauxMensuels         → Taux mensuels (Études)"""
