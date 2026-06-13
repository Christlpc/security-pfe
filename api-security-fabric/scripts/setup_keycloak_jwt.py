import urllib.request
import json
import urllib.parse
import subprocess
import tempfile
import os
import sys
import re

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

def fetch_realm_pem(realm):
    certs_url = f"{KEYCLOAK_URL}/realms/{realm}/protocol/openid-connect/certs"
    print(f"Fetching Keycloak JWKS from {certs_url}...")
    try:
        with urllib.request.urlopen(certs_url) as response:
            jwks = json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching JWKS for realm {realm}: {e}")
        print(f"Please ensure Keycloak is running and realm '{realm}' exists.")
        return None
        
    return extract_pem(jwks)

def generate_consumers_yaml(realms_keys):
    yaml_lines = []
    yaml_lines.append("consumers:")
    
    # 1. Add test-partner (HS256)
    yaml_lines.append("  - username: test-partner")
    yaml_lines.append("    acls:")
    yaml_lines.append("      - group: partners")
    yaml_lines.append("    jwt_secrets:")
    yaml_lines.append("      - key: test-iss")
    yaml_lines.append("        algorithm: HS256")
    yaml_lines.append("        secret: secret_partage_poc_nsia")
    
    # 2. Add Keycloak Consumers (RS256)
    for realm, pem in realms_keys.items():
        normalized_realm = realm.lower().replace("_", "-")
        consumer_name = f"keycloak-consumer-{normalized_realm}"
        issuer_url = f"{KEYCLOAK_URL}/realms/{realm}"
        
        yaml_lines.append(f"  - username: {consumer_name}")
        yaml_lines.append("    acls:")
        yaml_lines.append("      - group: partners")
        yaml_lines.append("    jwt_secrets:")
        yaml_lines.append(f"      - key: {issuer_url}")
        yaml_lines.append("        algorithm: RS256")
        yaml_lines.append("        rsa_public_key: |")
        
        # Indent the PEM public key by 10 spaces
        for line in pem.strip().splitlines():
            yaml_lines.append("          " + line)
            
    return "\n".join(yaml_lines)

