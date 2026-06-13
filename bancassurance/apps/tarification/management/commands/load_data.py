# apps/simulateur/management/__init__.py
# (fichier vide)

# apps/simulateur/management/commands/__init__.py  
# (fichier vide)

# apps/simulateur/management/commands/load_nsia_data.py
"""
Commande Django pour charger les données NSIA
Usage: python manage.py load_data --cima-h=cima_h.csv --cima-f=cima_f.csv --primes=primes.csv
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
import pandas as pd
import os
from decimal import Decimal

from apps.tarification.models import (
    TableCIMA_H, TableCIMA_F, TablePrimesEtudes, 
    TableTauxMensuels, ParametresProduits
)


class Command(BaseCommand):
    help = 'Charge les données NSIA depuis des fichiers CSV'

    def add_arguments(self, parser):
        parser.add_argument(
            '--cima-h',
            type=str,
            help='Chemin vers le fichier CSV CIMA H',
        )
        parser.add_argument(
            '--cima-f',
            type=str,
            help='Chemin vers le fichier CSV CIMA F',
        )
        parser.add_argument(
            '--primes',
            type=str,
            help='Chemin vers le fichier CSV des primes',
        )
        parser.add_argument(
            '--taux',
            type=str,
            help='Chemin vers le fichier CSV des taux mensuels (optionnel)',
        )
        parser.add_argument(
            '--parametres-only',
            action='store_true',
            help='Charge uniquement les paramètres produits',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Vide toutes les tables avant chargement',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🚀 DÉBUT DU CHARGEMENT DES DONNÉES NSIA')
        )
        
        try:
            with transaction.atomic():
                if options['clear']:
                    self._clear_all_tables()
                
                if options['parametres_only']:
                    pass
                else:
                    self._load_all_data(options)
                    
        except Exception as e:
            raise CommandError(f'Erreur lors du chargement: {e}')
        
        self.stdout.write(
            self.style.SUCCESS('✅ CHARGEMENT TERMINÉ AVEC SUCCÈS')
        )

    def _clear_all_tables(self):
        """Vide toutes les tables"""
        self.stdout.write('🗑️ Suppression des données existantes...')
        
        TableCIMA_H.objects.all().delete()
        TableCIMA_F.objects.all().delete()
        TablePrimesEtudes.objects.all().delete()
        TableTauxMensuels.objects.all().delete()
        ParametresProduits.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS('   Toutes les tables vidées'))

   
    def _load_all_data(self, options):
        """Charge toutes les données"""
        
        
        # 2. CIMA H
        if options['cima_h']:
            self._load_cima_h(options['cima_h'])
        
        # 3. CIMA F
        if options['cima_f']:
            self._load_cima_f(options['cima_f'])
        
        # 4. Primes
        if options['primes']:
            self._load_primes(options['primes'])
        
        # 5. Taux mensuels
        self._load_taux_mensuels(options.get('taux'))
        
        # Résumé
        self._print_summary()

    def _load_cima_h(self, file_path):
        """Charge les données CIMA H"""
        self.stdout.write(f'👨 Chargement CIMA H depuis {file_path}...')
        
        if not os.path.exists(file_path):
            raise CommandError(f'Fichier CIMA H introuvable: {file_path}')
        
        df = pd.read_csv(file_path)
        
        # Vérification des colonnes
        colonnes_requises = ['x', 'lx', 'dxx', 'qx', 'Dx', 'Nx', 'Cx', 'Mx']
        if not all(col in df.columns for col in colonnes_requises):
            raise CommandError(f'Colonnes manquantes dans CIMA H. Attendues: {colonnes_requises}')
        
        # Suppression des données existantes
        TableCIMA_H.objects.all().delete()
        
        # Création des objets
        objets = []
        for _, row in df.iterrows():
            obj = TableCIMA_H(
                x=int(row['x']),
                lx=Decimal(str(row['lx'])),
                dxx=Decimal(str(row['dxx'])),
                qx=Decimal(str(row['qx'])),
                Dx=Decimal(str(row['Dx'])),
                Nx=Decimal(str(row['Nx'])),
                Cx=Decimal(str(row['Cx'])),
                Mx=Decimal(str(row['Mx']))
            )
            objets.append(obj)
        
        TableCIMA_H.objects.bulk_create(objets)
        
        count = TableCIMA_H.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'   ✅ {count} enregistrements CIMA H créés')
        )

    def _load_cima_f(self, file_path):
        """Charge les données CIMA F"""
        self.stdout.write(f'👩 Chargement CIMA F depuis {file_path}...')
        
        if not os.path.exists(file_path):
            raise CommandError(f'Fichier CIMA F introuvable: {file_path}')
        
        df = pd.read_csv(file_path)
        
        # Vérification des colonnes
        colonnes_requises = ['x', 'lx', 'dxx', 'qx', 'Dx', 'Nx', 'Cx', 'Mx']
        if not all(col in df.columns for col in colonnes_requises):
            raise CommandError(f'Colonnes manquantes dans CIMA F. Attendues: {colonnes_requises}')
        
        # Suppression des données existantes
        TableCIMA_F.objects.all().delete()
        
        # Création des objets
        objets = []
        for _, row in df.iterrows():
            obj = TableCIMA_F(
                x=int(row['x']),
                lx=Decimal(str(row['lx'])),
                dxx=Decimal(str(row['dxx'])),
                qx=Decimal(str(row['qx'])),
                Dx=Decimal(str(row['Dx'])),
                Nx=Decimal(str(row['Nx'])),
                Cx=Decimal(str(row['Cx'])),
                Mx=Decimal(str(row['Mx']))
            )
            objets.append(obj)
        
        TableCIMA_F.objects.bulk_create(objets)
        
        count = TableCIMA_F.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'   ✅ {count} enregistrements CIMA F créés')
        )

    def _load_primes(self, file_path):
        """Charge les données des primes"""
        self.stdout.write(f'💰 Chargement PRIMES depuis {file_path}...')
        
        if not os.path.exists(file_path):
            raise CommandError(f'Fichier PRIMES introuvable: {file_path}')
        
        df = pd.read_csv(file_path)
        
        # Vérification des colonnes
        colonnes_requises = ['age', 'duree_paiement', 'montant', 'type_prime', 'produit']
        if not all(col in df.columns for col in colonnes_requises):
            raise CommandError(f'Colonnes manquantes dans PRIMES. Attendues: {colonnes_requises}')
        
        # Suppression des données existantes
        # TablePrimes.objects.all().delete()
        
        # Création des objets
        objets = []
        for _, row in df.iterrows():
            duree_rente = None
            if 'duree_rente' in df.columns and pd.notna(row['duree_rente']):
                duree_rente = int(row['duree_rente'])
            
            capital = None
            if 'capital' in df.columns and pd.notna(row['capital']):
                capital = Decimal(str(row['capital']))
            
            obj = TablePrimesEtudes(
                age=int(row['age']),
                duree_paiement=int(row['duree_paiement']),
                montant=Decimal(str(row['montant'])),
                duree_rente=duree_rente,
                #capital=capital,
                type_prime=str(row['type_prime']),
                produit=str(row['produit'])
            )
            objets.append(obj)
        
        TablePrimesEtudes.objects.bulk_create(objets, ignore_conflicts=True)
        
        count = TablePrimesEtudes.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'   ✅ {count} enregistrements PRIMES créés')
        )

    def _load_taux_mensuels(self, file_path=None):
        """Charge les taux mensuels"""
        self.stdout.write('📈 Chargement TAUX MENSUELS...')
        
        # Suppression des données existantes
        TableTauxMensuels.objects.all().delete()
        
        if file_path and os.path.exists(file_path):
            # Chargement depuis CSV
            df = pd.read_csv(file_path)
            
            objets = []
            for _, row in df.iterrows():
                obj = TableTauxMensuels(
                    age=int(row['age']),
                    duree_paiement=int(row['duree_paiement']),
                    taux=Decimal(str(row['taux'])),
                    duree_rente=int(row['duree_rente']),
                    #type_prime=str(row.get('type_prime', 'mensuelle')),
                    produit=str(row.get('produit', 'etudes'))
                )
                objets.append(obj)
            
            TableTauxMensuels.objects.bulk_create(objets, ignore_conflicts=True)
        else:
            # Génération de taux par défaut
            self.stdout.write('   📝 Génération de taux par défaut...')
            
            objets = []
            for age in range(25, 61, 5):
                for duree_p in range(5, 21, 2):
                    for duree_s in [3, 4, 5]:
                        taux = Decimal('0.085') + Decimal(str((age - 30) * 0.001 + (duree_p - 10) * 0.002))
                        
                        obj = TableTauxMensuels(
                            age=age,
                            duree_paiement=duree_p,
                            taux=taux,
                            duree_rente=duree_s,
                            #type_prime='mensuelle',
                            produit='etudes'
                        )
                        objets.append(obj)
            
            TableTauxMensuels.objects.bulk_create(objets, ignore_conflicts=True)
        
        count = TableTauxMensuels.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'   ✅ {count} taux mensuels créés')
        )

    def _print_summary(self):
        """Affiche le résumé du chargement"""
        self.stdout.write('\n📊 RÉSUMÉ DU CHARGEMENT:')
        self.stdout.write('═' * 50)
        
        counts = {
            'Paramètres': ParametresProduits.objects.count(),
            'CIMA H': TableCIMA_H.objects.count(),
            'CIMA F': TableCIMA_F.objects.count(),
            'Primes': TablePrimesEtudes.objects.count(),
            'Taux mensuels': TableTauxMensuels.objects.count(),
        }
        
        for table, count in counts.items():
            if count > 0:
                self.stdout.write(f'✅ {table}: {count} enregistrements')
            else:
                self.stdout.write(f'⚠️  {table}: Aucun enregistrement')
        
        self.stdout.write('═' * 50)