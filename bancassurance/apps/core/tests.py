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
        # Récupération ou création préalable d'une banque pour le test
        self.banque, _ = Banque.objects.get_or_create(
            code_banque="ECOBANK",
            defaults={
                "nom_complet": "Ecobank Congo",
                "email_contact": "contact@ecobank.com"
            }
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

    def test_dynamic_provisioning_fallback_groups(self):
        user_uuid = str(uuid.uuid4())
        
        # Jeton sans agency_id ni agency, mais avec claim groups
        token_payload = {
            'sub': user_uuid,
            'preferred_username': 'ecobank_agent_fallback',
            'email': 'agent.fallback@ecobank.com',
            'given_name': 'Jean',
            'family_name': 'Dupont',
            'bank_id': 'ECOBANK',
            'groups': ['/ECOBANK-SIEGE/Poto-Poto'],
            'roles': ['BANK_AGENCY_OPERATOR']
        }
        
        token = jwt.encode(token_payload, "test-key", algorithm="HS256")
        
        class MockRequest:
            def __init__(self, token_str):
                self.headers = {'Authorization': f'Bearer {token_str}'}
                
        request = MockRequest(token)
        
        user, auth_data = self.auth.authenticate(request)
        
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'ecobank_agent_fallback')
        # L'agence doit être résolue depuis le claim groups
        self.assertIsNotNone(user.agence)
        self.assertEqual(user.agence.code, 'POTO-POTO')
        self.assertEqual(user.agence.banque, self.banque)



class MultiTenantMiddlewareTestCase(TestCase):
    """
    Tests d'intégration pour le MultiTenantMiddleware (Anti-BOLA).
    Valide l'extraction directe du bank_id depuis l'en-tête Authorization.
    """
    def setUp(self):
        self.banque = Banque.objects.create(
            code_banque="ECOBANK",
            nom_complet="Ecobank Congo",
            email_contact="contact@ecobank.com"
        )
        from apps.core.middleware import MultiTenantMiddleware
        self.middleware = MultiTenantMiddleware(get_response=lambda r: None)

    def test_middleware_jwt_extraction_and_rls_setup(self):
        # 1. Générer un jeton JWT de test contenant la banque ECOBANK
        token_payload = {
            'sub': str(uuid.uuid4()),
            'bank_id': 'ECOBANK',
            'roles': ['BANK_AGENCY_OPERATOR']
        }
        token = jwt.encode(token_payload, "secret", algorithm="HS256")

        # 2. Simuler une requête HTTP entrante avec l'en-tête Bearer
        class MockRequest:
            def __init__(self, token_str):
                self.headers = {'Authorization': f'Bearer {token_str}'}
                self.user = None

        request = MockRequest(token)

        # 3. Passer la requête à travers le middleware
        self.middleware.process_request(request)

        # 4. Vérifier que la banque a été injectée dans le contexte thread local
        from apps.core.middleware import get_current_banque
        current_banque = get_current_banque()
        self.assertIsNotNone(current_banque)
        self.assertEqual(current_banque.code_banque, "ECOBANK")

        # 5. Vérifier que les variables de session PostgreSQL ont été configurées
        with connection.cursor() as cursor:
            cursor.execute("SHOW app.current_banque_id;")
            db_banque_id = cursor.fetchone()[0]
            self.assertEqual(db_banque_id, str(self.banque.id))

            cursor.execute("SHOW app.bypass_rls;")
            db_bypass = cursor.fetchone()[0]
            self.assertEqual(db_bypass, "false")


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


from unittest.mock import patch, Mock

class KeycloakUserSyncTestCase(TestCase):
    """
    Tests unitaires pour la synchronisation des utilisateurs avec Keycloak.
    """
    def setUp(self):
        self.banque = Banque.objects.create(
            code_banque="ECOBANK",
            nom_complet="Ecobank Congo",
            email_contact="contact@ecobank.com"
        )
        self.agence = Agence.objects.create(
            banque=self.banque,
            code="ECOBANK-SIEGE",
            nom="Siège ECOBANK"
        )
        self.user = User(
            username="new_agent_test",
            email="new_agent@ecobank.com",
            first_name="Alice",
            last_name="Mamba",
            role=User.Role.GESTIONNAIRE,
            banque=self.banque,
            agence=self.agence,
            est_actif=True
        )

    @patch('requests.post')
    @patch('requests.get')
    def test_sync_django_user_to_keycloak(self, mock_get, mock_post):
        # Configurer les mocks
        # 1. Jeton admin Keycloak
        token_response = Mock()
        token_response.status_code = 200
        token_response.json.return_value = {'access_token': 'mock-admin-token'}
        
        # 2. Création de l'utilisateur (201 Created)
        create_response = Mock()
        create_response.status_code = 201
        create_response.headers = {'Location': 'http://localhost:8080/admin/realms/BANK_ECOBANK/users/mock-user-uuid-1234'}
        
        # 3. Association du rôle
        # GET role details
        role_response = Mock()
        role_response.status_code = 200
        role_response.json.return_value = {'id': 'role-uuid-5678', 'name': 'BANK_AGENCY_OPERATOR'}
        
        # POST role mapping
        map_response = Mock()
        map_response.status_code = 204
        
        mock_post.side_effect = [token_response, create_response, map_response]
        mock_get.return_value = role_response
        
        from apps.core.keycloak_sync import sync_django_user_to_keycloak
        
        user_uuid = sync_django_user_to_keycloak(self.user, "TempP@ssword12!")
        
        self.assertEqual(user_uuid, 'mock-user-uuid-1234')
        
        # Vérifier que requests.post a été appelé pour la création
        self.assertEqual(mock_post.call_count, 3)
        # Premier appel : login token admin
        # Deuxième appel : création utilisateur Keycloak (avec les attributs corrects)
        create_call_args = mock_post.call_args_list[1]
        self.assertIn('BANK_ECOBANK/users', create_call_args[0][0])
        payload = create_call_args[1]['json']
        self.assertEqual(payload['username'], 'new_agent_test')
        self.assertEqual(payload['attributes']['bank'], ['ECOBANK'])
        self.assertEqual(payload['attributes']['agency'], ['ECOBANK-SIEGE'])
        self.assertEqual(payload['attributes']['scope'], ['BANK'])

    @patch('requests.put')
    @patch('requests.post')
    def test_update_keycloak_user_status(self, mock_post, mock_put):
        token_response = Mock()
        token_response.status_code = 200
        token_response.json.return_value = {'access_token': 'mock-admin-token'}
        mock_post.return_value = token_response
        
        put_response = Mock()
        put_response.status_code = 204
        mock_put.return_value = put_response
        
        from apps.core.keycloak_sync import update_keycloak_user_status
        self.user.id = uuid.uuid4()
        
        update_keycloak_user_status(self.user, False)
        
        mock_put.assert_called_once()
        self.assertIn(str(self.user.id), mock_put.call_args[0][0])
        self.assertEqual(mock_put.call_args[1]['json']['enabled'], False)

