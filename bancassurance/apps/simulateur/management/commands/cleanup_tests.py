"""
NETTOYAGE DES DONNÉES DE TEST
==============================
Supprime les simulations (et données liées) créées par les équipes NSIA
lors des tests et du support technique.

Usage:
    # Supprimer les simulations d'un utilisateur précis
    python manage.py cleanup_tests --user=admin_nsia

    # Supprimer les simulations de tous les admins NSIA/Super Admins
    python manage.py cleanup_tests --all-admins

    # Supprimer les simulations marquées comme test (est_test=True)
    python manage.py cleanup_tests --tests-only

    # Supprimer par banque + période (ex: nettoyage après une journée de support)
    python manage.py cleanup_tests --banque=ECOBANK --date=2026-03-27

    # Supprimer par banque + plage de dates
    python manage.py cleanup_tests --banque=ECOBANK --depuis=2026-03-25 --jusqua=2026-03-27

    # Mode dry-run (affiche ce qui serait supprimé)
    python manage.py cleanup_tests --user=admin_nsia --dry-run

    # Sans confirmation (pour scripts/cron)
    python manage.py cleanup_tests --tests-only --no-confirm

Sécurité:
    - Par défaut, demande confirmation avant de supprimer
    - Mode dry-run pour vérifier avant d'agir
    - Supprime en cascade : Simulation → Bénéficiaires, Questionnaires, Souscriptions
    - NE SUPPRIME JAMAIS les souscriptions au statut 'active' (vrais contrats)
"""

from datetime import date, datetime, timedelta
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from apps.core.models import Banque, Utilisateur
from apps.simulateur.models import Simulation, Beneficiaire, QuestionnaireMedical, Souscription


