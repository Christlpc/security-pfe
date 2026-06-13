"""
CRÉATION DES BANQUES TEST (MIROIR PAR PARTENAIRE)
==================================================
Crée une banque test isolée pour chaque banque partenaire, avec :
  - Les mêmes produits que la vraie banque
  - Une agence par défaut
  - 3 comptes (gestionnaire, resp. agence, resp. banque)

Chaque partenaire a son propre environnement de test, totalement isolé.

Usage:
    # Créer la banque test pour BCI
    python manage.py setup_banque_master --banque=BCI

    # Créer les banques test pour TOUTES les banques partenaires
    python manage.py setup_banque_master --all

    # Réinitialiser les mots de passe d'une banque test
    python manage.py setup_banque_master --banque=BCI --reset

    # Mot de passe personnalisé
    python manage.py setup_banque_master --banque=BCI --password=MonMdP123!

    # Voir l'état de toutes les banques test
    python manage.py setup_banque_master --info

    # Voir l'état d'une seule banque test
    python manage.py setup_banque_master --info --banque=BCI

    # Supprimer une banque test et tous ses comptes/données
    python manage.py setup_banque_master --banque=BCI --delete
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.core.models import Agence, Banque, Produit, ProduitBanque, Utilisateur


PREFIX_TEST = 'TEST_'
DEFAULT_PASSWORD = 'NsiaTest2026!'


class Command(BaseCommand):
    help = "Crée des banques test miroir (une par partenaire) avec comptes isolés."

    def add_arguments(self, parser):
        parser.add_argument(
            '--banque',
            type=str,
            help='Code de la vraie banque à dupliquer en test (ex: BCI, ECOBANK)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Créer une banque test pour CHAQUE banque partenaire active',
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Réinitialiser les mots de passe et mettre à jour les produits',
        )
        parser.add_argument(
            '--password',
            type=str,
            default=DEFAULT_PASSWORD,
            help=f'Mot de passe pour les comptes (défaut: {DEFAULT_PASSWORD})',
        )
        parser.add_argument(
            '--info',
            action='store_true',
            help='Afficher l\'état des banques test sans rien modifier',
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Supprimer la banque test et tous ses comptes/données',
        )

    def handle(self, *args, **options):
        banque_code = options.get('banque')
        all_banques = options.get('all')
        reset = options.get('reset')
        password = options['password']
        info_only = options.get('info')
        delete = options.get('delete')

        if info_only:
            self._afficher_info(banque_code)
            return

        if delete:
            if not banque_code:
                raise CommandError("--delete nécessite --banque=CODE")
            self._supprimer_banque_test(banque_code)
            return

        if not banque_code and not all_banques:
            raise CommandError(
                "Spécifiez --banque=CODE ou --all\n"
                "Exemples :\n"
                "  python manage.py setup_banque_master --banque=BCI\n"
                "  python manage.py setup_banque_master --all"
            )

        # Déterminer les banques à traiter
        if all_banques:
            banques_reelles = Banque.objects.filter(statut='ACTIF').exclude(
                code_banque__startswith=PREFIX_TEST
            )
            if not banques_reelles.exists():
                self.stdout.write(self.style.WARNING("  Aucune banque active trouvée."))
                return
        else:
            try:
                banques_reelles = [Banque.objects.get(code_banque=banque_code.upper())]
            except Banque.DoesNotExist:
                raise CommandError(f"Banque '{banque_code}' non trouvée.")

        # Créer chaque banque test
        resultats = []
        for banque_reelle in banques_reelles:
            with transaction.atomic():
                comptes = self._setup_banque_test(banque_reelle, password, reset)
                resultats.append((banque_reelle, comptes))

        # Résumé final
        self._afficher_resume(resultats, password)

    # ── Création ───────────────────────────────────────────────────────

    def _setup_banque_test(self, banque_reelle, password, reset):
        """Crée la banque test miroir d'une banque réelle."""
        code_test = f"{PREFIX_TEST}{banque_reelle.code_banque}"
        code_lower = banque_reelle.code_banque.lower()

        self.stdout.write(f"\n  {'─'*50}")
        self.stdout.write(f"  {banque_reelle.nom_complet} → {code_test}")
        self.stdout.write(f"  {'─'*50}")

        # 1. Banque test
        banque_test, created = Banque.objects.update_or_create(
            code_banque=code_test,
            defaults={
                'nom_complet': f"{banque_reelle.nom_complet} (Test)",
                'nom_court': f"TEST {banque_reelle.nom_court or banque_reelle.code_banque}",
                'email_contact': banque_reelle.email_contact,
                'telephone_contact': banque_reelle.telephone_contact,
                'adresse': banque_reelle.adresse,
                'couleur_primaire': banque_reelle.couleur_primaire,
                'couleur_secondaire': banque_reelle.couleur_secondaire,
                'statut': 'ACTIF',
            },
        )
        self.stdout.write(f"  Banque : {'créée' if created else 'mise à jour'}")

        # 2. Agence
        agence_code = f"TEST-{banque_reelle.code_banque}-SIEGE"
        agence, _ = Agence.objects.update_or_create(
            code=agence_code,
            defaults={
                'banque': banque_test,
                'nom': f"Agence Test {banque_reelle.code_banque}",
                'ville': 'Brazzaville',
            },
        )

        # 3. Copier les mêmes produits que la vraie banque
        self._copier_produits(banque_reelle, banque_test)

        # 4. Comptes utilisateurs
        comptes = self._creer_comptes(banque_test, agence, code_lower, password, reset)

        return comptes

    def _copier_produits(self, banque_reelle, banque_test):
        """Copie les produits de la vraie banque vers la banque test."""
        produits_reels = ProduitBanque.objects.filter(
            banque=banque_reelle, est_actif=True
        ).select_related('produit')

        count_new = 0
        for pb in produits_reels:
            _, created = ProduitBanque.objects.update_or_create(
                banque=banque_test,
                produit=pb.produit,
                defaults={
                    'est_actif': True,
                    'parametres': pb.parametres,  # Copier la config (stratégie taux, etc.)
                    'numero_convention': pb.numero_convention,
                },
            )
            if created:
                count_new += 1

        total = produits_reels.count()
        self.stdout.write(f"  Produits copiés : {total} ({count_new} nouveaux)")

    def _creer_comptes(self, banque_test, agence, code_lower, password, reset):
        """Crée les 3 comptes pour la banque test."""
        comptes_cfg = [
            {
                'username': f'test_{code_lower}_gestionnaire',
                'first_name': 'Gestionnaire',
                'last_name': f'Test {banque_test.nom_court}',
                'role': 'GESTIONNAIRE',
                'agence': agence,
            },
            {
                'username': f'test_{code_lower}_resp_agence',
                'first_name': 'Resp. Agence',
                'last_name': f'Test {banque_test.nom_court}',
                'role': 'RESPONSABLE_AGENCE',
                'agence': agence,
            },
            {
                'username': f'test_{code_lower}_resp_banque',
                'first_name': 'Resp. Banque',
                'last_name': f'Test {banque_test.nom_court}',
                'role': 'RESPONSABLE_BANQUE',
                'agence': None,
            },
        ]

        comptes_crees = []
        for cfg in comptes_cfg:
            username = cfg['username']
            try:
                user = Utilisateur.objects.get(username=username)
                if reset:
                    user.set_password(password)
                    user.banque = banque_test
                    user.role = cfg['role']
                    user.agence = cfg['agence']
                    user.est_actif = True
                    user.save()
                    self.stdout.write(f"  Compte {username} : réinitialisé")
                else:
                    self.stdout.write(f"  Compte {username} : existe déjà")
            except Utilisateur.DoesNotExist:
                user = Utilisateur(
                    username=username,
                    first_name=cfg['first_name'],
                    last_name=cfg['last_name'],
                    email=f"{username}@nsia-test.local",
                    role=cfg['role'],
                    banque=banque_test,
                    agence=cfg['agence'],
                    est_actif=True,
                )
                user.set_password(password)
                user.save()
                self.stdout.write(f"  Compte {username} : créé")

            comptes_crees.append({'username': username, 'role': cfg['role']})

        return comptes_crees

    # ── Suppression ────────────────────────────────────────────────────

    def _supprimer_banque_test(self, banque_code):
        """Supprime une banque test et tout ce qui lui est lié."""
        code_test = f"{PREFIX_TEST}{banque_code.upper()}"
        try:
            banque = Banque.objects.get(code_banque=code_test)
        except Banque.DoesNotExist:
            raise CommandError(f"Banque test '{code_test}' non trouvée.")

        # Compter ce qui sera supprimé
        nb_users = Utilisateur.objects.filter(banque=banque).count()
        nb_agences = Agence.objects.filter(banque=banque).count()
        nb_produits = ProduitBanque.objects.filter(banque=banque).count()

        from apps.simulateur.models import Simulation
        nb_sims = Simulation.objects.filter(banque=banque).count()

        self.stdout.write(f"\n  Suppression de {code_test} :")
        self.stdout.write(f"    Utilisateurs  : {nb_users}")
        self.stdout.write(f"    Agences       : {nb_agences}")
        self.stdout.write(f"    Produits liés : {nb_produits}")
        self.stdout.write(f"    Simulations   : {nb_sims}")

        response = input(f"\n  Confirmer la suppression de {code_test} ? [oui/NON] : ")
        if response.strip().lower() not in ('oui', 'o', 'yes', 'y'):
            self.stdout.write(self.style.WARNING("  Annulé."))
            return

        with transaction.atomic():
            # Supprimer les simulations d'abord (cascade)
            if nb_sims > 0:
                from apps.simulateur.models import Souscription
                sim_ids = list(Simulation.objects.filter(banque=banque).values_list('id', flat=True))
                Souscription.objects.filter(simulation_id__in=sim_ids).delete()
                Simulation.objects.filter(banque=banque).delete()

            Utilisateur.objects.filter(banque=banque).delete()
            # Banque CASCADE supprime Agences et ProduitBanque
            banque.delete()

        self.stdout.write(self.style.SUCCESS(f"\n  {code_test} supprimée avec succès."))

    # ── Affichage ──────────────────────────────────────────────────────

    def _afficher_resume(self, resultats, password):
        """Affiche le récapitulatif après création."""
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 65))
        self.stdout.write(self.style.SUCCESS("  BANQUES TEST PRÊTES"))
        self.stdout.write(self.style.SUCCESS("=" * 65))
        self.stdout.write("")
        self.stdout.write(f"  {'Username':<35s} {'Rôle':<22s} Banque test")
        self.stdout.write(f"  {'-'*35} {'-'*22} {'-'*15}")

        for banque_reelle, comptes in resultats:
            code_test = f"{PREFIX_TEST}{banque_reelle.code_banque}"
            for c in comptes:
                self.stdout.write(
                    f"  {c['username']:<35s} {c['role']:<22s} {code_test}"
                )

        self.stdout.write(f"\n  Mot de passe : {password}")
        self.stdout.write("  Chaque banque test est isolée : BCI ne voit pas ECOBANK.")
        self.stdout.write("")

    def _afficher_info(self, banque_code=None):
        """Affiche l'état des banques test."""
        if banque_code:
            code_test = f"{PREFIX_TEST}{banque_code.upper()}"
            banques_test = Banque.objects.filter(code_banque=code_test)
            if not banques_test.exists():
                self.stdout.write(self.style.WARNING(
                    f"  Banque test '{code_test}' non trouvée.\n"
                    f"  Créez-la : python manage.py setup_banque_master --banque={banque_code}"
                ))
                return
        else:
            banques_test = Banque.objects.filter(
                code_banque__startswith=PREFIX_TEST
            ).order_by('code_banque')

            if not banques_test.exists():
                self.stdout.write(self.style.WARNING(
                    "  Aucune banque test trouvée.\n"
                    "  Créez-en : python manage.py setup_banque_master --all"
                ))
                return

        from apps.simulateur.models import Simulation

        for banque in banques_test:
            self.stdout.write(f"\n  {'='*55}")
            self.stdout.write(f"  {banque.nom_complet}")
            self.stdout.write(f"  Code : {banque.code_banque}  |  Statut : {banque.statut}")

            # Produits
            produits = ProduitBanque.objects.filter(
                banque=banque, est_actif=True
            ).select_related('produit')
            noms = ', '.join(pb.produit.code for pb in produits)
            self.stdout.write(f"  Produits : {noms or 'aucun'}")

            # Utilisateurs
            users = Utilisateur.objects.filter(banque=banque)
            self.stdout.write(f"  Utilisateurs ({users.count()}) :")
            for u in users:
                status = "actif" if u.est_actif else "inactif"
                self.stdout.write(f"    {u.username:<35s} {u.role:<22s} [{status}]")

            # Simulations
            nb_sims = Simulation.objects.filter(banque=banque).count()
            self.stdout.write(f"  Simulations : {nb_sims}")

        self.stdout.write("")
