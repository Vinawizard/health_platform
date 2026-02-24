from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from typing import List

from ..schemas import ConsentCreate, ConsentInDB, Scope
from ..database import consents_collection, users_collection
from ..auth import require_role

router = APIRouter()

@router.post("/request", status_code=status.HTTP_201_CREATED)
async def request_access(
    patient_email: str,
    scopes: List[Scope],
    duration_days: int = 7,
    current_user: dict = Depends(require_role(["DOCTOR", "INSTITUTION_ADMIN"]))
):
    """
    Doctors request access to a patient's data. 
    In MVP this auto-creates a pending request (or directly grants it for demo purposes).
    """
    patient = await users_collection.find_one({"email": patient_email, "role": "PATIENT"})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # In a real app we'd have a 'requests' collection and the patient approves it later.
    # For this demo API, we'll imagine the patient creates the consent grant directly,
    # or the doctor requests it and it goes into a pending state.
    # Let's create a direct consent for the MVP to keep the flow fast.
    
    grantee_type = "DOCTOR" if current_user["role"] == "DOCTOR" else "INSTITUTION"
    
    consent = {
        "patient_id": str(patient["_id"]),
        "grantee_id": str(current_user["_id"]),
        "grantee_type": grantee_type,
        "scope": scopes,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=duration_days),
        "revoked_at": None,
        "status": "GRANTED" # Auto-granted for MVP demo purposes
    }
    
    result = await consents_collection.insert_one(consent)
    return {"message": "Access granted", "consent_id": str(result.inserted_id)}

@router.get("/my-consents")
async def get_my_consents(current_user: dict = Depends(require_role(["PATIENT"]))):
    """
    Patients can view who has access to their data.
    """
    cursor = consents_collection.find({"patient_id": str(current_user["_id"])})
    consents = await cursor.to_list(length=100)
    
    # Format for JSON serialization
    for c in consents:
        c["_id"] = str(c["_id"])
        
    return consents

@router.post("/{consent_id}/revoke")
async def revoke_consent(consent_id: str, current_user: dict = Depends(require_role(["PATIENT"]))):
    from bson.objectid import ObjectId
    try:
        obj_id = ObjectId(consent_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid consent ID")
        
    consent = await consents_collection.find_one({"_id": obj_id})
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
        
    if consent["patient_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not your consent to revoke")
        
    await consents_collection.update_one(
        {"_id": obj_id},
        {"$set": {"revoked_at": datetime.utcnow(), "status": "REVOKED"}}
    )
    
    return {"message": "Consent revoked successfully"}