class Command(BaseCommand):
    help = "Supprime les simulations de test/support pour nettoyer les données des banques."

    def add_arguments(self, parser):
        # Filtres principaux (au moins un requis)
        group = parser.add_argument_group('Filtres (au moins un requis)')
        group.add_argument(
            '--user',
            type=str,
            help='Username de l\'utilisateur dont on supprime les simulations',
        )
        group.add_argument(
            '--all-admins',
            action='store_true',
            help='Supprimer les simulations de TOUS les ADMIN_NSIA et SUPER_ADMIN',
        )
        group.add_argument(
            '--tests-only',
            action='store_true',
            help='Supprimer uniquement les simulations marquées est_test=True',
        )

        # Filtres complémentaires
        parser.add_argument(
            '--banque',
            type=str,
            help='Filtrer par code banque (ex: ECOBANK)',
        )
        parser.add_argument(
            '--date',
            type=str,
            help='Supprimer les simulations d\'une date précise (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--depuis',
            type=str,
            help='Date de début de la plage (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--jusqua',
            type=str,
            help='Date de fin de la plage (YYYY-MM-DD)',
        )

        # Options
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher ce qui serait supprimé sans rien faire',
        )
        parser.add_argument(
            '--no-confirm',
            action='store_true',
            help='Supprimer sans demander confirmation',
        )

    def handle(self, *args, **options):
        user_filter = options.get('user')
        all_admins = options.get('all_admins')
        tests_only = options.get('tests_only')
        banque_code = options.get('banque')
        date_str = options.get('date')
        depuis_str = options.get('depuis')
        jusqua_str = options.get('jusqua')
        dry_run = options.get('dry_run', False)
        no_confirm = options.get('no_confirm', False)

        # Vérifier qu'au moins un filtre principal est donné
        if not any([user_filter, all_admins, tests_only]):
            raise CommandError(
                "Au moins un filtre requis : --user=USERNAME, --all-admins, ou --tests-only\n"
                "Ajoutez --dry-run pour voir ce qui serait supprimé."
            )

        # Construire le queryset
        qs = Simulation.objects.all()

        # Filtre par utilisateur
        if user_filter:
            try:
                user = Utilisateur.objects.get(username=user_filter)
                qs = qs.filter(gestionnaire=user)
                self.stdout.write(f"  Filtre : utilisateur = {user.get_full_name()} ({user.username})")
            except Utilisateur.DoesNotExist:
                raise CommandError(f"Utilisateur '{user_filter}' non trouvé.")

        # Filtre tous les admins
        if all_admins:
            admin_roles = ['SUPER_ADMIN', 'ADMIN_NSIA']
            admin_users = Utilisateur.objects.filter(role__in=admin_roles)
            if not admin_users.exists():
                self.stdout.write(self.style.WARNING("Aucun admin NSIA trouvé."))
                return
            qs = qs.filter(gestionnaire__in=admin_users)
            usernames = ', '.join(admin_users.values_list('username', flat=True))
            self.stdout.write(f"  Filtre : admins = {usernames}")

        # Filtre tests uniquement
        if tests_only:
            qs = qs.filter(est_test=True)
            self.stdout.write("  Filtre : est_test = True")

        # Filtre par banque
        if banque_code:
            try:
                banque = Banque.objects.get(code_banque=banque_code.upper())
                qs = qs.filter(banque=banque)
                self.stdout.write(f"  Filtre : banque = {banque.nom_complet}")
            except Banque.DoesNotExist:
                raise CommandError(f"Banque '{banque_code}' non trouvée.")

        # Filtre par date(s)
        if date_str:
            try:
                target_date = date.fromisoformat(date_str)
                qs = qs.filter(date_creation__date=target_date)
                self.stdout.write(f"  Filtre : date = {target_date}")
            except ValueError:
                raise CommandError(f"Format de date invalide : '{date_str}'. Attendu : YYYY-MM-DD")

        if depuis_str:
            try:
                depuis = date.fromisoformat(depuis_str)
                qs = qs.filter(date_creation__date__gte=depuis)
                self.stdout.write(f"  Filtre : depuis = {depuis}")
            except ValueError:
                raise CommandError(f"Format de date invalide : '{depuis_str}'")

        if jusqua_str:
            try:
                jusqua = date.fromisoformat(jusqua_str)
                qs = qs.filter(date_creation__date__lte=jusqua)
                self.stdout.write(f"  Filtre : jusqu'à = {jusqua}")
            except ValueError:
                raise CommandError(f"Format de date invalide : '{jusqua_str}'")

        # Exclure les souscriptions actives (vrais contrats !)
        qs = qs.exclude(
            souscription__statut='active'
        )

        # Compter les données liées
        count = qs.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("\n  Aucune simulation trouvée avec ces filtres."))
            return

        sim_ids = list(qs.values_list('id', flat=True))
        nb_beneficiaires = Beneficiaire.objects.filter(simulation_id__in=sim_ids).count()
        nb_questionnaires = QuestionnaireMedical.objects.filter(simulation_id__in=sim_ids).count()
        nb_souscriptions = Souscription.objects.filter(simulation_id__in=sim_ids).count()

        # Afficher le résumé
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"  RÉSUMÉ DES DONNÉES À SUPPRIMER")
        self.stdout.write(f"{'='*60}")
        self.stdout.write(f"  Simulations       : {count}")
        self.stdout.write(f"  Bénéficiaires     : {nb_beneficiaires}")
        self.stdout.write(f"  Questionnaires    : {nb_questionnaires}")
        self.stdout.write(f"  Souscriptions     : {nb_souscriptions}")
        self.stdout.write(f"{'='*60}")

        # Détail par banque/produit
        self.stdout.write("\n  Détail par banque :")
        for row in qs.values('banque__code_banque').annotate(
            nb=__import__('django.db.models', fromlist=['Count']).Count('id')
        ).order_by('-nb'):
            self.stdout.write(f"    {row['banque__code_banque']:15s} : {row['nb']} simulations")

        self.stdout.write("\n  Détail par produit :")
        for row in qs.values('produit').annotate(
            nb=__import__('django.db.models', fromlist=['Count']).Count('id')
        ).order_by('-nb'):
            self.stdout.write(f"    {row['produit']:15s} : {row['nb']} simulations")

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f"\n  MODE DRY-RUN : aucune donnée supprimée."
            ))
            return

        # Confirmation
        if not no_confirm:
            self.stdout.write("")
            response = input(
                f"  ⚠️  Supprimer {count} simulations et toutes leurs données liées ? [oui/NON] : "
            )
            if response.strip().lower() not in ['oui', 'o', 'yes', 'y']:
                self.stdout.write(self.style.WARNING("  Annulé."))
                return

        # Suppression
        with transaction.atomic():
            # Django CASCADE supprime les bénéficiaires et questionnaires automatiquement
            # Mais les souscriptions ont on_delete=PROTECT, il faut les supprimer d'abord
            Souscription.objects.filter(simulation_id__in=sim_ids).delete()
            deleted_count, details = qs.delete()

        self.stdout.write(self.style.SUCCESS(
            f"\n  ✅ {deleted_count} enregistrements supprimés au total."
        ))
        for model_name, count in details.items():
            self.stdout.write(f"    {model_name}: {count}")
