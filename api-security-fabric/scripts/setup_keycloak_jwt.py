import urllib.request
import json
import urllib.parse
import subprocess
import tempfile
import os
import sys


# Base URLs dynamically resolved from environment variables
KEYCLOAK_URL = os.environ.get("KEYCLOAK_URL", "http://localhost:8080").rstrip("/")
KONG_ADMIN_URL = os.environ.get("KONG_ADMIN_URL", "http://localhost:8001").rstrip("/")

def parse_realms_from_defaults():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # nsia_iam_central_enforcer/defaults/main.yml is located 2 directories up
    defaults_path = os.path.abspath(os.path.join(script_dir, "../../nsia_iam_central_enforcer/defaults/main.yml"))
    
    if not os.path.exists(defaults_path):
        print(f"Warning: Tenant registry defaults file not found at {defaults_path}")
        return []
        
    realms = []
    try:
        with open(defaults_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Simple regex to extract realms from YAML structure: realm: "BANK_ECOBANK"
        realm_matches = re.findall(r'realm:\s*"([^"]+)"', content)
        for r in realm_matches:
            if r not in realms:
                realms.append(r)
    except Exception as e:
        print(f"Error parsing defaults/main.yml: {e}")
    
    return realms

def extract_pem(jwks):
    # Find the active RS256 signature key
    for key in jwks.get("keys", []):
        if key.get("alg") == "RS256" and "x5c" in key:
            x5c = key["x5c"][0]
            # Wrap the base64 certificate at 64 characters
            cert_pem = "-----BEGIN CERTIFICATE-----\n"
            for i in range(0, len(x5c), 64):
                cert_pem += x5c[i:i+64] + "\n"
            cert_pem += "-----END CERTIFICATE-----"
            
            # Convert Certificate to Public Key using OpenSSL
            try:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.pem', delete=False) as temp_cert:
                    temp_cert.write(cert_pem)
                    temp_cert_path = temp_cert.name
                
                # Execute openssl to extract public key
                pubkey_pem = subprocess.check_output(
                    ["openssl", "x509", "-pubkey", "-noout", "-in", temp_cert_path],
                    universal_newlines=True
                )
                
                # Cleanup temp file
                os.unlink(temp_cert_path)
                
                print("Public key extracted successfully using OpenSSL!")
                return pubkey_pem
            except Exception as e:
                print(f"Error converting certificate to public key via openssl: {e}")
                return None
                
    print("Could not find a valid RS256 key with certificate in JWKS.")
    return None

def configure_kong_for_realm(realm, pem):
    # Normalized name for Kong Consumer: keycloak-consumer-bank-ecobank
    normalized_realm = realm.lower().replace("_", "-")
    consumer_name = f"keycloak-consumer-{normalized_realm}"
    issuer_url = f"{KEYCLOAK_URL}/realms/{realm}"
    
    print(f"Configuring Kong Gateway for consumer '{consumer_name}'...")
    
    # 1. Create consumer if it does not exist
    consumer_data = json.dumps({"username": consumer_name}).encode('utf-8')
    req = urllib.request.Request(
        f"{KONG_ADMIN_URL}/consumers",
        data=consumer_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req)
        print(f"Consumer '{consumer_name}' created.")
    except Exception:
        # Consumer might already exist, which is fine
        print(f"Consumer '{consumer_name}' already exists or creation skipped.")

    # 2. Add consumer to ACL group 'partners'
    acl_data = json.dumps({"group": "partners"}).encode('utf-8')
    req = urllib.request.Request(
        f"{KONG_ADMIN_URL}/consumers/{consumer_name}/acls",
        data=acl_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req)
        print(f"Consumer '{consumer_name}' added to ACL group 'partners'.")
    except Exception:
        print(f"Consumer '{consumer_name}' already belongs to ACL group 'partners' or setup skipped.")

    # 3. Register Keycloak Public Certificate in Kong JWT credentials list
    # We first delete any existing JWT config for this consumer to prevent conflicts
    try:
        # Fetch existing JWT credentials for this consumer
        with urllib.request.urlopen(f"{KONG_ADMIN_URL}/consumers/{consumer_name}/jwt") as response:
            existing = json.loads(response.read().decode('utf-8'))
            for cred in existing.get("data", []):
                # Delete existing credentials
                del_req = urllib.request.Request(
                    f"{KONG_ADMIN_URL}/consumers/{consumer_name}/jwt/{cred['id']}",
                    method="DELETE"
                )
                urllib.request.urlopen(del_req)
        print(f"Cleaned up old JWT credentials in Kong for '{consumer_name}'.")
    except Exception:
        pass

    # Register new JWT credential
    # 'key' parameter maps to the token's 'iss' claim
    jwt_data = json.dumps({
        "key": issuer_url,
        "algorithm": "RS256",
        "rsa_public_key": pem
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f"{KONG_ADMIN_URL}/consumers/{consumer_name}/jwt",
        data=jwt_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req)
        print(f"Keycloak OIDC JWT credential successfully registered on Kong for '{consumer_name}'!")
        print(f"Validated Issuer (iss): {issuer_url}")
    except urllib.error.HTTPError as e:
        print(f"Error registering OIDC certificate in Kong: {e}")
        print(f"Response body: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"General error registering OIDC certificate: {e}")

def configure_realm_oidc(realm):
    certs_url = f"{KEYCLOAK_URL}/realms/{realm}/protocol/openid-connect/certs"
    print(f"Fetching Keycloak JWKS from {certs_url}...")
    try:
        with urllib.request.urlopen(certs_url) as response:
            jwks = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching JWKS for realm {realm}: {e}")
        print(f"Please ensure Keycloak is running and realm '{realm}' exists.")
        return
        
    pem = extract_pem(jwks)
    if pem:
        configure_kong_for_realm(realm, pem)
    else:
        print(f"Could not extract PEM for realm {realm}.")

if __name__ == "__main__":
    import re
    
    realms_to_process = []
    
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg == "--all":
            realms_to_process = parse_realms_from_defaults()
            if not realms_to_process:
                print("No realms found in defaults/main.yml, defaulting to 'master'.")
                realms_to_process = ["master"]
        elif arg in ("--help", "-h"):
            print("Usage:")
            print("  python3 setup_keycloak_jwt.py [realm_name]  # Configure a specific realm (e.g. BANK_ECOBANK)")
            print("  python3 setup_keycloak_jwt.py --all         # Configure all realms from defaults/main.yml")
            print("  python3 setup_keycloak_jwt.py               # Defaults to configuring 'master' realm")
            sys.exit(0)
        else:
            realms_to_process = [arg]
    else:
        print("No realm specified. Defaulting to 'master' realm.")
        realms_to_process = ["master"]
        
    print(f"Keycloak URL: {KEYCLOAK_URL}")
    print(f"Kong Admin URL: {KONG_ADMIN_URL}")
    print(f"Realms to configure: {realms_to_process}")
    
    for r in realms_to_process:
        print(f"\n--- Configuring Realm: {r} ---")
        configure_realm_oidc(r)

