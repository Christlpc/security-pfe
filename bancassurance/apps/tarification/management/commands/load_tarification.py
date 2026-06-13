"""
COMMANDE UNIFIÉE DE CHARGEMENT DES TARIFICATIONS
==================================================
Remplace toutes les commandes load_primes_xxx et load_taux_emprunteur.

Usage:
    # Charger les taux emprunteur (ADI)
    python manage.py load_tarification --banque=FINAM --produit=emprunteur --fichier=grilles/finam_emprunteur.csv

    # Charger les primes Mobateli (DTC/IAD)
    python manage.py load_tarification --banque=BCI --produit=mobateli --fichier=grilles/bci_mobateli.csv

    # Charger les primes Elikia Scolaire
    python manage.py load_tarification --banque=BCI --produit=elikia --fichier=grilles/bci_elikia.csv

    # Mode dry-run (affiche sans insérer)
    python manage.py load_tarification --banque=BCI --produit=mobateli --fichier=grilles/test.csv --dry-run

    # Afficher les templates CSV attendus
    python manage.py load_tarification --template=emprunteur
    python manage.py load_tarification --template=mobateli
    python manage.py load_tarification --template=elikia

Formats CSV attendus:
    Voir --template pour chaque produit.

Auteur: NSIA Tech
"""

import csv
import os
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.core.models import Banque, Produit, ProduitBanque
from apps.tarification.models import (
    TableTauxEmprunteur,
    TablePrimesElikia,
    TablePrimesMobateli,
)


# ============================================
# TEMPLATES CSV (pour --template)
# ============================================
TEMPLATES = {
    'emprunteur': """# Template CSV pour les taux emprunteur (ADI)
# Colonnes obligatoires : tranche_age, age_min, age_max, duree, taux
# Colonnes optionnelles : frais_accessoires (défaut: 2500)
# La durée est en ANNÉES par défaut. Ajouter --duree-en-mois pour les durées en mois.
#
# Exemple (BGFI - taux par année) :
tranche_age,age_min,age_max,duree,taux,frais_accessoires
29 ans et moins,18,29,1,0.370,5000
29 ans et moins,18,29,2,0.490,5000
29 ans et moins,18,29,3,0.610,5000
30-39 ans,30,39,1,0.430,5000
30-39 ans,30,39,2,0.610,5000
#
# Exemple (ECOBANK - taux fixe) :
# tranche_age,age_min,age_max,duree,taux,frais_accessoires
# Tous âges,18,64,1,0.550,5000
""",

    'mobateli': """# Template CSV pour les primes Mobateli (DTC/IAD - Prévoyance)
# Colonnes obligatoires : capital_dtc_iad, tranche_age, age_min, age_max, prime_nette
#
# Exemple (BCI) :
capital_dtc_iad,tranche_age,age_min,age_max,prime_nette
2000000,Moins de 45 ans,18,44,34900
2000000,45-54 ans,45,54,45100
2000000,55-64 ans,55,64,65100
5000000,Moins de 45 ans,18,44,50800
5000000,45-54 ans,45,54,76300
5000000,55-64 ans,55,64,126300
7500000,Moins de 45 ans,18,44,64050
7500000,45-54 ans,45,54,102300
7500000,55-64 ans,55,64,177300
""",

    'elikia': """# Template CSV pour les primes Elikia Scolaire
# Colonnes obligatoires : rente_annuelle, duree_rente, capital_garanti, tranche_age, age_min, age_max, prime_nette_annuelle
#
# Exemple (BCI) :
rente_annuelle,duree_rente,capital_garanti,tranche_age,age_min,age_max,prime_nette_annuelle
200000,5,953308,45 ans et moins,18,45,5000
200000,5,953308,46-55 ans,46,55,10000
200000,5,953308,56-64 ans,56,64,20000
400000,5,1906616,45 ans et moins,18,45,10000
400000,5,1906616,46-55 ans,46,55,20000
400000,5,1906616,56-64 ans,56,64,37000
600000,5,2859924,45 ans et moins,18,45,15000
600000,5,2859924,46-55 ans,46,55,30000
600000,5,2859924,56-64 ans,56,64,55000
""",
}


