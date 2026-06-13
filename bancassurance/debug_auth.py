# debug_auth.py
from django.contrib.auth import get_user_model, authenticate

User = get_user_model()

email = 'gest_bgfi1@bgfi.com'
password = '1234'

print("=== DIAGNOSTIC AUTHENTIFICATION ===\n")

# 1. Vérifier existence
try:
    user = User.objects.get(email=email)
    print(f"✅ Utilisateur trouvé")
    print(f"   Email: {user.email}")
    print(f"   Actif: {user.is_active}")
    print(f"   Staff: {user.is_staff}")
    print(f"   Banque: {user.banque}")
    print(f"   Rôle: {user.role}")
except User.DoesNotExist:
    print(f"❌ Utilisateur {email} n'existe pas")
    exit()

# 2. Tester authentification
print("\n=== TEST AUTHENTIFICATION ===")
auth_user = authenticate(email=email, password=password)

if auth_user:
    print(f"✅ Authentification réussie")
    print(f"   User ID: {auth_user.id}")
else:
    print(f"❌ Authentification échouée")
    print(f"   Vérifiez le mot de passe")
    
    # Test avec mot de passe en clair
    print(f"\n   Hash stocké: {user.password[:20]}...")
    print(f"   Vérification: {user.check_password(password)}")

# 3. Vérifier les permissions JWT
print("\n=== CONFIGURATION JWT ===")
from django.conf import settings
print(f"   AUTH_USER_MODEL: {settings.AUTH_USER_MODEL}")
print(f"   JWT Config: {settings.SIMPLE_JWT}")