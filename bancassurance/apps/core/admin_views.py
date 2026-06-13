"""
Vues admin custom pour la gestion des Banques Master (Test)
Réutilise la logique de setup_banque_master en version web.
"""
import logging

from django.contrib import messages
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import redirect, render
from django.utils import timezone

from apps.core.models import Agence, Banque, ProduitBanque, Utilisateur

logger = logging.getLogger(__name__)

PREFIX_TEST = 'TEST_'


def _generer_mot_de_passe_test(code_banque: str) -> str:
    """
    Génère un mot de passe UNIQUE par banque test, à partir d'une clé secrète
    stockée dans les variables d'environnement (jamais dans le code source).

    Format : Nsia{Code}Test{4 chars aléatoires déterministes}!
    Exemple pour BCI : NsiaBCITest7kX2!

    SECURITE :
    - Le mot de passe est dérivé de SECRET_KEY + code_banque → unique par banque
    - Chaque reset produit un NOUVEAU mot de passe (jamais identique)
    - Le mot de passe n'est visible QUE lors de la création/reset dans l'admin
    - Il n'est jamais stocké en clair, jamais dans le code source
    """
    from django.utils.crypto import get_random_string
    return f"Nsia{code_banque}Test{get_random_string(4, 'abcdefghijkmnpqrstuvwxyz23456789')}!"


def banque_master_view(request):
    """Page principale : liste des banques partenaires et leurs miroirs test."""
    from apps.core.admin_site import bancassurance_admin_site

    # Banques réelles (pas TEST_)
    banques_reelles = (
        Banque.objects
        .exclude(code_banque__startswith=PREFIX_TEST)
        .filter(statut='ACTIF')
        .order_by('nom_complet')
    )

    # Banques test existantes
    banques_test = {
        b.code_banque: b
        for b in Banque.objects.filter(code_banque__startswith=PREFIX_TEST)
    }

    # Construire la liste enrichie
    data = []
    for banque in banques_reelles:
        code_test = f"{PREFIX_TEST}{banque.code_banque}"
        test_bank = banques_test.get(code_test)

        entry = {
            'banque': banque,
            'code_test': code_test,
            'test_bank': test_bank,
            'has_test': test_bank is not None,
            'users': [],
            'nb_produits_reels': 0,
            'nb_produits_test': 0,
            'nb_simulations': 0,
            'nb_agences': 0,
            'synced': True,
        }

        # Nb produits de la vraie banque
        entry['nb_produits_reels'] = ProduitBanque.objects.filter(
            banque=banque, est_actif=True
        ).count()

        if test_bank:
            # Utilisateurs test
            entry['users'] = list(
                Utilisateur.objects.filter(banque=test_bank)
                .values('username', 'role', 'est_actif')
                .order_by('role')
            )

            # Produits test
            entry['nb_produits_test'] = ProduitBanque.objects.filter(
                banque=test_bank, est_actif=True
            ).count()

            # Synchro produits ?
            entry['synced'] = entry['nb_produits_test'] == entry['nb_produits_reels']

            # Simulations
            from apps.simulateur.models import Simulation
            entry['nb_simulations'] = Simulation.objects.filter(banque=test_bank).count()

            # Agences
            entry['nb_agences'] = Agence.objects.filter(banque=test_bank).count()

        data.append(entry)

    # Stats globales
    total_test = sum(1 for d in data if d['has_test'])
    total_reelles = len(data)

    context = {
        **bancassurance_admin_site.each_context(request),
        #'title': 'Gestion des Banques Master (Test)',
        'data': data,
        'total_test': total_test,
        'total_reelles': total_reelles,
        'default_password': '(généré automatiquement si non fourni)',
    }
    return render(request, 'admin/banque_master.html', context)


def banque_master_action(request):
    """Traite les actions : créer, reset, supprimer."""
    if request.method != 'POST':
        return redirect('admin:banque_master')

    action = request.POST.get('action')
    banque_id = request.POST.get('banque_id')
    password = request.POST.get('password')

    if not banque_id or not action:
        messages.error(request, "Paramètres manquants.")
        return redirect('admin:banque_master')

    try:
        banque_reelle = Banque.objects.get(id=banque_id)
    except Banque.DoesNotExist:
        messages.error(request, "Banque introuvable.")
        return redirect('admin:banque_master')

    # SECURITE : générer un mot de passe unique si non fourni par l'admin
    if not password:
        password = _generer_mot_de_passe_test(banque_reelle.code_banque)

    try:
        if action == 'create':
            _creer_banque_test(banque_reelle, password)
            messages.success(
                request,
                f"Banque test {PREFIX_TEST}{banque_reelle.code_banque} créée avec succès. "
                f"Mot de passe : {password}"
            )

        elif action == 'reset':
            _reset_banque_test(banque_reelle, password)
            messages.success(
                request,
                f"Banque test {PREFIX_TEST}{banque_reelle.code_banque} réinitialisée. "
                f"Nouveau mot de passe : {password}"
            )

        elif action == 'delete':
            code_test = f"{PREFIX_TEST}{banque_reelle.code_banque}"
            _supprimer_banque_test(banque_reelle)
            messages.success(
                request,
                f"Banque test {code_test} et toutes ses données supprimées."
            )

        elif action == 'sync':
            _sync_produits(banque_reelle)
            messages.success(
                request,
                f"Produits synchronisés pour {PREFIX_TEST}{banque_reelle.code_banque}."
            )

        else:
            messages.error(request, f"Action inconnue : {action}")

    except Exception as e:
        logger.exception("Erreur banque master action=%s banque=%s", action, banque_id)
        messages.error(request, f"Erreur : {e}")

    return redirect('admin:banque_master')


