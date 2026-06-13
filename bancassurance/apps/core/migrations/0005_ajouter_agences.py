# migrations/XXXX_ajouter_agences.py

from django.db import migrations

def creer_agences_par_defaut(apps, schema_editor):
    """
    Créer des agences par défaut pour chaque banque
    et migrer les utilisateurs/simulations existants
    """
    Banque = apps.get_model('core', 'Banque')
    Agence = apps.get_model('core', 'Agence')
    Utilisateur = apps.get_model('core', 'Utilisateur')
    Simulation = apps.get_model('simulateur', 'Simulation')
    
    for banque in Banque.objects.all():
        # Créer une agence par défaut "Siège"
        agence_siege, created = Agence.objects.get_or_create(
            banque=banque,
            code=f"{banque.code_banque}-SIEGE",
            defaults={
                'nom': f'Siège {banque.nom_court}',
                'ville': 'Brazzaville',
                'active': True
            }
        )
        
        # Migrer tous les gestionnaires vers cette agence
        Utilisateur.objects.filter(
            banque=banque,
            role='gestionnaire',
            agence__isnull=True
        ).update(agence=agence_siege)
        
        # Migrer toutes les simulations vers cette agence
        Simulation.objects.filter(
            banque=banque,
            agence__isnull=True
        ).update(agence=agence_siege)

class Migration(migrations.Migration):
    
    dependencies = [
        ('core', '0004_agence_utilisateur_agence'),
    ]
    
    operations = [
        migrations.RunPython(creer_agences_par_defaut),
    ]