class Command(BaseCommand):
    help = (
        "Commande unifiée pour charger les tarifications depuis un fichier CSV. "
        "Supporte : emprunteur (ADI), mobateli (DTC/IAD), elikia (Scolaire)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--banque',
            type=str,
            help='Code de la banque (ex: BGFI, BCI, BOA, ECOBANK)',
        )
        parser.add_argument(
            '--produit',
            type=str,
            choices=['emprunteur', 'mobateli', 'elikia'],
            help='Type de produit à charger',
        )
        parser.add_argument(
            '--fichier',
            type=str,
            help='Chemin vers le fichier CSV contenant les données',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher les données sans les insérer en base',
        )
        parser.add_argument(
            '--duree-en-mois',
            action='store_true',
            help='(Emprunteur uniquement) Interpréter la colonne durée en mois au lieu d\'années',
        )
        parser.add_argument(
            '--frais-accessoires',
            type=int,
            default=2500,
            help='(Emprunteur uniquement) Frais accessoires par défaut si absent du CSV (défaut: 2500)',
        )
        parser.add_argument(
            '--template',
            type=str,
            choices=['emprunteur', 'mobateli', 'elikia'],
            help='Afficher le template CSV pour un produit donné',
        )
        parser.add_argument(
            '--auto-link',
            action='store_true',
            default=True,
            help='Créer automatiquement le lien ProduitBanque si inexistant (défaut: True)',
        )
        parser.add_argument(
            '--type-tarif',
            type=str,
            choices=['client', 'personnel'],
            default='client',
            help="(Emprunteur uniquement) Type de grille tarifaire : 'client' (défaut) ou 'personnel'. "
                 "Les grilles personnel sont stockées avec produit='emprunteur_personnel'.",
        )

    def handle(self, *args, **options):
        # Mode template : afficher et sortir
        if options.get('template'):
            produit = options['template']
            self.stdout.write(f"\n📋 Template CSV pour {produit.upper()} :\n")
            self.stdout.write(TEMPLATES[produit])
            self.stdout.write(f"\n💡 Sauvegardez ce template dans un fichier .csv et remplissez-le.")
            return

        # Validation des arguments
        banque_code = options.get('banque')
        produit = options.get('produit')
        fichier = options.get('fichier')
        dry_run = options.get('dry_run', False)

        if not all([banque_code, produit, fichier]):
            raise CommandError(
                "Arguments requis: --banque=CODE --produit=TYPE --fichier=CHEMIN\n"
                "Utilisez --template=TYPE pour voir le format CSV attendu."
            )

        # Vérifier que le fichier existe
        if not os.path.exists(fichier):
            raise CommandError(f"Fichier introuvable : {fichier}")

        # Récupérer la banque
        try:
            banque = Banque.objects.get(code_banque=banque_code.upper())
        except Banque.DoesNotExist:
            raise CommandError(
                f"Banque '{banque_code}' non trouvée. "
                f"Créez-la d'abord dans l'admin Django."
            )

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"  CHARGEMENT TARIFICATION")
        self.stdout.write(f"  Banque  : {banque.nom_complet} ({banque.code_banque})")
        self.stdout.write(f"  Produit : {produit}")
        self.stdout.write(f"  Fichier : {fichier}")
        if dry_run:
            self.stdout.write(self.style.WARNING("  MODE DRY-RUN (aucune insertion)"))
        self.stdout.write(f"{'='*60}\n")

        # Auto-link ProduitBanque
        if options.get('auto_link') and not dry_run:
            self._assurer_produit_banque(banque, produit)

        # Lire le CSV
        lignes = self._lire_csv(fichier)
        self.stdout.write(f"  {len(lignes)} lignes lues dans le CSV\n")

        if not lignes:
            raise CommandError("Le fichier CSV est vide (ou ne contient que des commentaires).")

        # Dispatcher selon le produit
        if produit == 'emprunteur':
            inserted, updated = self._charger_emprunteur(
                banque, lignes, dry_run,
                duree_en_mois=options.get('duree_en_mois', False),
                frais_defaut=options.get('frais_accessoires', 2500),
                type_tarif=options.get('type_tarif', 'client'),
            )
        elif produit == 'mobateli':
            inserted, updated = self._charger_mobateli(banque, lignes, dry_run)
        elif produit == 'elikia':
            inserted, updated = self._charger_elikia(banque, lignes, dry_run)
        else:
            raise CommandError(f"Produit non supporté : {produit}")

        # Résumé
        self.stdout.write(f"\n{'='*60}")
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"  DRY-RUN: {inserted + updated} lignes auraient été traitées"
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ {inserted} insérés, {updated} mis à jour"
            ))
        self.stdout.write(f"{'='*60}\n")

    # ============================================
    # UTILITAIRES
    # ============================================

    def _lire_csv(self, fichier):
        """Lit un CSV en ignorant les commentaires (#) et les lignes vides."""
        lignes = []
        with open(fichier, 'r', encoding='utf-8-sig') as f:
            # Filtrer les commentaires
            lignes_filtrees = [
                line for line in f
                if line.strip() and not line.strip().startswith('#')
            ]

        if not lignes_filtrees:
            return []

        reader = csv.DictReader(lignes_filtrees)
        for row in reader:
            # Nettoyer les espaces
            cleaned = {k.strip(): v.strip() for k, v in row.items() if k}
            lignes.append(cleaned)

        return lignes

    def _assurer_produit_banque(self, banque, produit_code):
        """
        S'assure que le lien ProduitBanque existe.
        Si non, le crée automatiquement.
        """
        try:
            produit = Produit.objects.get(code=produit_code)
        except Produit.DoesNotExist:
            self.stdout.write(self.style.WARNING(
                f"  ⚠️  Produit '{produit_code}' non trouvé dans le catalogue. "
                f"Le lien ProduitBanque ne sera pas créé."
            ))
            return

        pb, created = ProduitBanque.objects.get_or_create(
            banque=banque,
            produit=produit,
            defaults={'est_actif': True, 'parametres': {}}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ Lien ProduitBanque créé : {banque.code_banque} → {produit.nom}"
            ))
        else:
            self.stdout.write(
                f"  ℹ️  Lien ProduitBanque existant : {banque.code_banque} → {produit.nom}"
            )

    def _to_decimal(self, value, field_name, line_num):
        """Convertit une valeur en Decimal avec gestion d'erreur claire."""
        try:
            # Gérer les séparateurs de milliers et virgules
            clean = str(value).replace(' ', '').replace('\xa0', '')
            return Decimal(clean)
        except (InvalidOperation, ValueError):
            raise CommandError(
                f"Ligne {line_num}: Valeur invalide pour '{field_name}': '{value}'. "
                f"Attendu: un nombre (ex: 0.370, 2500, 2000000)"
            )

    def _to_int(self, value, field_name, line_num):
        """Convertit une valeur en int avec gestion d'erreur claire."""
        try:
            return int(str(value).replace(' ', '').replace('\xa0', ''))
        except (ValueError, TypeError):
            raise CommandError(
                f"Ligne {line_num}: Valeur invalide pour '{field_name}': '{value}'. "
                f"Attendu: un entier (ex: 18, 64, 5)"
            )

    def _valider_colonnes(self, lignes, colonnes_requises, produit):
        """Vérifie que le CSV a toutes les colonnes requises."""
        if not lignes:
            return
        colonnes_csv = set(lignes[0].keys())
        manquantes = set(colonnes_requises) - colonnes_csv
        if manquantes:
            raise CommandError(
                f"Colonnes manquantes dans le CSV pour '{produit}' : {', '.join(manquantes)}\n"
                f"Colonnes trouvées : {', '.join(colonnes_csv)}\n"
                f"Utilisez --template={produit} pour voir le format attendu."
            )

    # ============================================
    # CHARGEURS PAR PRODUIT
    # ============================================

    @transaction.atomic
    def _charger_emprunteur(
        self, banque, lignes, dry_run,
        duree_en_mois=False, frais_defaut=2500, type_tarif='client'
    ):
        """
        Charge les taux emprunteur (ADI).

        Colonnes CSV requises : tranche_age, age_min, age_max, duree, taux
        Colonne optionnelle   : frais_accessoires

        Args:
            type_tarif: 'client' → produit='emprunteur' (défaut)
                        'personnel' → produit='emprunteur_personnel'
                        Permet de gérer les banques avec grilles différenciées (ex: Express Union)
        """
        self._valider_colonnes(lignes, ['tranche_age', 'age_min', 'age_max', 'duree', 'taux'], 'emprunteur')

        # Déterminer le code produit selon le type de tarif
        code_produit = 'emprunteur_personnel' if type_tarif == 'personnel' else 'emprunteur'
        if type_tarif == 'personnel':
            self.stdout.write(self.style.WARNING(
                f"  ⚙️  Type tarif : PERSONNEL (produit='{code_produit}')"
            ))

        date_debut = timezone.now().date()
        inserted, updated = 0, 0

        for i, ligne in enumerate(lignes, start=2):  # start=2 car ligne 1 = header
            age_min = self._to_int(ligne['age_min'], 'age_min', i)
            age_max = self._to_int(ligne['age_max'], 'age_max', i)
            duree = self._to_int(ligne['duree'], 'duree', i)
            taux = self._to_decimal(ligne['taux'], 'taux', i)
            frais = self._to_decimal(
                ligne.get('frais_accessoires', frais_defaut),
                'frais_accessoires', i
            )

            if dry_run:
                mode = "MOIS" if duree_en_mois else "ANS"
                self.stdout.write(
                    f"  [DRY] [{code_produit}] {ligne['tranche_age']} | {age_min}-{age_max} | "
                    f"durée={duree} {mode} | taux={taux}% | frais={frais}"
                )
                inserted += 1
                continue

            defaults = {
                'tranche_age': ligne['tranche_age'],
                'age_min': age_min,
                'age_max': age_max,
                'taux_pourcentage': taux,
                'frais_accessoires': frais,
                'produit': code_produit,
                'date_debut_validite': date_debut,
                'actif': True,
            }

            if duree_en_mois:
                defaults['duree_mois'] = duree
                defaults['duree_annees'] = None
                lookup = {
                    'banque': banque,
                    'produit': code_produit,
                    'age_min': age_min,
                    'age_max': age_max,
                    'duree_mois': duree,
                }
            else:
                defaults['duree_annees'] = duree
                defaults['duree_mois'] = None
                lookup = {
                    'banque': banque,
                    'produit': code_produit,
                    'age_min': age_min,
                    'age_max': age_max,
                    'duree_annees': duree,
                }

            obj, created = TableTauxEmprunteur.objects.update_or_create(
                **lookup, defaults=defaults
            )
            if created:
                inserted += 1
            else:
                updated += 1

        return inserted, updated

    @transaction.atomic
    def _charger_mobateli(self, banque, lignes, dry_run):
        """
        Charge les primes Mobateli (DTC/IAD - Prévoyance).

        Colonnes CSV requises : capital_dtc_iad, tranche_age, age_min, age_max, prime_nette
        """
        self._valider_colonnes(
            lignes,
            ['capital_dtc_iad', 'tranche_age', 'age_min', 'age_max', 'prime_nette'],
            'mobateli'
        )

        date_debut = timezone.now().date()
        inserted, updated = 0, 0

        for i, ligne in enumerate(lignes, start=2):
            capital = self._to_decimal(ligne['capital_dtc_iad'], 'capital_dtc_iad', i)
            age_min = self._to_int(ligne['age_min'], 'age_min', i)
            age_max = self._to_int(ligne['age_max'], 'age_max', i)
            prime = self._to_decimal(ligne['prime_nette'], 'prime_nette', i)

            if dry_run:
                self.stdout.write(
                    f"  [DRY] Capital={capital:,.0f} | {ligne['tranche_age']} | "
                    f"{age_min}-{age_max} | prime={prime:,.0f}"
                )
                inserted += 1
                continue

            obj, created = TablePrimesMobateli.objects.update_or_create(
                banque=banque,
                capital_dtc_iad=capital,
                age_min=age_min,
                age_max=age_max,
                defaults={
                    'tranche_age': ligne['tranche_age'],
                    'prime_nette': prime,
                    'date_debut_validite': date_debut,
                    'actif': True,
                }
            )
            if created:
                inserted += 1
            else:
                updated += 1

        return inserted, updated

    @transaction.atomic
    def _charger_elikia(self, banque, lignes, dry_run):
        """
        Charge les primes Elikia Scolaire.

        Colonnes CSV requises : rente_annuelle, duree_rente, capital_garanti,
                                tranche_age, age_min, age_max, prime_nette_annuelle
        """
        self._valider_colonnes(
            lignes,
            ['rente_annuelle', 'duree_rente', 'capital_garanti',
             'tranche_age', 'age_min', 'age_max', 'prime_nette_annuelle'],
            'elikia'
        )

        date_debut = timezone.now().date()
        inserted, updated = 0, 0

        for i, ligne in enumerate(lignes, start=2):
            rente = self._to_decimal(ligne['rente_annuelle'], 'rente_annuelle', i)
            duree = self._to_int(ligne['duree_rente'], 'duree_rente', i)
            capital = self._to_decimal(ligne['capital_garanti'], 'capital_garanti', i)
            age_min = self._to_int(ligne['age_min'], 'age_min', i)
            age_max = self._to_int(ligne['age_max'], 'age_max', i)
            prime = self._to_decimal(ligne['prime_nette_annuelle'], 'prime_nette_annuelle', i)

            if dry_run:
                self.stdout.write(
                    f"  [DRY] Rente={rente:,.0f} | {duree}ans | {ligne['tranche_age']} | "
                    f"{age_min}-{age_max} | prime={prime:,.0f}"
                )
                inserted += 1
                continue

            obj, created = TablePrimesElikia.objects.update_or_create(
                banque=banque,
                rente_annuelle=rente,
                duree_rente=duree,
                age_min=age_min,
                age_max=age_max,
                defaults={
                    'tranche_age': ligne['tranche_age'],
                    'capital_garanti': capital,
                    'prime_nette_annuelle': prime,
                    'date_debut_validite': date_debut,
                    'actif': True,
                }
            )
            if created:
                inserted += 1
            else:
                updated += 1

        return inserted, updated