def update_kong_yaml(consumers_yaml):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    kong_yaml_path = os.path.abspath(os.path.join(script_dir, "../config/kong.yaml"))
    
    if not os.path.exists(kong_yaml_path):
        print(f"Error: kong.yaml not found at {kong_yaml_path}. Please run transform.py first.")
        return None
        
    try:
        with open(kong_yaml_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Strip existing consumers section if present
        if "consumers:" in content:
            content = content.split("consumers:")[0]
            
        # Append the new consumers block
        updated_content = content.rstrip() + "\n\n" + consumers_yaml + "\n"
        
        with open(kong_yaml_path, "w", encoding="utf-8") as f:
            f.write(updated_content)
            
        print(f"Successfully updated {kong_yaml_path} with declarative consumers and credentials!")
        return updated_content
    except Exception as e:
        print(f"Error updating kong.yaml: {e}")
        return None

def reload_kong_dbless(yaml_content):
    url = f"{KONG_ADMIN_URL}/config"
    print(f"Attempting DB-less reload on Kong Admin API at {url}...")
    
    req = urllib.request.Request(
        url,
        data=yaml_content.encode('utf-8'),
        headers={"Content-Type": "application/yaml"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            print("Successfully reloaded Kong Gateway configuration (DB-less mode)!")
            return True
    except urllib.error.HTTPError as e:
        print(f"DB-less reload unsupported or failed: HTTP {e.code} - {e.reason}")
        try:
            print(f"Response body: {e.read().decode('utf-8')}")
        except Exception:
            pass
        return False
    except Exception as e:
        print(f"DB-less reload failed: {e}")
        return False

def configure_kong_db_mode(realm, pem):
    normalized_realm = realm.lower().replace("_", "-")
    consumer_name = f"keycloak-consumer-{normalized_realm}"
    issuer_url = f"{KEYCLOAK_URL}/realms/{realm}"
    
    print(f"Configuring Kong Gateway in DB mode for consumer '{consumer_name}'...")
    
    # 1. Create consumer
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
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print(f"Consumer '{consumer_name}' already exists.")
        else:
            print(f"HTTP Error creating consumer '{consumer_name}': {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"General error creating consumer: {e}")

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
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print(f"Consumer '{consumer_name}' already belongs to ACL group 'partners'.")
        else:
            print(f"HTTP Error adding consumer '{consumer_name}' to ACL group 'partners': {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"General error adding consumer to ACL: {e}")

    # 3. Register Keycloak Public Certificate in Kong JWT credentials list
    try:
        with urllib.request.urlopen(f"{KONG_ADMIN_URL}/consumers/{consumer_name}/jwt") as response:
            existing = json.loads(response.read().decode('utf-8'))
            for cred in existing.get("data", []):
                del_req = urllib.request.Request(
                    f"{KONG_ADMIN_URL}/consumers/{consumer_name}/jwt/{cred['id']}",
                    method="DELETE"
                )
                urllib.request.urlopen(del_req)
        print(f"Cleaned up old JWT credentials in Kong for '{consumer_name}'.")
    except Exception:
        pass

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
    except urllib.error.HTTPError as e:
        print(f"Error registering OIDC certificate in Kong: {e}")
        print(f"Response body: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"General error registering OIDC certificate: {e}")

def configure_test_partner_db_mode():
    print("Configuring test-partner in DB mode...")
    consumer_name = "test-partner"
    
    # 1. Create consumer
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
        pass

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
        pass

    # 3. Register HS256 credential
    try:
        with urllib.request.urlopen(f"{KONG_ADMIN_URL}/consumers/{consumer_name}/jwt") as response:
            existing = json.loads(response.read().decode('utf-8'))
            for cred in existing.get("data", []):
                del_req = urllib.request.Request(
                    f"{KONG_ADMIN_URL}/consumers/{consumer_name}/jwt/{cred['id']}",
                    method="DELETE"
                )
                urllib.request.urlopen(del_req)
    except Exception:
        pass

    jwt_data = json.dumps({
        "key": "test-iss",
        "algorithm": "HS256",
        "secret": "secret_partage_poc_nsia"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        f"{KONG_ADMIN_URL}/consumers/{consumer_name}/jwt",
        data=jwt_data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req)
        print(f"Test partner HS256 credential registered.")
    except Exception as e:
        print(f"Error registering HS256 secret: {e}")

if __name__ == "__main__":
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
    
    # Fetch all keys first
    realms_keys = {}
    for r in realms_to_process:
        print(f"\n--- Fetching certificate for Realm: {r} ---")
        pem = fetch_realm_pem(r)
        if pem:
            realms_keys[r] = pem
            
    if not realms_keys:
        print("No public keys could be fetched. Aborting Kong configuration.")
        sys.exit(1)
        
    # Generate the declarative consumers block
    consumers_yaml = generate_consumers_yaml(realms_keys)
    
    # Update local kong.yaml (used for GitOps and DB-less configuration)
    yaml_content = update_kong_yaml(consumers_yaml)
    
    if yaml_content:
        # Try DB-less reload first via POST /config
        success = reload_kong_dbless(yaml_content)
        
        # If DB-less reload fails/not supported, fallback to configuring Kong in DB mode
        if not success:
            print("\nFalling back to Kong Admin API DB mode configuration...")
            configure_test_partner_db_mode()
            for r, pem in realms_keys.items():
                configure_kong_db_mode(r, pem)
    else:
        print("Could not update kong.yaml file. Falling back to DB mode direct setup...")
        configure_test_partner_db_mode()
        for r, pem in realms_keys.items():
            configure_kong_db_mode(r, pem)
