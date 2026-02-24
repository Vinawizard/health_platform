"""
Secure Medical IoT Health Platform — Unified FastAPI Backend
Combines health_monitor (sensors) + health_api (encryption + Cardano anchoring) + ZKP proofs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routes.sensors import router as sensor_router
from .routes.zkp import router as zkp_router

app = FastAPI(
    title="Health Platform",
    description="IoT Health Monitoring with AES-256-GCM Encryption + Cardano Blockchain Anchoring + Zero-Knowledge Proofs",
    version="2.0.0"
)

# CORS — allow ESP32/frontend/everything during development
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


app.include_router(sensor_router, tags=["Sensors + Blockchain"])
app.include_router(zkp_router, prefix="/proofs", tags=["Zero-Knowledge Proofs"])


@app.get("/")
async def root():
    return {
        "message": "Health Platform API v2.0 — Sensors + Encryption + Cardano + ZKP",
        "sensor_endpoints": {
            "POST /sensor-data": "Send sensor readings → encrypt → hash → anchor on Cardano → generate ZKP proofs",
            "GET /latest-data": "Get latest reading",
            "GET /history": "Get last 50 readings",
            "GET /verify/{hash}": "Check if a reading was anchored on Cardano",
        },
        "zkp_endpoints": {
            "GET /proofs/latest": "Latest ZKP claims (no raw data)",
            "GET /proofs/health-certificate": "Combined health grade",
            "POST /proofs/verify-claim": "Insurance claim verification",
            "GET /proofs/compliance-report": "Monitoring compliance %",
            "GET /proofs/all": "All generated proofs",
            "GET /proofs/verify/{hash}": "Verify a specific proof",
            "GET /proofs/available-claims": "List all claim types + thresholds",
        },
    }

