import base64
import hashlib
import os
import requests
import logging
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)

_encryption_key = None

def get_encryption_key():
    """
    Récupère la clé de chiffrement 256 bits (32 octets).
    Tente de la récupérer depuis Vault, puis via l'environnement, 
    et enfin dérive une clé à partir du SECRET_KEY en dernier recours.
    """
    global _encryption_key
    if _encryption_key is not None:
        return _encryption_key
    
    vault_addr = os.environ.get('VAULT_ADDR', 'http://localhost:8200')
    vault_token = os.environ.get('VAULT_TOKEN')
    
    if vault_addr and vault_token:
        try:
            # Récupération de la clé depuis le KV engine v1 ou v2 de Vault
            url = f"{vault_addr}/v1/secret/data/bancassurance"
            headers = {"X-Vault-Token": vault_token}
            response = requests.get(url, headers=headers, timeout=3)
            if response.status_code == 200:
                # KV v2 structure: data.data
                res_json = response.json()
                data = res_json.get('data', {})
                if 'data' in data:
                    data = data['data']
                
                key_hex = data.get('encryption_key')
                if key_hex:
                    _encryption_key = bytes.fromhex(key_hex)
                    logger.info("Clé de chiffrement récupérée avec succès depuis Vault.")
                    return _encryption_key
        except Exception as e:
            logger.warning(f"Impossible de joindre Vault pour récupérer la clé: {e}. Fallback en cours...")

    # Fallback 1: Variable d'environnement ENCRYPTION_KEY (hex)
    env_key = os.environ.get('ENCRYPTION_KEY')
    if env_key:
        try:
            _encryption_key = bytes.fromhex(env_key)
            if len(_encryption_key) == 32:
                logger.info("Clé de chiffrement récupérée depuis ENCRYPTION_KEY.")
                return _encryption_key
        except ValueError:
            pass

    # Fallback 2: Dérivation à partir de SECRET_KEY
    logger.warning("Utilisation de la dérivation SECRET_KEY pour le chiffrement (mode dégradation/développement).")
    _encryption_key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return _encryption_key


def encrypt_value(plaintext: str) -> str:
    """
    Chiffre une chaîne de caractères en AES-256-GCM.
    Retourne la chaîne chiffrée encodée en base64.
    """
    if not plaintext:
        return plaintext
    try:
        key = get_encryption_key()
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
        # Concaténation nonce (12) + tag + ciphertext (géré automatiquement par AESGCM)
        combined = nonce + ciphertext
        return base64.b64encode(combined).decode('utf-8')
    except Exception as e:
        logger.error(f"Erreur lors du chiffrement: {e}")
        raise ValidationError(f"Erreur de chiffrement de la donnée: {e}")


def decrypt_value(ciphertext_b64: str) -> str:
    """
    Déchiffre une chaîne encodée en base64 via AES-256-GCM.
    En cas d'échec de décodage/déchiffrement, retourne la chaîne originale.
    """
    if not ciphertext_b64:
        return ciphertext_b64
    try:
        combined = base64.b64decode(ciphertext_b64.encode('utf-8'))
        if len(combined) < 12:
            return ciphertext_b64
        nonce = combined[:12]
        ciphertext = combined[12:]
        key = get_encryption_key()
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')
    except Exception:
        # Si ce n'est pas chiffré ou si la clé a changé, on retourne la valeur telle quelle (sécurité de fallback)
        return ciphertext_b64


def hash_value(value: str) -> str:
    """
    Génère un hash SHA-256 salé pour créer des index aveugles (Blind Indexes) 
    permettant des recherches exactes sur des champs chiffrés.
    """
    if not value:
        return ''
    salt = settings.SECRET_KEY
    salted = f"{value}{salt}"
    return hashlib.sha256(salted.encode('utf-8')).hexdigest()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  CHAMPS DE MODÈLE CUSTOM POUR LE CHIFFREMENT TRANSPARENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class EncryptedCharField(models.CharField):
    """
    Champ de type CharField dont le contenu est automatiquement
    chiffré en base de données et déchiffré à la lecture.
    """
    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is not None and value != '':
            return encrypt_value(value)
        return value

    def from_db_value(self, value, expression, connection):
        if value is not None and value != '':
            return decrypt_value(value)
        return value

    def to_python(self, value):
        value = super().to_python(value)
        if value is not None and value != '':
            return decrypt_value(value)
        return value


class EncryptedTextField(models.TextField):
    """
    Champ de type TextField dont le contenu est automatiquement
    chiffré en base de données et déchiffré à la lecture.
    """
    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is not None and value != '':
            return encrypt_value(value)
        return value

    def from_db_value(self, value, expression, connection):
        if value is not None and value != '':
            return decrypt_value(value)
        return value

    def to_python(self, value):
        value = super().to_python(value)
        if value is not None and value != '':
            return decrypt_value(value)
        return value
