"""
Encryption utilities — AES-256-GCM envelope encryption + SHA-256 hashing.
Simplified from health_api — no ECDSA device auth for now.
"""
import os
import json
import base64
import hashlib
from typing import Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Patient Master Key — in production this comes from a KMS/Vault
# For MVP we derive from a seed
GLOBAL_PMK = hashlib.sha256(b"mvp-patient-master-key-seed").digest()


def generate_dek() -> bytes:
    """Generate a random 256-bit Data Encryption Key."""
    return AESGCM.generate_key(bit_length=256)


def encrypt_payload(payload_dict: dict, dek: bytes) -> Tuple[str, str]:
    """
    Encrypt a JSON payload using AES-256-GCM.
    Returns base64 encoded (ciphertext, nonce).
    """
    aesgcm = AESGCM(dek)
    nonce = os.urandom(12)
    plaintext = json.dumps(payload_dict, default=str).encode("utf-8")
    ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext, None)

    return (
        base64.b64encode(ciphertext_with_tag).decode("utf-8"),
        base64.b64encode(nonce).decode("utf-8")
    )


def encrypt_dek(dek: bytes, pmk: bytes = GLOBAL_PMK) -> str:
    """Encrypt the DEK using the Patient Master Key."""
    aesgcm = AESGCM(pmk)
    nonce = os.urandom(12)
    encrypted_dek = aesgcm.encrypt(nonce, dek, None)
    combined = nonce + encrypted_dek
    return base64.b64encode(combined).decode("utf-8")


def decrypt_dek(encrypted_dek_b64: str, pmk: bytes = GLOBAL_PMK) -> bytes:
    """Decrypt the DEK using the Patient Master Key."""
    combined = base64.b64decode(encrypted_dek_b64)
    nonce = combined[:12]
    encrypted_dek_bytes = combined[12:]
    aesgcm = AESGCM(pmk)
    return aesgcm.decrypt(nonce, encrypted_dek_bytes, None)


def decrypt_payload(ciphertext_b64: str, nonce_b64: str, encrypted_dek_b64: str) -> dict:
    """Decrypt the full envelope — DEK first, then payload."""
    dek = decrypt_dek(encrypted_dek_b64)
    aesgcm = AESGCM(dek)
    ciphertext = base64.b64decode(ciphertext_b64)
    nonce = base64.b64decode(nonce_b64)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext.decode("utf-8"))


def hash_reading(timestamp: str, ciphertext: str, nonce: str) -> str:
    """SHA-256 hash of the encrypted bundle — this gets anchored on Cardano."""
    material = f"{timestamp}|{ciphertext}|{nonce}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()
