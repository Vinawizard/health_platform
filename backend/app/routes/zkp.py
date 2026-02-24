"""
ZKP Routes — proof generation and verification endpoints for doctors and insurance companies.

Endpoints:
  GET  /proofs/latest              — Latest ZKP claims for most recent reading
  GET  /proofs/health-certificate  — Combined health score proof
  POST /proofs/verify-claim        — Insurance claim verification
  GET  /proofs/compliance-report   — Monitoring compliance over time
  GET  /proofs/all                 — All generated proofs
  GET  /proofs/verify/{proof_hash} — Verify a specific proof
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Any
import requests
from pydantic import BaseModel

from ..database import STORAGE_MODE
from ..zkp_engine import (
    vital_range_check,
    health_certificate,
    insurance_claim_proof,
    monitoring_compliance,
    CLAIM_TYPES,
    THRESHOLDS,
)

router = APIRouter()


# ---- Helpers ----

async def _get_latest():
    if STORAGE_MODE == "json":
        from ..json_store import get_latest_reading
        return get_latest_reading()
    else:
        from ..database import sensor_collection
        return await sensor_collection.find_one({}, sort=[("timestamp", -1)])


async def _get_history(limit=50):
    if STORAGE_MODE == "json":
        from ..json_store import get_history
        return get_history(limit)
    else:
        from ..database import sensor_collection
        cursor = sensor_collection.find({}).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)


async def _get_latest_proofs():
    if STORAGE_MODE == "json":
        from ..json_store import get_latest_proofs
        return get_latest_proofs()
    return []


async def _get_all_proofs():
    if STORAGE_MODE == "json":
        from ..json_store import get_all_proofs
        return get_all_proofs()
    return []


async def _get_proofs_for_hash(reading_hash: str):
    if STORAGE_MODE == "json":
        from ..json_store import get_proofs_for_reading
        return get_proofs_for_reading(reading_hash)
    return []


# ---- Routes ----

@router.get("/latest")
async def get_latest_proofs():
    """
    Get all ZKP proof claims for the most recent sensor reading.
    Doctor/Insurance sees: status per vital + health grade — NO raw values.
    """
    proofs = await _get_latest_proofs()
    if not proofs:
        raise HTTPException(status_code=404, detail="No proofs found. Send sensor data first via POST /sensor-data")
    return {
        "message": "ZKP claims for latest reading (raw values hidden)",
        "proof_count": len(proofs),
        "proofs": proofs,
    }


@router.get("/health-certificate")
async def get_health_certificate():
    """
    Get the combined health certificate proof.
    Insurance sees: grade (A/B/C/F) + score (e.g. 4/4) — NO raw vitals.
    """
    latest = await _get_latest()
    if not latest:
        raise HTTPException(status_code=404, detail="No sensor data found")

    reading_hash = latest.get("hash", "")
    cert = health_certificate(latest, reading_hash)

    return {
        "message": "Health Certificate — zero-knowledge proof (raw values hidden)",
        "certificate": cert,
    }


@router.post("/verify-claim")
async def verify_insurance_claim(
    claim_type: str = Query(..., description=f"Claim type: {list(CLAIM_TYPES.keys())}"),
    reading_hash: Optional[str] = Query(None, description="Specific reading hash (uses latest if not provided)"),
):
    """
    Insurance claim verification.
    Prove a health event happened (e.g. HYPOXIA, FEVER) without revealing raw values.
    Returns: verified YES/NO + Cardano tx link as evidence.
    """
    if claim_type not in CLAIM_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid claim type. Must be one of: {list(CLAIM_TYPES.keys())}"
        )

    # Find the reading
    if reading_hash:
        history = await _get_history(200)
        reading = next((r for r in history if r.get("hash") == reading_hash), None)
        if not reading:
            raise HTTPException(status_code=404, detail="Reading not found for given hash")
    else:
        reading = await _get_latest()
        if not reading:
            raise HTTPException(status_code=404, detail="No sensor data found")
        reading_hash = reading.get("hash", "")

    proof = insurance_claim_proof(
        reading, claim_type, reading_hash, reading.get("cardano_tx_id")
    )

    return {
        "message": f"Insurance claim verification — {claim_type}",
        "result": proof,
    }


@router.get("/compliance-report")
async def get_compliance_report(
    vital: str = Query("spo2_percent", description=f"Vital to check: {list(THRESHOLDS.keys())}"),
    readings_count: int = Query(50, description="Number of readings to check (default: last 50)"),
):
    """
    Monitoring compliance report over a period.
    Doctor/Insurance sees: "96% of readings were in safe range" — NO individual values.
    """
    if vital not in THRESHOLDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid vital. Must be one of: {list(THRESHOLDS.keys())}"
        )

    history = await _get_history(readings_count)
    if not history:
        raise HTTPException(status_code=404, detail="No reading history found")

    report = monitoring_compliance(history, vital)

    return {
        "message": f"Compliance report for {THRESHOLDS[vital]['label']} — zero-knowledge (individual values hidden)",
        "report": report,
    }


@router.get("/all")
async def get_all_proofs():
    """Get all ZKP proofs ever generated."""
    proofs = await _get_all_proofs()
    return {
        "total": len(proofs),
        "proofs": proofs,
    }


class ZKPVerifyRequest(BaseModel):
    circuit: str
    proof: dict
    publicSignals: List[str]


@router.post("/verify-zkp")
async def verify_real_zkp(req: ZKPVerifyRequest):
    """
    Verify a real Groth16 ZKP by passing it to the ZK Server.
    """
    try:
        r = requests.post(f"http://127.0.0.1:9000/zk/verify/{req.circuit}", json={
            "proof": req.proof,
            "publicSignals": req.publicSignals
        }, timeout=5)
        if r.status_code == 200:
            return r.json()
        raise HTTPException(status_code=400, detail=r.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ZK Server Error: {str(e)}")


@router.get("/verify/{proof_hash}")
async def verify_proof(proof_hash: str):
    """
    Verify a specific proof by its hash.
    Anyone with the proof_hash can check it's authentic.
    """
    all_proofs = await _get_all_proofs()
    proof = next((p for p in all_proofs if p.get("proof_hash") == proof_hash), None)

    if not proof:
        raise HTTPException(status_code=404, detail="Proof not found")

    return {
        "message": "Proof found and verified",
        "proof": proof,
        "reading_hash": proof.get("reading_hash"),
    }


@router.get("/available-claims")
async def get_available_claims():
    """List all available claim types and vital thresholds."""
    return {
        "claim_types": {k: {
            "vital": v["vital"],
            "condition": f"{v['condition']} {v['threshold']}",
            "description": f"{THRESHOLDS[v['vital']]['label']} {v['condition']} {v['threshold']}{THRESHOLDS[v['vital']]['unit']}",
        } for k, v in CLAIM_TYPES.items()},
        "vitals": {k: {
            "label": v["label"],
            "normal_range": f"{v['normal'][0]}–{v['normal'][1]} {v['unit']}",
        } for k, v in THRESHOLDS.items()},
    }
