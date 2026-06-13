# apps/tarification/management/commands/load_primes_comifi.py

from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.core.models import Banque
from apps.tarification.models import TablePrimesMobateli, TablePrimesElikia, TableTauxEmprunteur


class Command(BaseCommand):
    help = 'Charge les grilles tarifaires COMIFI (Likama/Mobateli + Elikia + Emprunteur)'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Chargement des grilles COMIFI...")
        
        try:
            banque_boa = Banque.objects.get(code_banque='COMIFI')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Banque COMIFI non trouvée !"))
            self.stdout.write("Créez d'abord la banque COMIFI avec le code 'COMIFI'")
            return
        
        # === LIKAMA COMIFI (= MOBATELI) ===
        inserted_likama, updated_likama = self.load_likama_mobateli(banque_boa)
        
        # === ELIKIA SCOLAIRE COMIFI ===
        inserted_elikia, updated_elikia = self.load_elikia(banque_boa)
        
       
        
        # Résumé
        self.stdout.write(self.style.SUCCESS(f"\n✅ Chargement terminé !"))
        self.stdout.write(self.style.SUCCESS(f"   • Likama/Mobateli COMIFI : {inserted_likama} insérés, {updated_likama} mis à jour"))
        self.stdout.write(self.style.SUCCESS(f"   • Elikia COMIFI : {inserted_elikia} insérés, {updated_elikia} mis à jour"))

    def load_likama_mobateli(self, banque):
        """
        Charge les primes Likama COMIFI (= Mobateli COMIFI)
        Utilise la table TablePrimesMobateli avec banque=COMIFI
        """
        self.stdout.write("\n📊 Chargement LIKAMA/MOBATELI COMIFI (DTC/IAD)...")
        
        # Grille Likama COMIFI (identique à Mobateli BCI d'après les images)
        grille = [
            {'capital': 2000000, 'tranche': 'Moins de 45 ans', 'age_min': 18, 'age_max': 44, 'prime': 34900},
            {'capital': 2000000, 'tranche': 'de 45 à 54 ans', 'age_min': 45, 'age_max': 54, 'prime': 45100},
            {'capital': 2000000, 'tranche': 'de 55 à 64 ans', 'age_min': 55, 'age_max': 64, 'prime': 65100},
            {'capital': 5000000, 'tranche': 'Moins de 45 ans', 'age_min': 18, 'age_max': 44, 'prime': 50800},
            {'capital': 5000000, 'tranche': 'de 45 à 54 ans', 'age_min': 45, 'age_max': 54, 'prime': 76300},
            {'capital': 5000000, 'tranche': 'de 55 à 64 ans', 'age_min': 55, 'age_max': 64, 'prime': 126300},
            {'capital': 7500000, 'tranche': 'Moins de 45 ans', 'age_min': 18, 'age_max': 44, 'prime': 64050},
            {'capital': 7500000, 'tranche': 'de 45 à 54 ans', 'age_min': 45, 'age_max': 54, 'prime': 102300},
            {'capital': 7500000, 'tranche': 'de 55 à 64 ans', 'age_min': 55, 'age_max': 64, 'prime': 177300},
        ]
        
        inserted, updated = 0, 0
        for ligne in grille:
            obj, created = TablePrimesMobateli.objects.update_or_create(
                banque=banque,
                capital_dtc_iad=Decimal(ligne['capital']),
                age_min=ligne['age_min'],
                age_max=ligne['age_max'],
                defaults={
                    'tranche_age': ligne['tranche'],
                    'prime_nette': Decimal(ligne['prime']),
                    'actif': True,
                }
            )
            if created:
                inserted += 1
                self.stdout.write(f"   ✅ Créé : {ligne['capital']:,} FCFA - {ligne['tranche']} - Prime {ligne['prime']:,}")
            else:
                updated += 1
                self.stdout.write(f"   🔄 MAJ : {ligne['capital']:,} FCFA - {ligne['tranche']} - Prime {ligne['prime']:,}")
        
        return inserted, updated

    def load_elikia(self, banque):
        """
        Charge les primes Elikia Scolaire COMIFI
        Utilise la table TablePrimesElikia avec banque=COMIFI
        """
        self.stdout.write("\n📊 Chargement ELIKIA SCOLAIRE COMIFI...")
        
        # Grille Elikia COMIFI (identique à BCI d'après les images)
        grille = [
            # Rente 200 000
            {'rente': 200000, 'capital': 953308, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 5000},
            {'rente': 200000, 'capital': 953308, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 10000},
            {'rente': 200000, 'capital': 953308, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 20000},
            
            # Rente 400 000
            {'rente': 400000, 'capital': 1906616, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 10000},
            {'rente': 400000, 'capital': 1906616, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 20000},
            {'rente': 400000, 'capital': 1906616, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 37000},
            
            # Rente 600 000
            {'rente': 600000, 'capital': 2859924, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 15000},
            {'rente': 600000, 'capital': 2859924, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 30000},
            {'rente': 600000, 'capital': 2859924, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 55000},
            
            # Rente 800 000
            {'rente': 800000, 'capital': 3813233, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 20000},
            {'rente': 800000, 'capital': 3813233, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 40000},
            {'rente': 800000, 'capital': 3813233, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 73000},
            
            # Rente 1 000 000
            {'rente': 1000000, 'capital': 4766541, 'tranche': '45 ans et moins', 'age_min': 18, 'age_max': 45, 'prime': 25000},
            {'rente': 1000000, 'capital': 4766541, 'tranche': '46-55 ans', 'age_min': 46, 'age_max': 55, 'prime': 50000},
            {'rente': 1000000, 'capital': 4766541, 'tranche': '56-64 ans', 'age_min': 56, 'age_max': 64, 'prime': 90000},
        ]
        
        inserted, updated = 0, 0
        for ligne in grille:
            obj, created = TablePrimesElikia.objects.update_or_create(
                banque=banque,
                rente_annuelle=Decimal(ligne['rente']),
                duree_rente=5,  # Fixe pour Elikia
                age_min=ligne['age_min'],
                age_max=ligne['age_max'],
                defaults={
                    'tranche_age': ligne['tranche'],
                    'capital_garanti': Decimal(ligne['capital']),
                    'prime_nette_annuelle': Decimal(ligne['prime']),
                    'actif': True,
                }
            )
            if created:
                inserted += 1
                self.stdout.write(f"   ✅ Créé : Rente {ligne['rente']:,} - {ligne['tranche']} - Prime {ligne['prime']:,}")
            else:
                updated += 1
                self.stdout.write(f"   🔄 MAJ : Rente {ligne['rente']:,} - {ligne['tranche']} - Prime {ligne['prime']:,}")
        
        return inserted, updated