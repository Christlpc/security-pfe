"""
Migration : Suppression des champs BIA Mobateli dédiés.

Les données BIA de chaque produit sont stockées dans le JSONField
donnees_entree (pattern commun à tous les produits). Les colonnes
dédiées ajoutées par erreur sont supprimées.
"""
from django.db import migrations


# Colonnes ajoutées puis retirées du modèle
CHAMPS_A_SUPPRIMER = [
    'nationalite',
    'numero_piece_identite',
    'type_piece_identite',
    'adresse_geographique',
    'telephone_domicile',
    'telephone_bureau',
    'cellulaire',
    'email_professionnel',
    'poste_occupe',
    'adresse_employeur',
    'telephone_employeur',
    'correspondant_nom',
    'correspondant_telephone',
    'correspondant_cellulaire',
    'assure_est_souscripteur',
    'donnees_souscripteur',
    'donnees_conjoint',
    'donnees_enfants',
    'garanties_souscrites',
    'option_frais_funeraires',
    'mode_paiement',
    'type_cotisation',
    'date_premiere_prime',
    'date_effet',
    'date_echeance',
    'duree_contrat',
    'origine_des_fonds',
    'numero_client_nsia',
    'nom_conseiller',
]


def supprimer_colonnes(apps, schema_editor):
    """Supprime les colonnes si elles existent (idempotent)."""
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        # Récupérer les colonnes existantes
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'simulateur_simulation'"
        )
        colonnes_existantes = {row[0] for row in cursor.fetchall()}

        for champ in CHAMPS_A_SUPPRIMER:
            if champ in colonnes_existantes:
                cursor.execute(
                    f'ALTER TABLE simulateur_simulation DROP COLUMN "{champ}"'
                )
 

def noop(apps, schema_editor):
    """Reverse : ne rien faire (les colonnes ne sont plus nécessaires)."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('simulateur', '0012_rename_simulateur_s_est_tes_idx_simulateur__est_tes_78c324_idx'),
    ]

    operations = [
        migrations.RunPython(supprimer_colonnes, noop),
    ]
