# apps/tarification/management/commands/load_primes_boa.py
#
# DÉPRÉCIÉ : Utilisez load_tarification à la place
# python manage.py load_tarification --banque=BOA --produit=mobateli --fichier=grilles/boa_mobateli.csv
#
# Corrigé : utilise TablePrimesMobateli au lieu de TableLikamaBOA (supprimé).

from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.core.models import Banque
from apps.tarification.models import TablePrimesMobateli


class Command(BaseCommand):
    help = '[DÉPRÉCIÉ] Charge les primes BOA (Likama→Mobateli). Utilisez load_tarification.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            "⚠️  Cette commande est DÉPRÉCIÉE.\n"
            "    Utilisez : python manage.py load_tarification --banque=BOA --produit=mobateli --fichier=grilles/boa.csv\n"
        ))
        self.stdout.write("🚀 Chargement des primes BOA (Mobateli)...")

        try:
            banque = Banque.objects.get(code_banque='BOA')
        except Banque.DoesNotExist:
            self.stdout.write(self.style.ERROR("❌ Banque BOA non trouvée !"))
            return

        # Grille BOA (anciennement "Likama", maintenant dans TablePrimesMobateli)
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
                self.stdout.write(f"   + Capital {ligne['capital']:,} - {ligne['tranche']} - Prime {ligne['prime']:,}")
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ BOA Mobateli : {inserted} insérés, {updated} mis à jour"
        ))
