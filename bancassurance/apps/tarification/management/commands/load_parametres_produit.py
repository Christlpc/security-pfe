"""
Management command pour charger les paramètres par défaut des produits
"""
from django.core.management.base import BaseCommand
from apps.tarification.models import ParametresProduits


class Command(BaseCommand):
    help = 'Charge les paramètres par défaut pour tous les produits'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Chargement des paramètres produits...'))
        
        parametres = [
            # Paramètres Retraite
            ('retraite', 'taux_interet_technique', '0.035', 'decimal', 'Taux d\'intérêt technique'),
            ('retraite', 'frais_acquisition', '0.35', 'decimal', 'Frais d\'acquisition'),
            ('retraite', 'frais_gestion_1ere_annee', '0.10', 'decimal', 'Frais de gestion 1ère année'),
            ('retraite', 'frais_gestion_2e_10e_annee', '0.05', 'decimal', 'Frais de gestion 2e-10e année'),
            ('retraite', 'frais_gestion_apres_11e', '0.03', 'decimal', 'Frais de gestion après 11e année'),
            ('retraite', 'frais_gestion_epargne', '0.01', 'decimal', 'Frais de gestion sur épargne'),
            ('retraite', 'frais_gestion_prime_deces', '0.20', 'decimal', 'Frais de gestion sur prime décès'),
            
            # Paramètres Emprunteur
            ('emprunteur', 'frais_accessoires', '2500', 'integer', 'Frais accessoires forfaitaires'),
            ('emprunteur', 'taux_surprime_50ans', '0', 'decimal', 'Taux de surprime pour >50 ans'),
            
            # Paramètres Études
            ('etudes', 'base_reference_rente', '1100000', 'integer', 'Base de référence pour le calcul'),
            
            # Paramètres Elikia
            ('elikia', 'age_min_parent', '18', 'integer', 'Âge minimum parent'),
            ('elikia', 'age_max_parent', '64', 'integer', 'Âge maximum parent'),
            
            # Paramètres Mobateli
            ('mobateli', 'age_min_parent', '18', 'integer', 'Âge minimum parent'),
            ('mobateli', 'age_max_parent', '64', 'integer', 'Âge maximum parent'),
        ]
        
        created_count = 0
        updated_count = 0
        
        for produit_type, param_nom, param_valeur, type_valeur, description in parametres:
            obj, created = ParametresProduits.objects.update_or_create(
                produit_type=produit_type,
                param_nom=param_nom,
                banque=None,  # Paramètre général
                defaults={
                    'param_valeur': param_valeur,
                    'type_valeur': type_valeur,
                    'description': description,
                    'actif': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  ✨ Créé: {produit_type}.{param_nom}')
            else:
                updated_count += 1
                self.stdout.write(f'  ✓ Mis à jour: {produit_type}.{param_nom}')
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✅ Paramètres chargés avec succès !'))
        self.stdout.write('='*60)
        self.stdout.write(f'\n📊 STATISTIQUES:')
        self.stdout.write(f'  - Créés: {created_count}')
        self.stdout.write(f'  - Mis à jour: {updated_count}')
        self.stdout.write(f'  - Total: {ParametresProduits.objects.count()}')
        self.stdout.write('')