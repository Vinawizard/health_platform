from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime
import json
from bson.objectid import ObjectId

from ..database import consents_collection, sensor_collection
from ..auth import require_role
from ..crypto_utils import GLOBAL_PMK
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64

router = APIRouter()

def decrypt_payload(ciphertext_b64: str, nonce_b64: str, encrypted_dek_b64: str) -> dict:
    """Helper to decrypt the envelope for doctors who have RAW access."""
    try:
        # 1. Decrypt DEK using PMK
        combined_dek = base64.b64decode(encrypted_dek_b64)
        dek_nonce = combined_dek[:12]
        encrypted_dek_bytes = combined_dek[12:]
        
        aesgcm_pmk = AESGCM(GLOBAL_PMK)
        dek = aesgcm_pmk.decrypt(dek_nonce, encrypted_dek_bytes, None)
        
        # 2. Decrypt Payload using DEK
        aesgcm_dek = AESGCM(dek)
        ciphertext = base64.b64decode(ciphertext_b64)
        nonce = base64.b64decode(nonce_b64)
        
        plaintext = aesgcm_dek.decrypt(nonce, ciphertext, None)
        return json.loads(plaintext.decode("utf-8"))
    except Exception as e:
        print(f"Decryption error: {e}")
        return {"error": "Failed to decrypt payload"}

@router.get("/{patient_id}/latest")
async def get_latest_patient_data(
    patient_id: str,
    current_user: dict = Depends(require_role(["DOCTOR", "INSTITUTION"]))
):
    """
    Fetch the latest reading for a patient.
    Checks consent scopes in real-time.
    """
    # 1. Check active consent
    now = datetime.utcnow()
    query = {
        "grantee_id": str(current_user["_id"]),
        "patient_id": patient_id,
        "status": "GRANTED",
        "expires_at": {"$gt": now},
        "revoked_at": None
    }
    consent = await consents_collection.find_one(query)
    
    if not consent:
        raise HTTPException(status_code=403, detail="Active consent required to access patient data")
        
    scopes = consent.get("scope", [])
    
    # 2. Fetch the latest encrypted reading
    latest_reading = await sensor_collection.find_one(
        {"patient_id": patient_id}, 
        sort=[("timestamp", -1)]
    )
    
    if not latest_reading:
        raise HTTPException(status_code=404, detail="No readings found for patient")
        
    response = {
        "timestamp": latest_reading["timestamp"],
        "device_id": latest_reading["device_id"],
        "blockchain_hash": latest_reading["hash"],
        "scopes_used": scopes
    }
    
    # 3. Apply Scopes
    if "RAW" in scopes:
        # Decrypt the full payload
        raw_data = decrypt_payload(
            latest_reading["ciphertext"], 
            latest_reading["nonce"], 
            latest_reading["encrypted_dek"]
        )
        response["data"] = raw_data
        
    elif "AGG" in scopes:
        # If they only have agg, we'd normally query an aggregated collection
        # Here we just mock returning a safe aggregate
        response["data"] = {"average_hr": "hidden in raw, mocked agg", "status": "agg_only"}
        
    elif "ZK_ONLY" in scopes:
        # Return only the verified claims if ZK circuit was run
        response["data"] = {"claims": "Detailed vitals hidden. Verified safe ranges."}
        
    return response
