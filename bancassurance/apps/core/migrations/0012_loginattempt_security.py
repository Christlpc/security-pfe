# SECURITE : Migration pour le modèle LoginAttempt
# Créé dans le cadre de l'audit de sécurité du 15/04/2026
# Résout : VULN-11 (absence de verrouillage de compte)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_passwordresettoken"),
    ]

    operations = [
        migrations.CreateModel(
            name="LoginAttempt",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("ip_address", models.GenericIPAddressField()),
                ("username", models.CharField(max_length=150)),
                ("timestamp", models.DateTimeField(auto_now_add=True)),
                ("success", models.BooleanField(default=False)),
            ],
            options={
                "ordering": ["-timestamp"],
            },
        ),
        migrations.AddIndex(
            model_name="loginattempt",
            index=models.Index(
                fields=["username", "timestamp"],
                name="core_logina_usernam_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="loginattempt",
            index=models.Index(
                fields=["ip_address", "timestamp"],
                name="core_logina_ip_addr_idx",
            ),
        ),
    ]
