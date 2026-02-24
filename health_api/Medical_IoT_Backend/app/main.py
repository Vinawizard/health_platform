from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routes.auth import router as auth_router

app = FastAPI(
    title="Secure Medical IoT Platform",
    description="Whoop-like platform with Blockchain anchoring & ZKP",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_db()

# Include Routers
from .routes.devices import router as devices_router
from .routes.sensors import router as sensors_router
from .routes.consents import router as consents_router

app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(devices_router, prefix="/devices", tags=["Devices Provisioning"])
app.include_router(sensors_router, tags=["IoT Ingestion"])
app.include_router(consents_router, prefix="/consents", tags=["Access Control"])

from .routes.patient_data import router as patient_data_router
app.include_router(patient_data_router, prefix="/patients", tags=["Patient Data App"])

from .routes.zkp import router as zkp_router
app.include_router(zkp_router, prefix="/zkp", tags=["Zero-Knowledge Proofs"])

@app.get("/")
async def root():
    return {"message": "Secure Medical IoT API is running"}
