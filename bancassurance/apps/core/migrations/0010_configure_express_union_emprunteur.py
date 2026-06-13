"""
Configure ProduitBanque.parametres pour Express Union Emprunteur.

Express Union a deux grilles tarifaires :
- Personnel : taux basés sur un intérêt max 10%
- Clients   : taux basés sur un intérêt max 16%

Le paramètre types_tarif=['client', 'personnel'] indique au calculateur
que cette banque supporte les deux volets.
"""
from django.db import migrations


def configure_express_union(apps, schema_editor):
    ProduitBanque = apps.get_model('core', 'ProduitBanque')

    try:
        pb = ProduitBanque.objects.get(
            banque__code_banque='EXPRESS_UNION',
            produit__code='emprunteur',
        )
    except ProduitBanque.DoesNotExist:
        # Express Union n'a peut-être pas encore le produit emprunteur lié
        # On le crée si la banque et le produit existent
        Banque = apps.get_model('core', 'Banque')
        Produit = apps.get_model('core', 'Produit')
        try:
            banque = Banque.objects.get(code_banque='EXPRESS_UNION')
            produit = Produit.objects.get(code='emprunteur')
            pb = ProduitBanque.objects.create(
                banque=banque,
                produit=produit,
                est_actif=True,
                parametres={
                    'strategie_taux': 'par_annee',
                    'formule_prime': 'simple',
                    'types_tarif': ['client', 'personnel'],
                },
            )
            return
        except (Banque.DoesNotExist, Produit.DoesNotExist):
            return

    # Mettre à jour les paramètres existants
    params = pb.parametres or {}
    params['strategie_taux'] = 'par_annee'
    params['formule_prime'] = 'simple'
    params['types_tarif'] = ['client', 'personnel']
    pb.parametres = params
    pb.save()


def reverse(apps, schema_editor):
    ProduitBanque = apps.get_model('core', 'ProduitBanque')
    try:
        pb = ProduitBanque.objects.get(
            banque__code_banque='EXPRESS_UNION',
            produit__code='emprunteur',
        )
        params = pb.parametres or {}
        params.pop('types_tarif', None)
        pb.parametres = params
        pb.save()
    except ProduitBanque.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0009_populate_emprunteur_strategies'),
    ]

    operations = [
        migrations.RunPython(configure_express_union, reverse),
    ]
