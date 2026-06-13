# apps/tarification/management/commands/load_primes_capped.py

from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.core.models import Banque
from apps.tarification.models import TablePrimesMobateli, TablePrimesElikia, TableTauxEmprunteur


class Command(BaseCommand):
    help = 'Charge les grilles tarifaires CAPPED (Likama/Mobateli + Elikia + Emprunteur)'

    def handle(self, *args, **options):
        self.stdout.write("🚀 Chargement des grilles CAPPED...")
        
        try:
            banque_boa = Banque.objects.get(code_banque='CAPPED')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Banque CAPPED non trouvée !"))
            self.stdout.write("Créez d'abord la banque CAPPED avec le code 'CAPPED'")
            return
        
        
        
        # === EMPRUNTEUR CAPPED ===
        inserted_emprunteur, updated_emprunteur = self.load_emprunteur(banque_boa)
        
        # Résumé
        self.stdout.write(self.style.SUCCESS(f"\n✅ Chargement terminé !"))
        self.stdout.write(self.style.SUCCESS(f"   • Emprunteur CAPPED : {inserted_emprunteur} insérés, {updated_emprunteur} mis à jour"))

 
    def load_emprunteur(self, banque):
        """
        Charge les taux Emprunteur CAPPED
        Utilise la table TableTauxEmprunteur avec banque=CAPPED
        """
        self.stdout.write("\n📊 Chargement EMPRUNTEUR CAPPED...")
        
        # Grille Emprunteur CAPPED (de l'image emprunter_boa.png)
        grille = [
            # 29 ans et moins
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 1, 'taux': 0.16},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 2, 'taux': 0.30},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 3, 'taux': 0.45},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 4, 'taux': 0.60},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 5, 'taux': 0.76},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 6, 'taux': 0.92},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 7, 'taux': 1.09},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 8, 'taux': 1.26},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 9, 'taux': 1.44},
            {'tranche': '29 ans et moins', 'age_min': 18, 'age_max': 29, 'duree': 10, 'taux': 1.63},

            # 30 – 39 ans
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 1, 'taux': 0.26},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 2, 'taux': 0.51},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 3, 'taux': 0.77},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 4, 'taux': 1.06},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 5, 'taux': 1.35},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 6, 'taux': 1.67},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 7, 'taux': 2.01},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 8, 'taux': 2.36},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 9, 'taux': 2.73},
            {'tranche': '30-39 ans', 'age_min': 30, 'age_max': 39, 'duree': 10, 'taux': 3.12},

            # 40 – 49 ans
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 1, 'taux': 0.54},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 2, 'taux': 1.06},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 3, 'taux': 1.59},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 4, 'taux': 2.15},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 5, 'taux': 2.72},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 6, 'taux': 3.32},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 7, 'taux': 3.94},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 8, 'taux': 4.57},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 9, 'taux': 5.23},
            {'tranche': '40-49 ans', 'age_min': 40, 'age_max': 49, 'duree': 10, 'taux': 5.92},

            # 50 – 59 ans
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 1, 'taux': 0.99},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 2, 'taux': 1.95},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 3, 'taux': 2.97},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 4, 'taux': 4.04},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 5, 'taux': 5.18},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 6, 'taux': 6.37},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 7, 'taux': 7.62},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 8, 'taux': 8.93},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 9, 'taux': 10.30},
            {'tranche': '50-59 ans', 'age_min': 50, 'age_max': 59, 'duree': 10, 'taux': 11.73},

            # 60 – 64 ans (jusqu’à 5 ans uniquement)
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 1, 'taux': 1.53},
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 2, 'taux': 2.99},
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 3, 'taux': 4.54},
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 4, 'taux': 6.15},
            {'tranche': '60-64 ans', 'age_min': 60, 'age_max': 64, 'duree': 5, 'taux': 7.82},
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
        
        self.stdout.write(f"   ✅ Emprunteur CAPPED : {inserted} insérés, {updated} mis à jour")
        return inserted, updated