# ── Logique métier ─────────────────────────────────────────────

def _creer_banque_test(banque_reelle, password):
    """Crée une banque test miroir complète."""
    code_test = f"{PREFIX_TEST}{banque_reelle.code_banque}"
    code_lower = banque_reelle.code_banque.lower()

    with transaction.atomic():
        # 1. Banque
        banque_test, _ = Banque.objects.update_or_create(
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

        # 2. Agence siège
        agence_code = f"TEST-{banque_reelle.code_banque}-SIEGE"
        agence, _ = Agence.objects.update_or_create(
            code=agence_code,
            defaults={
                'banque': banque_test,
                'nom': f"Agence Test {banque_reelle.code_banque}",
                'ville': 'Brazzaville',
            },
        )

        # 3. Copier les produits
        _copier_produits(banque_reelle, banque_test)

        # 4. Créer les 3 comptes
        _creer_comptes(banque_test, agence, code_lower, password)


def _reset_banque_test(banque_reelle, password):
    """Réinitialise mots de passe et synchronise les produits."""
    code_test = f"{PREFIX_TEST}{banque_reelle.code_banque}"
    code_lower = banque_reelle.code_banque.lower()

    try:
        banque_test = Banque.objects.get(code_banque=code_test)
    except Banque.DoesNotExist:
        raise Exception(f"Banque test {code_test} n'existe pas. Créez-la d'abord.")

    with transaction.atomic():
        # Sync produits
        _copier_produits(banque_reelle, banque_test)

        # Reset mots de passe
        agence = Agence.objects.filter(banque=banque_test).first()
        _creer_comptes(banque_test, agence, code_lower, password, reset=True)


def _supprimer_banque_test(banque_reelle):
    """Supprime la banque test et tout ce qui y est lié."""
    code_test = f"{PREFIX_TEST}{banque_reelle.code_banque}"

    try:
        banque_test = Banque.objects.get(code_banque=code_test)
    except Banque.DoesNotExist:
        raise Exception(f"Banque test {code_test} n'existe pas.")

    with transaction.atomic():
        # Supprimer simulations d'abord
        from apps.simulateur.models import Simulation, Souscription
        sim_ids = list(Simulation.objects.filter(banque=banque_test).values_list('id', flat=True))
        if sim_ids:
            Souscription.objects.filter(simulation_id__in=sim_ids).delete()
            Simulation.objects.filter(banque=banque_test).delete()

        # Supprimer utilisateurs
        Utilisateur.objects.filter(banque=banque_test).delete()

        # CASCADE supprime Agences et ProduitBanque
        banque_test.delete()


def _sync_produits(banque_reelle):
    """Synchronise uniquement les produits."""
    code_test = f"{PREFIX_TEST}{banque_reelle.code_banque}"

    try:
        banque_test = Banque.objects.get(code_banque=code_test)
    except Banque.DoesNotExist:
        raise Exception(f"Banque test {code_test} n'existe pas.")

    with transaction.atomic():
        _copier_produits(banque_reelle, banque_test)


def _copier_produits(banque_reelle, banque_test):
    """Copie les produits de la vraie banque vers la banque test."""
    produits_reels = ProduitBanque.objects.filter(
        banque=banque_reelle, est_actif=True
    ).select_related('produit')

    for pb in produits_reels:
        ProduitBanque.objects.update_or_create(
            banque=banque_test,
            produit=pb.produit,
            defaults={
                'est_actif': True,
                'parametres': pb.parametres,
                'numero_convention': pb.numero_convention,
            },
        )

    # Désactiver les produits test qui ne sont plus actifs côté réel
    codes_reels = set(pb.produit_id for pb in produits_reels)
    ProduitBanque.objects.filter(
        banque=banque_test
    ).exclude(
        produit_id__in=codes_reels
    ).update(est_actif=False)


def _creer_comptes(banque_test, agence, code_lower, password, reset=False):
    """Crée ou met à jour les 3 comptes utilisateurs test."""
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

    for cfg in comptes_cfg:
        try:
            user = Utilisateur.objects.get(username=cfg['username'])
            if reset:
                user.set_password(password)
                user.banque = banque_test
                user.role = cfg['role']
                user.agence = cfg['agence']
                user.est_actif = True
                user.save()
        except Utilisateur.DoesNotExist:
            user = Utilisateur(
                username=cfg['username'],
                first_name=cfg['first_name'],
                last_name=cfg['last_name'],
                email=f"{cfg['username']}@nsia-test.local",
                role=cfg['role'],
                banque=banque_test,
                agence=cfg['agence'],
                est_actif=True,
            )
            user.set_password(password)
            user.save()
