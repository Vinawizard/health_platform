from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from datetime import datetime
import json

from ..schemas import IngestionPayload
from ..database import devices_collection, sensor_collection
from ..crypto_utils import (
    verify_device_signature, 
    generate_dek, 
    encrypt_payload, 
    encrypt_dek,
    hash_encrypted_bundle,
    GLOBAL_PMK
)
from ..cardano_anchoring import anchor_hash_on_cardano

router = APIRouter()

@router.post("/sensor-data", status_code=status.HTTP_201_CREATED)
async def create_sensor_data(data: IngestionPayload, background_tasks: BackgroundTasks):
    # 1. Look up the device to get its public key and checking its patient
    device = await devices_collection.find_one({"_id": data.device_id})
    if not device:
        # Fallback to search by device_pubkey if it was populated via id
        device = await devices_collection.find_one({"device_pubkey": data.device_id})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
            
    device_pubkey = device["device_pubkey"]
    patient_id = device["patient_id"]
    
    # 2. Verify the cryptographic signature
    is_valid = verify_device_signature(device_pubkey, data.payload, data.signature)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid cryptographic signature")
        
    # 3. Secure the Data via Envelope Encryption
    dek = generate_dek()
    ciphertext, nonce = encrypt_payload(data.payload, dek)
    encrypted_dek = encrypt_dek(dek, GLOBAL_PMK)
    
    # 4. Compute Hash for Blockchain Anchoring
    timestamp_str = data.timestamp.isoformat()
    record_hash = hash_encrypted_bundle(patient_id, str(device["_id"]), timestamp_str, ciphertext, nonce)
    
    # 5. Store Encrypted reading in MongoDB
    new_record = {
        "patient_id": patient_id,
        "device_id": str(device["_id"]),
        "timestamp": data.timestamp,
        "ciphertext": ciphertext,
        "nonce": nonce,
        "encrypted_dek": encrypted_dek,
        "schema_version": 1,
        "hash": record_hash,
        "anchored": False,
        "cardano_tx_id": None
    }
    
    result = await sensor_collection.insert_one(new_record)
    
    # 6. Queue the Cardano metadata submission to run in the background
    # We do this asynchronously so the IoT device doesn't block waiting for blockchain consensus
    background_tasks.add_task(anchor_hash_on_cardano, record_hash, patient_id, timestamp_str, "INGESTION")
    
    return {"message": "Secure payload ingested. Blockchain anchoring queued.", "id": str(result.inserted_id), "hash": record_hash}
