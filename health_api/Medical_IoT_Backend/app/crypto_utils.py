import os
import json
import base64
from typing import Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from ecdsa import VerifyingKey, NIST256p, BadSignatureError
import hashlib

# For MVP, we'll imagine a global Patient Master Key (PMK) 
# In a true prod system, each patient would have their own PMK managed via a KMS.
GLOBAL_PMK = hashlib.sha256(b"mvp-patient-master-key-seed").digest()

def generate_dek() -> bytes:
    """Generate a random 256-bit Data Encryption Key"""
    return AESGCM.generate_key(bit_length=256)

def encrypt_payload(payload_dict: dict, dek: bytes) -> Tuple[str, str, str]:
    """
    Encrypts a JSON dict Payload using AES-256-GCM.
    Returns base64 encoded strings: (ciphertext, nonce, dummy_tag_included_in_ciphertext)
    Note: cryptography's AESGCM appends the 16-byte authentication tag to the ciphertext.
    """
    aesgcm = AESGCM(dek)
    nonce = os.urandom(12)
    plaintext = json.dumps(payload_dict).encode("utf-8")
    
    # Encrypt and authenticate
    ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext, None)
    
    return (
        base64.b64encode(ciphertext_with_tag).decode("utf-8"),
        base64.b64encode(nonce).decode("utf-8")
    )

def encrypt_dek(dek: bytes, pmk: bytes) -> str:
    """
    Encrypt the DEK using the Patient Master Key (PMK) via AES Key Wrap or simple GCM.
    For simplicity here, we use AESGCM with the PMK.
    """
    aesgcm = AESGCM(pmk)
    nonce = os.urandom(12)
    # Encrypt the raw DEK
    encrypted_dek = aesgcm.encrypt(nonce, dek, None)
    
    # Combine nonce and ciphertext for storage, separated by a colon
    combined = nonce + encrypted_dek
    return base64.b64encode(combined).decode("utf-8")

def verify_device_signature(pubkey_hex: str, payload_dict: dict, signature_hex: str) -> bool:
    """
    Verifies the ECDSA signature of the payload using the device's public key.
    """
    try:
        vk = VerifyingKey.from_string(bytes.fromhex(pubkey_hex), curve=NIST256p)
        # Reconstruct canonical payload string for verification
        message = json.dumps(payload_dict, separators=(',', ':'), sort_keys=True).encode("utf-8")
        signature_bytes = bytes.fromhex(signature_hex)
        return vk.verify(signature_bytes, message, hashfunc=hashlib.sha256)
    except (BadSignatureError, ValueError):
        return False

def hash_encrypted_bundle(patient_id: str, device_id: str, ts: str, ciphertext: str, nonce: str) -> str:
    """
    Compute a SHA-256 hash of the fully encrypted envelope to serve as an anchor.
    """
    material = f"{patient_id}|{device_id}|{ts}|{ciphertext}|{nonce}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()
