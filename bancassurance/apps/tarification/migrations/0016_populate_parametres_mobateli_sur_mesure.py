"""
Peuple les paramètres actuariels par défaut pour Mobateli Sur Mesure.
Ces paramètres sont globaux (banque=NULL) et peuvent être overridés
par banque via ProduitBanque.parametres['sur_mesure'].
"""
from django.db import migrations


PARAMETRES = [
    # Chargements
    ('a', '0.12', 'decimal', "Frais d'acquisition (12%)"),
    ('gp', '0.15', 'decimal', "Frais de gestion (15%)"),
    ('e', '0.03', 'decimal', "Frais d'encaissement (3%)"),

    # Taux de garanties complémentaires
    ('taIPT', '0.001', 'decimal', "Taux IPT (Invalidité Permanente Totale)"),
    ('tada', '0.0012', 'decimal', "Taux Accident"),
    ('Tffa', '0.0251', 'decimal', "Taux Frais Funéraires Adhérent"),
    ('Tffe', '0.0019', 'decimal', "Taux Frais Funéraires Enfant"),
    ('taIPP', '0.002', 'decimal', "Taux IPP (Invalidité Permanente Partielle)"),

    # Frais Funéraires forfaitaires
    ('capital_ff_adherent', '1000000', 'decimal', "Capital FF adhérent (1 000 000 FCFA)"),
    ('capital_ff_conjoint', '1000000', 'decimal', "Capital FF conjoint (1 000 000 FCFA)"),
    ('capital_ff_enfant', '500000', 'decimal', "Capital FF enfant (500 000 FCFA)"),
    ('nb_enfants_max_ff', '4', 'integer', "Nombre max d'enfants pour FF"),

    # Coefficients de fractionnement
    ('f2', '0.02', 'decimal', "Coefficient fractionnement semestriel"),
    ('f4', '0.03', 'decimal', "Coefficient fractionnement trimestriel"),
    ('f12', '0.04', 'decimal', "Coefficient fractionnement mensuel"),

    # Frais accessoires
    ('frais_accessoires', '2500', 'decimal', "Frais accessoires (2 500 FCFA)"),

    # Limites
    ('age_min', '20', 'integer', "Âge minimum"),
    ('age_max', '70', 'integer', "Âge maximum"),
    ('duree_min', '1', 'integer', "Durée minimale (années)"),
    ('duree_max', '5', 'integer', "Durée maximale (années)"),
]


def populate_parametres(apps, schema_editor):
    ParametresProduits = apps.get_model('tarification', 'ParametresProduits')

    for param_nom, param_valeur, type_valeur, description in PARAMETRES:
        ParametresProduits.objects.update_or_create(
            produit_type='mobateli',
            param_nom=f'sur_mesure_{param_nom}',
            banque=None,
            defaults={
                'param_valeur': param_valeur,
                'type_valeur': type_valeur,
                'description': description,
                'actif': True,
            }
        )


def reverse_parametres(apps, schema_editor):
    ParametresProduits = apps.get_model('tarification', 'ParametresProduits')
    ParametresProduits.objects.filter(
        produit_type='mobateli',
        param_nom__startswith='sur_mesure_',
        banque=None,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('tarification', '0015_delete_tablelikamaboa'),
    ]

    operations = [
        migrations.RunPython(populate_parametres, reverse_parametres),
    ]
