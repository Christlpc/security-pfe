# Generated manually - Populate ProduitBanque.parametres for emprunteur strategies
# Externalise les stratégies de calcul emprunteur (strategie_taux + formule_prime)
# qui étaient auparavant codées en dur dans calculateur_emprunteur.py

from django.db import migrations


def populate_emprunteur_strategies(apps, schema_editor):
    """
    Configure les paramètres de stratégie pour chaque banque ayant le produit emprunteur.

    strategie_taux :
        - "par_mois"  : Lookup par duree_mois (ex: Charden)
        - "par_annee" : Lookup par duree_annees (ex: BGFI, BOA)
        - "fixe"      : Pas de durée, taux par tranche d'âge (ex: Ecobank, CDCO)

    formule_prime :
        - "annualisee" : taux × (montant × durée × modalité) / 12
        - "simple"     : taux × montant (sans annualisation)
    """
    ProduitBanque = apps.get_model('core', 'ProduitBanque')
    Produit = apps.get_model('core', 'Produit')
    Banque = apps.get_model('core', 'Banque')

    try:
        produit_emprunteur = Produit.objects.get(code='emprunteur')
    except Produit.DoesNotExist:
        # Produit pas encore créé — skip (sera configuré manuellement)
        return

    # Mapping : code_banque → (strategie_taux, formule_prime)
    STRATEGIES = {
        # Banques avec formule simplifiée + lookup par année
        'BGFI': ('par_annee', 'simple'),
        'BOA': ('par_annee', 'simple'),
        'CHARDEN': ('par_mois', 'simple'),
        'CAPPED': ('par_annee', 'simple'),

        # Banques avec taux fixe + formule annualisée
        'HOPE': ('fixe', 'annualisee'),
        'ECOBANK': ('fixe', 'annualisee'),
        'CDCO': ('fixe', 'annualisee'),
        'COMIFI': ('fixe', 'annualisee'),
        'COFINCO': ('fixe', 'annualisee'),
        'FINAM': ('fixe', 'annualisee'),

        # BCI utilise lookup par mois + formule annualisée
        'BCI': ('par_mois', 'annualisee'),
    }

    for code_banque, (strategie, formule) in STRATEGIES.items():
        try:
            banque = Banque.objects.get(code_banque=code_banque)
            pb, created = ProduitBanque.objects.get_or_create(
                banque=banque,
                produit=produit_emprunteur,
                defaults={'est_actif': True, 'parametres': {}}
            )

            # Mettre à jour les paramètres (fusionner, ne pas écraser)
            params = pb.parametres or {}
            params['strategie_taux'] = strategie
            params['formule_prime'] = formule
            pb.parametres = params
            pb.save()

        except Banque.DoesNotExist:
            # Banque pas encore dans la base — skip
            continue


def reverse_strategies(apps, schema_editor):
    """Reverse : nettoie les paramètres de stratégie"""
    ProduitBanque = apps.get_model('core', 'ProduitBanque')
    Produit = apps.get_model('core', 'Produit')

    try:
        produit_emprunteur = Produit.objects.get(code='emprunteur')
    except Produit.DoesNotExist:
        return

    for pb in ProduitBanque.objects.filter(produit=produit_emprunteur):
        params = pb.parametres or {}
        params.pop('strategie_taux', None)
        params.pop('formule_prime', None)
        pb.parametres = params
        pb.save()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_populate_produits_and_produitbanque"),
    ]

    operations = [
        migrations.RunPython(
            populate_emprunteur_strategies,
            reverse_strategies,
        ),
    ]
