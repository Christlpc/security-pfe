import logging
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.core.models import Utilisateur, Banque, Agence
from apps.core.keycloak_sync import (
    sync_django_user_to_keycloak,
    reset_keycloak_user_password,
    get_keycloak_admin_token,
    get_keycloak_realm_from_banque
)

logger = logging.getLogger(__name__)

def get_keycloak_user_id(username, realm):
    """
    Recherche un utilisateur dans Keycloak par son nom d'utilisateur.
    """
    keycloak_url = getattr(settings, 'KEYCLOAK_URL', 'http://keycloak.nsia-iam.svc.cluster.local:8080')
    try:
        token = get_keycloak_admin_token()
    except Exception:
        return None
    url = f"{keycloak_url}/admin/realms/{realm}/users?username={username}"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            users = response.json()
            for u in users:
                if u.get('username') == username:
                    return u.get('id')
    except Exception:
        pass
    return None

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
                "password": "NsiaSuperAdmin2026!!",
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
                "password": "ChefEcobank123!!",
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
                "password": "GestEcobank123!!",
                "matricule": "M-ECO-GEST-03"
            }
        ]

        for u_data in users_to_seed:
            username = u_data["username"]
            email = u_data["email"]
            password = u_data["password"]
            role = u_data["role"]
            banque = u_data["banque"]
            agence = u_data["agence"]

            self.stdout.write(f"👤 Traitement de l'utilisateur {username}...")

            # Déterminer le realm
            realm = get_keycloak_realm_from_banque(banque)

            # 1. Vérifier si l'utilisateur existe déjà dans Keycloak
            keycloak_id = get_keycloak_user_id(username, realm)

            if keycloak_id:
                self.stdout.write(f"  ✓ Utilisateur {username} trouvé dans Keycloak (UUID: {keycloak_id}).")
                # Nettoyer l'utilisateur local s'il a un ID différent pour éviter les conflits d'unicité
                Utilisateur.objects.filter(username=username).exclude(id=keycloak_id).delete()
                
                # Mettre à jour ou créer localement avec le bon ID
                user, created = Utilisateur.objects.update_or_create(
                    id=keycloak_id,
                    defaults={
                        "username": username,
                        "email": email,
                        "first_name": u_data["first_name"],
                        "last_name": u_data["last_name"],
                        "role": role,
                        "banque": banque,
                        "agence": agence,
                        "matricule": u_data["matricule"],
                        "is_active": True,
                    }
                )
                
                # Réaligner le mot de passe dans Keycloak
                try:
                    reset_keycloak_user_password(user, password)
                    user.set_password(password)
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f"  ✅ Utilisateur {username} réaligné et synchronisé !"))
                except Exception as reset_err:
                    self.stderr.write(f"  ❌ Échec de la réinitialisation de mot de passe Keycloak pour {username} : {str(reset_err)}")
            else:
                self.stdout.write(f"  🆕 Création de l'utilisateur {username} dans Keycloak...")
                # Nettoyer l'utilisateur local s'il existe pour repartir sur de bonnes bases
                Utilisateur.objects.filter(username=username).delete()

                # Instancier l'utilisateur Django temporairement en mémoire
                user = Utilisateur(
                    username=username,
                    email=email,
                    first_name=u_data["first_name"],
                    last_name=u_data["last_name"],
                    role=role,
                    banque=banque,
                    agence=agence,
                    matricule=u_data["matricule"],
                    is_active=True
                )

                try:
                    user_id = sync_django_user_to_keycloak(user, password)
                    user.id = user_id
                    user.set_password(password)
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f"  ✅ Utilisateur {username} créé localement et sur Keycloak ! (UUID: {user_id})"))
                except Exception as e:
                    self.stderr.write(f"  ❌ Échec de la synchronisation Keycloak pour {username} : {str(e)}")

        self.stdout.write(self.style.SUCCESS("🎉 Seeding des utilisateurs Keycloak terminé !"))
