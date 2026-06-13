# Generated manually - Ajout des modèles Produit et ProduitBanque

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_alter_utilisateur_agence_alter_utilisateur_role"),
    ]

    operations = [
        migrations.CreateModel(
            name="Produit",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(help_text="Code technique unique (ex: emprunteur, retraite, mobateli)", max_length=50, unique=True, verbose_name="Code produit")),
                ("nom", models.CharField(max_length=200, verbose_name="Nom du produit")),
                ("description", models.TextField(blank=True, verbose_name="Description")),
                ("est_actif", models.BooleanField(default=True, verbose_name="Actif")),
                ("date_creation", models.DateTimeField(auto_now_add=True)),
                ("date_modification", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Produit",
                "verbose_name_plural": "Produits",
                "ordering": ["nom"],
            },
        ),
        migrations.CreateModel(
            name="ProduitBanque",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("est_actif", models.BooleanField(default=True, verbose_name="Actif")),
                ("date_activation", models.DateTimeField(auto_now_add=True, verbose_name="Date d'activation")),
                ("convention_pdf", models.FileField(blank=True, help_text="Fichier PDF de la convention pour ce produit/banque", null=True, upload_to="conventions/", verbose_name="Convention PDF")),
                ("numero_convention", models.CharField(blank=True, help_text="Ex: 1000359", max_length=50, verbose_name="Numéro de convention")),
                ("parametres", models.JSONField(blank=True, default=dict, help_text="Configuration spécifique pour ce couple banque/produit", verbose_name="Paramètres spécifiques")),
                ("banque", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="produits_autorises", to="core.banque", verbose_name="Banque")),
                ("produit", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="banques_autorisees", to="core.produit", verbose_name="Produit")),
            ],
            options={
                "verbose_name": "Produit autorisé par banque",
                "verbose_name_plural": "Produits autorisés par banque",
                "ordering": ["banque__nom_complet", "produit__nom"],
                "unique_together": {("banque", "produit")},
            },
        ),
    ]
