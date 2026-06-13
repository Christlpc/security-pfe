# Data migration - Peupler Produit et ProduitBanque avec les données existantes

from django.db import migrations


# Catalogue des produits NSIA
PRODUITS = [
    {
        'code': 'emprunteur',
        'nom': 'Assurance Emprunteur',
        'description': "Assurance Décès Invalidité (ADI) liée à un prêt bancaire. Couvre le remboursement du prêt en cas de décès ou d'invalidité de l'emprunteur.",
    },
    {
        'code': 'retraite',
        'nom': 'Confort Retraite',
        'description': "Produit d'épargne retraite avec rente viagère. Constitution d'un capital retraite par cotisations périodiques.",
    },
    {
        'code': 'etudes',
        'nom': 'Confort Études',
        'description': "Assurance éducation pour financer les études des enfants. Rente éducation versée sur une durée définie.",
    },
    {
        'code': 'elikia',
        'nom': 'Elikia Scolaire',
        'description': "Rente éducation avec primes forfaitaires. Produit de prévoyance scolaire.",
    },
    {
        'code': 'mobateli',
        'nom': 'Prévoyance (DTC/IAD)',
        'description': "Assurance Décès Toutes Causes / Invalidité Absolue et Définitive. Primes forfaitaires selon capital et âge.",
    },
    {
        'code': 'epargne_plus',
        'nom': 'Épargne Plus',
        'description': "Produit d'épargne avec capitalisation mensuelle des intérêts. Cotisation mensuelle minimum avec possibilité de rachat.",
    },
]

# Mapping banque → produits autorisés
# Basé sur l'analyse du code existant (calculateurs, tarifs, conventions)
BANQUE_PRODUITS = {
    'ECOBANK': ['emprunteur', 'retraite', 'etudes'],
    'BGFI': ['emprunteur', 'retraite', 'epargne_plus'],
    'BCI': ['emprunteur', 'elikia', 'mobateli'],
    'BOA': ['emprunteur', 'mobateli'],
    'CDCO': ['emprunteur', 'retraite'],
    'COMIFI': ['emprunteur', 'mobateli'],
    'COFINCO': ['emprunteur', 'mobateli'],
    'EXPRESS_UNION': ['emprunteur', 'mobateli'],
}


def populate_produits(apps, schema_editor):
    """Crée les produits dans le catalogue"""
    Produit = apps.get_model('core', 'Produit')

    for produit_data in PRODUITS:
        Produit.objects.get_or_create(
            code=produit_data['code'],
            defaults={
                'nom': produit_data['nom'],
                'description': produit_data['description'],
                'est_actif': True,
            }
        )


def populate_produitbanque(apps, schema_editor):
    """Lie chaque banque à ses produits autorisés"""
    Banque = apps.get_model('core', 'Banque')
    Produit = apps.get_model('core', 'Produit')
    ProduitBanque = apps.get_model('core', 'ProduitBanque')

    for code_banque, codes_produits in BANQUE_PRODUITS.items():
        try:
            banque = Banque.objects.get(code_banque=code_banque)
        except Banque.DoesNotExist:
            # Banque pas encore créée en DB, skip
            continue

        for code_produit in codes_produits:
            try:
                produit = Produit.objects.get(code=code_produit)
                ProduitBanque.objects.get_or_create(
                    banque=banque,
                    produit=produit,
                    defaults={'est_actif': True}
                )
            except Produit.DoesNotExist:
                continue


def migrate_likama_to_mobateli(apps, schema_editor):
    """
    Migre toutes les simulations 'likama' vers 'mobateli'.
    Likama BOA = Mobateli pour BOA, même produit DTC/IAD.
    """
    Simulation = apps.get_model('simulateur', 'Simulation')
    updated = Simulation.objects.filter(produit='likama').update(produit='mobateli')
    if updated:
        print(f"  → {updated} simulation(s) likama migrée(s) vers mobateli")


def reverse_migrate(apps, schema_editor):
    """Reverse : remet likama pour les simulations BOA"""
    Simulation = apps.get_model('simulateur', 'Simulation')
    Banque = apps.get_model('core', 'Banque')
    try:
        boa = Banque.objects.get(code_banque='BOA')
        Simulation.objects.filter(
            produit='mobateli',
            banque=boa
        ).update(produit='likama')
    except Banque.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_produit_produitbanque"),
        ("simulateur", "0009_alter_simulation_produit"),
    ]

    operations = [
        migrations.RunPython(populate_produits, migrations.RunPython.noop),
        migrations.RunPython(populate_produitbanque, migrations.RunPython.noop),
        migrations.RunPython(migrate_likama_to_mobateli, reverse_migrate),
    ]
