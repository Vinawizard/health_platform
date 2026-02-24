from fastapi import APIRouter, HTTPException, status
import random
from typing import Dict, Any

from ..database import sensor_collection, zk_proofs_collection

router = APIRouter()

# In a real ZKP system using Circom/SnarkJS:
# The device or a secure enclave generates a zero-knowledge proof proving that
# e.g., SpO2 > 95 without revealing the exact value.
# The backend verifies this using snarkjs.groth16.verify().
# For this MVP Python backend, we simulate the verification of such a proof.

def verify_snark_proof_mock(proof: Dict, public_signals: list) -> bool:
    """
    Mock SnarkJS verification.
    """
    # Simulate a cryptographic check
    if not proof or not public_signals:
        return False
    return True

@router.post("/verify-claim", status_code=status.HTTP_200_OK)
async def verify_zk_claim(patient_id: str, claim_type: str, proof_payload: Dict[str, Any]):
    """
    Endpoint for verifying a ZK proof submitted by the patient's device 
    or the patient's mobile app, and logging it to the database for doctors 
    with ZK_ONLY access.
    """
    
    proof = proof_payload.get("proof")
    public_signals = proof_payload.get("public_signals") # e.g., ["1"] for true
    
    is_valid = verify_snark_proof_mock(proof, public_signals)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Zero-Knowledge Proof")
        
    # Get the latest reading to tie the proof to a specific hash commitment
    # Normally the reading's hash would be part of the public signals to commit the statement
    # to the exact data packet on the blockchain.
    latest_reading = await sensor_collection.find_one(
        {"patient_id": patient_id}, 
        sort=[("timestamp", -1)]
    )
    
    reading_hash = latest_reading["hash"] if latest_reading else "no_reading_found"
    
    # Store the verified claim
    verified_claim = {
        "patient_id": patient_id,
        "reading_hash": reading_hash,
        "claim_type": claim_type, # e.g., "SPO2_NORMAL", "HR_NORMAL"
        "is_verified": True,
        "public_signals": public_signals
    }
    
    result = await zk_proofs_collection.insert_one(verified_claim)
    
    return {
        "message": f"Claim {claim_type} synthetically verified via ZKP", 
        "claim_id": str(result.inserted_id)
    }
