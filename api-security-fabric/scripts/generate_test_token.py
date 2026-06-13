import base64
import hmac
import hashlib
import json
import time
import sys

def base64url_encode(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

# Secret and key configured in Kong
SECRET = "secret_partage_poc_nsia"
ISS = "test-iss"

def generate_token(expired=False):
    header = {"alg": "HS256", "typ": "JWT"}
    
    # Custom claims mapping to our Multi-Tenant DB design (Loi 29-2019 / BOLA prevention)
    payload = {
        "iss": ISS,
        "sub": "conseiller-123",
        "bank_id": "bci",
        "agency_id": "brazzaville-centre",
        "roles": ["partners"],
        "exp": int(time.time()) - 3600 if expired else int(time.time()) + 3600
    }

    # Encode header and payload to Base64URL
    header_encoded = base64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_encoded = base64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))

    # Calculate Signature
    message = f"{header_encoded}.{payload_encoded}".encode('utf-8')
    signature = base64url_encode(hmac.new(SECRET.encode('utf-8'), message, hashlib.sha256).digest())

    return f"{header_encoded}.{payload_encoded}.{signature}"

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "expired":
        token = generate_token(expired=True)
        print("Generated Expired Token (should fail with 401):")
    else:
        token = generate_token(expired=False)
        print("Generated Valid Token (should succeed/forward to backend):")
    
    print(token)
    
    # Save the last generated token to a file for easy curl usage
    token_file = "/Users/precieuxntsala/Documents/Christ LANDZI/PFE_NSIA_IAM/api-security-fabric/token.txt"
    with open(token_file, "w") as f:
        f.write(token)
    print(f"\nToken saved to: {token_file}")
