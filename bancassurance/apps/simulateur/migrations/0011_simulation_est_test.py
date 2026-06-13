# Generated manually - Ajout du champ est_test sur Simulation

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("simulateur", "0010_remove_likama_from_produit_choices"),
    ]

    operations = [
        migrations.AddField(
            model_name="simulation",
            name="est_test",
            field=models.BooleanField(
                default=False,
                help_text="True = simulation de test/support NSIA, exclue des stats",
                verbose_name="Simulation de test",
            ),
        ),
        migrations.AddIndex(
            model_name="simulation",
            index=models.Index(
                fields=["est_test", "banque"],
                name="simulateur_s_est_tes_idx",
            ),
        ),
    ]
