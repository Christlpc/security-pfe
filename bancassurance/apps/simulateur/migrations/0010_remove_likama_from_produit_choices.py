# Generated manually - Retrait de likama des PRODUIT_CHOICES (fusionné avec mobateli)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("simulateur", "0009_alter_simulation_produit"),
        ("core", "0008_populate_produits_and_produitbanque"),
    ]

    operations = [
        migrations.AlterField(
            model_name="simulation",
            name="produit",
            field=models.CharField(
                choices=[
                    ("emprunteur", "Assurance Emprunteur"),
                    ("retraite", "Confort Retraite"),
                    ("etudes", "Confort Études"),
                    ("elikia", "Elikia Scolaire"),
                    ("mobateli", "Prévoyance (DTC/IAD)"),
                    ("epargne_plus", "Épargne Plus"),
                ],
                max_length=20,
                verbose_name="Type de produit",
            ),
        ),
    ]
