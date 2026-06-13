import urllib.request
import json
import urllib.parse
import subprocess
import tempfile
import os

# Local Keycloak endpoints
KEYCLOAK_CERTS_URL = "http://localhost:8080/realms/master/protocol/openid-connect/certs"
KEYCLOAK_ISSUER = "http://localhost:8080/realms/master"
KONG_ADMIN_URL = "http://localhost:8001"

def fetch_jwks():
    print(f"Fetching Keycloak JWKS from {KEYCLOAK_CERTS_URL}...")
    try:
        with urllib.request.urlopen(KEYCLOAK_CERTS_URL) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching JWKS from Keycloak: {e}")
        print("Please ensure Keycloak is running and accessible on localhost:8080.")
        return None

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

def configure_kong(pem):
    # 1. Create Keycloak consumer if not exists
    print("Configuring Kong Gateway...")
    consumer_data = json.dumps({"username": "keycloak-consumer"}).encode('utf-8')
    req = urllib.request.Request(
        f"{KONG_ADMIN_URL}/consumers",
        data=consumer_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req)
        print("Consumer 'keycloak-consumer' created.")
    except Exception as e:
        # Consumer might already exist, which is fine
        print("Consumer 'keycloak-consumer' already exists or creation skipped.")

    # 2. Add consumer to ACL group 'partners'
    acl_data = json.dumps({"group": "partners"}).encode('utf-8')
    req = urllib.request.Request(
        f"{KONG_ADMIN_URL}/consumers/keycloak-consumer/acls",
        data=acl_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req)
        print("Consumer added to ACL group 'partners'.")
    except Exception:
        print("Consumer already belongs to ACL group 'partners' or setup skipped.")

    # 3. Register Keycloak Public Certificate in Kong JWT credentials list
    # We first delete any existing JWT config for keycloak-consumer to prevent conflicts
    try:
        # Fetch existing JWT credentials for this consumer
        with urllib.request.urlopen(f"{KONG_ADMIN_URL}/consumers/keycloak-consumer/jwt") as response:
            existing = json.loads(response.read().decode('utf-8'))
            for cred in existing.get("data", []):
                # Delete existing credentials
                del_req = urllib.request.Request(
                    f"{KONG_ADMIN_URL}/consumers/keycloak-consumer/jwt/{cred['id']}",
                    method="DELETE"
                )
                urllib.request.urlopen(del_req)
        print("Cleaned up old JWT credentials in Kong.")
    except Exception:
        pass

    # Register new JWT credential
    # 'key' parameter maps to the token's 'iss' claim (http://localhost:8080/realms/master)
    jwt_data = json.dumps({
        "key": KEYCLOAK_ISSUER,
        "algorithm": "RS256",
        "rsa_public_key": pem
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f"{KONG_ADMIN_URL}/consumers/keycloak-consumer/jwt",
        data=jwt_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req)
        print("Keycloak OIDC JWT credential successfully registered on Kong!")
        print(f"Validated Issuer (iss): {KEYCLOAK_ISSUER}")
    except urllib.error.HTTPError as e:
        print(f"Error registering OIDC certificate in Kong: {e}")
        print(f"Response body: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"General error registering OIDC certificate: {e}")

if __name__ == "__main__":
    jwks = fetch_jwks()
    if jwks:
        pem = extract_pem(jwks)
        if pem:
            configure_kong(pem)
