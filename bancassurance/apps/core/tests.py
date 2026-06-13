import uuid
import jwt
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.db import connection
from apps.core.models import Banque, Agence
from apps.core.security import encrypt_value, decrypt_value, hash_value, get_encryption_key
from apps.core.authentication import KeycloakJWTAuthentication
from apps.core.middleware import set_current_banque, set_current_user
from apps.simulateur.models import Simulation

User = get_user_model()

class SecurityEncryptionTestCase(TestCase):
    """
    Tests unitaires pour les fonctions de chiffrement AES-256-GCM et hachage.
    """
    def test_aes_gcm_encrypt_decrypt(self):
        secret_text = "NSIA_SECRET_INFO_123"
        
        # Le chiffrement doit produire un résultat différent à chaque appel (selon le nonce unique)
        encrypted_1 = encrypt_value(secret_text)
        encrypted_2 = encrypt_value(secret_text)
        
        self.assertNotEqual(encrypted_1, encrypted_2)
        
        # Le déchiffrement doit reconstituer la valeur initiale
        self.assertEqual(decrypt_value(encrypted_1), secret_text)
        self.assertEqual(decrypt_value(encrypted_2), secret_text)

    def test_blind_index_hash(self):
        email = "test.agent@ecobank.com"
        
        # Le hachage aveugle doit être stable pour un même salt/SECRET_KEY
        hash_1 = hash_value(email)
        hash_2 = hash_value(email)
        
        self.assertEqual(hash_1, hash_2)
        self.assertEqual(len(hash_1), 64) # SHA-256 hex digest length


class KeycloakJWTAuthTestCase(TestCase):
    """
    Tests d'intégration pour l'authentification Keycloak JWT et le provisionnement dynamique.
    """
    def setUp(self):
        # Création préalable d'une banque pour le test
        self.banque = Banque.objects.create(
            code_banque="ECOBANK",
            nom_complet="Ecobank Congo",
            email_contact="contact@ecobank.com"
        )
        self.auth = KeycloakJWTAuthentication()

    def test_dynamic_provisioning_and_sync(self):
        user_uuid = str(uuid.uuid4())
        
        # Mock d'un JWT Payload Keycloak
        token_payload = {
            'sub': user_uuid,
            'preferred_username': 'ecobank_agent_test',
            'email': 'agent.test@ecobank.com',
            'given_name': 'Jean',
            'family_name': 'Dupont',
            'bank_id': 'ECOBANK',
            'agency_id': 'Plateau',
            'roles': ['BANK_AGENCY_OPERATOR']
        }
        
        # Signature factice (Kong valide en amont)
        token = jwt.encode(token_payload, "test-key", algorithm="HS256")
        
        class MockRequest:
            def __init__(self, token_str):
                self.headers = {'Authorization': f'Bearer {token_str}'}
                
        request = MockRequest(token)
        
        # Exécuter l'authentification Django
        user, auth_data = self.auth.authenticate(request)
        
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'ecobank_agent_test')
        self.assertEqual(user.email, 'agent.test@ecobank.com')
        self.assertEqual(user.role, User.Role.GESTIONNAIRE) # Mappé de BANK_AGENCY_OPERATOR
        self.assertEqual(user.banque, self.banque)
        
        # L'agence doit avoir été provisionnée dynamiquement
        self.assertIsNotNone(user.agence)
        self.assertEqual(user.agence.code, 'PLATEAU')
        self.assertEqual(user.agence.banque, self.banque)


class MultiTenancyORMAccessTestCase(TestCase):
    """
    Tests de l'isolation multi-tenant au niveau de l'ORM.
    """
    def setUp(self):
        self.banque_a = Banque.objects.create(
            code_banque="ECOBANK",
            nom_complet="Ecobank Congo",
            email_contact="contact@ecobank.com"
        )
        self.banque_b = Banque.objects.create(
            code_banque="BGFI",
            nom_complet="BGFI Bank Congo",
            email_contact="contact@bgfi.com"
        )
        
        # Agences
        self.agence_a = Agence.objects.create(banque=self.banque_a, code="PLATEAU", nom="Agence Plateau")
        self.agence_b = Agence.objects.create(banque=self.banque_b, code="BACONGO", nom="Agence Bacongo")

        # Utilisateurs
        self.user_a = User.objects.create_user(
            username="user_ecobank",
            email="a@test.com",
            password="password123",
            role=User.Role.GESTIONNAIRE,
            banque=self.banque_a,
            agence=self.agence_a
        )
        
        self.user_b = User.objects.create_user(
            username="user_bgfi",
            email="b@test.com",
            password="password123",
            role=User.Role.GESTIONNAIRE,
            banque=self.banque_b,
            agence=self.agence_b
        )

        # Simulations
        self.sim_a = Simulation.objects.create(
            banque=self.banque_a,
            agence=self.agence_a,
            gestionnaire=self.user_a,
            produit="elikia",
            donnees_entree={"montant": 100000}
        )
        
        self.sim_b = Simulation.objects.create(
            banque=self.banque_b,
            agence=self.agence_b,
            gestionnaire=self.user_b,
            produit="elikia",
            donnees_entree={"montant": 200000}
        )

    def test_tenant_filtering_for_bank_a(self):
        # Configurer le contexte thread local pour la banque A
        set_current_user(self.user_a)
        set_current_banque(self.banque_a)
        
        # L'ORM doit filtrer automatiquement les simulations
        sims = Simulation.objects.all()
        self.assertEqual(sims.count(), 1)
        self.assertEqual(sims.first(), self.sim_a)
        
        # Même chose pour les agences
        agences = Agence.objects.all()
        self.assertEqual(agences.count(), 1)
        self.assertEqual(agences.first(), self.agence_a)

    def test_tenant_filtering_for_bank_b(self):
        # Configurer le contexte thread local pour la banque B
        set_current_user(self.user_b)
        set_current_banque(self.banque_b)
        
        # L'ORM doit filtrer automatiquement les simulations
        sims = Simulation.objects.all()
        self.assertEqual(sims.count(), 1)
        self.assertEqual(sims.first(), self.sim_b)
        
        # Même chose pour les agences
        agences = Agence.objects.all()
        self.assertEqual(agences.count(), 1)
        self.assertEqual(agences.first(), self.agence_b)

    def tearDown(self):
        # Nettoyer les thread locals
        set_current_user(None)
        set_current_banque(None)
