from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Literal
from datetime import datetime

# Enums/Literals
Role = Literal["PATIENT", "DOCTOR", "INSTITUTION_ADMIN"]
Scope = Literal["RAW", "AGG", "ZK_ONLY"]

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    role: Role

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
    
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[Role] = None
    id: Optional[str] = None

# Device Schemas
class DeviceProvision(BaseModel):
    device_pubkey: str
    patient_id: str

class DeviceInDB(DeviceProvision):
    id: str = Field(alias="_id")
    status: str
    created_at: datetime

# Consent/Access Schemas
class ConsentCreate(BaseModel):
    grantee_id: str
    grantee_type: Literal["DOCTOR", "INSTITUTION"]
    scope: List[Scope]
    expires_at: datetime

class ConsentInDB(ConsentCreate):
    id: str = Field(alias="_id")
    patient_id: str
    created_at: datetime
    revoked_at: Optional[datetime] = None

# IoT Sensor Schemas
class IngestionPayload(BaseModel):
    device_id: str
    timestamp: datetime
    payload: dict  # the encrypted buffer or plaintext mock depending on phase
    signature: str # Ed25519 signature of the payload using device_pubkey
