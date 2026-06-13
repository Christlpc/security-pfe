# Generated manually - Remplace les limit_choices_to statiques par des callables dynamiques
# Les banques autorisées pour Elikia/Mobateli sont désormais gérées via ProduitBanque

import django.db.models.deletion
from django.db import migrations, models
import apps.tarification.models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_populate_emprunteur_strategies"),
        ("tarification", "0013_alter_tableprimeselikia_banque_and_more"),
    ]

    operations = [
        # Elikia : limit_choices_to dynamique
        migrations.AlterField(
            model_name="tableprimeselikia",
            name="banque",
            field=models.ForeignKey(
                limit_choices_to=apps.tarification.models.banques_avec_elikia,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="primes_elikia",
                to="core.banque",
                verbose_name="Banque",
            ),
        ),
        # Mobateli : limit_choices_to dynamique
        migrations.AlterField(
            model_name="tableprimesmobateli",
            name="banque",
            field=models.ForeignKey(
                limit_choices_to=apps.tarification.models.banques_avec_mobateli,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="primes_mobateli",
                to="core.banque",
                verbose_name="Banque",
            ),
        ),
    ]
