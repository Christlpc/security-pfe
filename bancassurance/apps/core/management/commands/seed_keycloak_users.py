import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.core.models import Utilisateur, Banque, Agence
from apps.core.keycloak_sync import sync_django_user_to_keycloak, reset_keycloak_user_password

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Seed les utilisateurs synchronisés avec Keycloak (nsia_mobile_admin, chef_ecobank1, gest_ecobank3)"

    def handle(self, *args, **options):
        self.stdout.write("🚀 Début du seeding des utilisateurs Keycloak...")

        # Récupération de la banque Ecobank et de l'agence siège
        try:
            banque_ecobank = Banque.objects.get(code_banque="ECOBANK")
            agence_siege = Agence.objects.get(code="ECOBANK-SIEGE", banque=banque_ecobank)
        except (Banque.DoesNotExist, Agence.DoesNotExist) as e:
            self.stderr.write(f"❌ Erreur : Ecobank ou son Agence Siège n'existe pas. Veuillez d'abord exécuter load_fixtures et seed_ecobank. ({str(e)})")
            return

        # Définition des utilisateurs à créer
        users_to_seed = [
            {
                "username": "nsia_mobile_admin",
                "email": "nsia_mobile_admin@nsiaassurance.com",
                "first_name": "Admin Mobile",
                "last_name": "NSIA",
                "role": Utilisateur.Role.SUPER_ADMIN,
                "banque": None,
                "agence": None,
                "password": "NsiaSuperAdmin2026!",
                "matricule": "M-NSIA-MOB-01"
            },
            {
                "username": "chef_ecobank1",
                "email": "chef_ecobank1@ecobank.com",
                "first_name": "Chef",
                "last_name": "Ecobank",
                "role": Utilisateur.Role.RESPONSABLE_AGENCE,
                "banque": banque_ecobank,
                "agence": agence_siege,
                "password": "ChefEcobank123!",
                "matricule": "M-ECO-CHEF-01"
            },
            {
                "username": "gest_ecobank3",
                "email": "gest_ecobank3@ecobank.com",
                "first_name": "Gestionnaire 3",
                "last_name": "Ecobank",
                "role": Utilisateur.Role.GESTIONNAIRE,
                "banque": banque_ecobank,
                "agence": agence_siege,
                "password": "GestEcobank123!",
                "matricule": "M-ECO-GEST-03"
            }
        ]

        for u_data in users_to_seed:
            username = u_data["username"]
            email = u_data["email"]
            password = u_data["password"]

            self.stdout.write(f"👤 Traitement de l'utilisateur {username}...")

            # 1. Vérifier si l'utilisateur existe déjà en local
            user, created = Utilisateur.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": u_data["first_name"],
                    "last_name": u_data["last_name"],
                    "role": u_data["role"],
                    "banque": u_data["banque"],
                    "agence": u_data["agence"],
                    "matricule": u_data["matricule"],
                    "is_active": True,
                }
            )

            # 2. Synchroniser ou réinitialiser avec Keycloak
            try:
                if created:
                    self.stdout.write(f"  🆕 Création de l'utilisateur {username} dans Keycloak...")
                    user_id = sync_django_user_to_keycloak(user, password)
                    user.id = user_id
                    user.set_password(password)
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f"  ✅ Utilisateur {username} créé localement et sur Keycloak ! (UUID: {user_id})"))
                else:
                    self.stdout.write(f"  ✓ Utilisateur {username} existe déjà localement. Réalignement du mot de passe Keycloak...")
                    try:
                        reset_keycloak_user_password(user, password)
                        self.stdout.write(self.style.SUCCESS(f"  ✅ Mot de passe Keycloak réaligné pour {username} !"))
                    except Exception as reset_err:
                        self.stdout.write(self.style.WARNING(f"  ⚠️ Impossible de réaligner le mot de passe Keycloak (l'utilisateur n'existe peut-être pas encore sur Keycloak). Tentative de création..."))
                        user_id = sync_django_user_to_keycloak(user, password)
                        user.id = user_id
                        user.set_password(password)
                        user.save()
                        self.stdout.write(self.style.SUCCESS(f"  ✅ Utilisateur {username} créé sur Keycloak ! (UUID: {user_id})"))

            except Exception as e:
                self.stderr.write(f"  ❌ Échec de la synchronisation Keycloak pour {username} : {str(e)}")

        self.stdout.write(self.style.SUCCESS("🎉 Seeding des utilisateurs Keycloak terminé !"))
