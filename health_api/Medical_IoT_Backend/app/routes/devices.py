from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime

from ..schemas import DeviceProvision
from ..database import devices_collection
from ..auth import require_role

router = APIRouter()

@router.post("/provision", status_code=status.HTTP_201_CREATED)
async def provision_device(
    device: DeviceProvision,
    current_user: dict = Depends(require_role(["PATIENT", "DOCTOR", "INSTITUTION_ADMIN"]))
):
    """
    Register a new IoT device's public key against a patient ID.
    """
    existing_device = await devices_collection.find_one({"device_pubkey": device.device_pubkey})
    if existing_device:
        raise HTTPException(status_code=400, detail="Device public key already provisioned")
        
    new_device = {
        "device_pubkey": device.device_pubkey,
        "patient_id": device.patient_id,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    
    try:
        result = await devices_collection.insert_one(new_device)
        return {"id": str(result.inserted_id), "message": "Device provisioned successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to provision device")
