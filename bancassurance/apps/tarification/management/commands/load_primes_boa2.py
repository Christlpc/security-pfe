# apps/tarification/management/commands/load_primes_boa.py

from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.core.models import Banque
from apps.tarification.models import TablePrimesMobateli, TablePrimesElikia, TableTauxEmprunteur


class Command(BaseCommand):
    help = 'Charge les grilles tarifaires BOA (Likama/Mobateli + Elikia + Emprunteur)'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Chargement des grilles BOA...")
        
        try:
            banque_boa = Banque.objects.get(code_banque='BOA')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Banque BOA non trouvée !"))
            self.stdout.write("Créez d'abord la banque BOA avec le code 'BOA'")
            return
        
        # === LIKAMA BOA (= MOBATELI) ===
        inserted_likama, updated_likama = self.load_likama_mobateli(banque_boa)
        
        # === ELIKIA SCOLAIRE BOA ===
        inserted_elikia, updated_elikia = self.load_elikia(banque_boa)
        
        # === EMPRUNTEUR BOA ===
        inserted_emprunteur, updated_emprunteur = self.load_emprunteur(banque_boa)
        
        # Résumé
        self.stdout.write(self.style.SUCCESS(f"\n✅ Chargement terminé !"))
        self.stdout.write(self.style.SUCCESS(f"   • Likama/Mobateli BOA : {inserted_likama} insérés, {updated_likama} mis à jour"))
        self.stdout.write(self.style.SUCCESS(f"   • Elikia BOA : {inserted_elikia} insérés, {updated_elikia} mis à jour"))
        self.stdout.write(self.style.SUCCESS(f"   • Emprunteur BOA : {inserted_emprunteur} insérés, {updated_emprunteur} mis à jour"))

    def load_likama_mobateli(self, banque):
        """
        Charge les primes Likama BOA (= Mobateli BOA)
        Utilise la table TablePrimesMobateli avec banque=BOA
        """
        self.stdout.write("\n📊 Chargement LIKAMA/MOBATELI BOA (DTC/IAD)...")
        
        # Grille Likama BOA (identique à Mobateli BCI d'après les images)
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
        Charge les primes Elikia Scolaire BOA
        Utilise la table TablePrimesElikia avec banque=BOA
        """
        self.stdout.write("\n📊 Chargement ELIKIA SCOLAIRE BOA...")
        
        # Grille Elikia BOA (identique à BCI d'après les images)
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

    def load_emprunteur(self, banque):
        """
        Charge les taux Emprunteur BOA
        Utilise la table TableTauxEmprunteur avec banque=BOA
        """
        self.stdout.write("\n📊 Chargement EMPRUNTEUR BOA...")
        
        # Grille Emprunteur BOA (de l'image emprunter_boa.png)
        grille = [
            # 39 ans et moins
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 1, 'taux': 0.26},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 2, 'taux': 0.53},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 3, 'taux': 0.82},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 4, 'taux': 1.13},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 5, 'taux': 1.48},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 6, 'taux': 1.85},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 7, 'taux': 2.25},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 8, 'taux': 2.68},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 9, 'taux': 3.14},
            {'tranche': '39 ans et moins', 'age_min': 18, 'age_max': 39, 'duree': 10, 'taux': 3.62},
            
            # 40-49 ans
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 1, 'taux': 0.55},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 2, 'taux': 1.09},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 3, 'taux': 1.68},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 4, 'taux': 2.30},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 5, 'taux': 2.96},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 6, 'taux': 3.66},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 7, 'taux': 4.40},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 8, 'taux': 5.17},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 9, 'taux': 5.98},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 10, 'taux': 6.82},
            
            # 50-55 ans
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 1, 'taux': 1.55},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 2, 'taux': 3.10},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 3, 'taux': 4.78},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 4, 'taux': 6.59},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 5, 'taux': 8.51},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 6, 'taux': 10.54},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 7, 'taux': 12.67},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 8, 'taux': 14.91},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 9, 'taux': 17.24},
            {'tranche': '50-55 ans', 'age_min': 50, 'age_max': 55, 'duree': 10, 'taux': 19.66},
            
            # 56 ans (limite d'âge progressif)
            {'tranche': '56 ans', 'age_min': 56, 'age_max': 56, 'duree': 1, 'taux': 10.54},
            {'tranche': '56 ans', 'age_min': 56, 'age_max': 56, 'duree': 2, 'taux': 12.67},
            {'tranche': '56 ans', 'age_min': 56, 'age_max': 56, 'duree': 3, 'taux': 14.91},
            {'tranche': '56 ans', 'age_min': 56, 'age_max': 56, 'duree': 4, 'taux': 17.24},
            
            # 57 ans
            {'tranche': '57 ans', 'age_min': 57, 'age_max': 57, 'duree': 1, 'taux': 10.54},
            {'tranche': '57 ans', 'age_min': 57, 'age_max': 57, 'duree': 2, 'taux': 12.67},
            {'tranche': '57 ans', 'age_min': 57, 'age_max': 57, 'duree': 3, 'taux': 14.91},
            
            # 58 ans
            {'tranche': '58 ans', 'age_min': 58, 'age_max': 58, 'duree': 1, 'taux': 10.54},
            {'tranche': '58 ans', 'age_min': 58, 'age_max': 58, 'duree': 2, 'taux': 12.67},
            
            # 59 ans
            {'tranche': '59 ans', 'age_min': 59, 'age_max': 59, 'duree': 1, 'taux': 10.54},
            
            # 61 ans
            {'tranche': '61 ans', 'age_min': 61, 'age_max': 61, 'duree': 1, 'taux': 1.55},
            {'tranche': '61 ans', 'age_min': 61, 'age_max': 61, 'duree': 2, 'taux': 3.10},
            {'tranche': '61 ans', 'age_min': 61, 'age_max': 61, 'duree': 3, 'taux': 4.78},
            {'tranche': '61 ans', 'age_min': 61, 'age_max': 61, 'duree': 4, 'taux': 6.59},
            
            # 62 ans
            {'tranche': '62 ans', 'age_min': 62, 'age_max': 62, 'duree': 1, 'taux': 1.55},
            {'tranche': '62 ans', 'age_min': 62, 'age_max': 62, 'duree': 2, 'taux': 3.10},
            {'tranche': '62 ans', 'age_min': 62, 'age_max': 62, 'duree': 3, 'taux': 4.78},
            
            # 63 ans
            {'tranche': '63 ans', 'age_min': 63, 'age_max': 63, 'duree': 1, 'taux': 1.55},
            {'tranche': '63 ans', 'age_min': 63, 'age_max': 63, 'duree': 2, 'taux': 3.10},
            
            # 64 ans
            {'tranche': '64 ans', 'age_min': 64, 'age_max': 64, 'duree': 1, 'taux': 1.55},
        ]
        
        inserted, updated = 0, 0
        for ligne in grille:
            obj, created = TableTauxEmprunteur.objects.update_or_create(
                banque=banque,
                age_min=ligne['age_min'],
                age_max=ligne['age_max'],
                duree_mois=ligne['duree'] * 12,  # Convertir en mois
                duree_annees=ligne['duree'],
                defaults={
                    'tranche_age': ligne['tranche'],
                    #'taux_mensuel': Decimal(str(ligne['taux'])) / Decimal('12'),  # Taux mensuel
                    'taux_pourcentage': Decimal(str(ligne['taux'])),
                    'actif': True,
                }
            )
            if created:
                inserted += 1
            else:
                updated += 1
        
        self.stdout.write(f"   ✅ Emprunteur BOA : {inserted} insérés, {updated} mis à jour")
        return inserted, updated