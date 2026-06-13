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

def generate_token(bank_id="bci", agency_id="brazzaville-centre", expired=False):
    header = {"alg": "HS256", "typ": "JWT"}
    
    # Custom claims mapping to our Multi-Tenant DB design (Loi 29-2019 / BOLA prevention)
    payload = {
        "iss": ISS,
        "sub": f"conseiller-{bank_id}-123",
        "bank_id": bank_id.upper(),
        "agency_id": agency_id,
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
    import os
    
    # Default values
    bank_id = "bci"
    agency_id = "brazzaville-centre"
    expired = False
    
    # Parse CLI arguments
    args = sys.argv[1:]
    
    if "--help" in args or "-h" in args:
        print("Usage:")
        print("  python3 generate_test_token.py [bank_id] [agency_id] [expired/valid]")
        print("Examples:")
        print("  python3 generate_test_token.py ecobank Plateau")
        print("  python3 generate_test_token.py bgfi Brazzaville-Centre expired")
        sys.exit(0)
        
    if "expired" in args:
        expired = True
        args.remove("expired")
    elif "valid" in args:
        args.remove("valid")
        
    if len(args) > 0:
        bank_id = args[0]
    if len(args) > 1:
        agency_id = args[1]
        
    token = generate_token(bank_id=bank_id, agency_id=agency_id, expired=expired)
    
    if expired:
        print(f"Generated Expired Token for {bank_id.upper()} ({agency_id}) - (should fail with 401):")
    else:
        print(f"Generated Valid Token for {bank_id.upper()} ({agency_id}) - (should succeed/forward to backend):")
    
    print(token)
    
    # Save the last generated token to a file relative to the script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    token_file = os.path.abspath(os.path.join(script_dir, "../token.txt"))
    
    with open(token_file, "w") as f:
        f.write(token)
    print(f"\nToken saved to: {token_file}")

