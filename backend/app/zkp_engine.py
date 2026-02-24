"""
ZKP Engine — Generates zero-knowledge proofs for medical sensor data.

4 Circuits:
  1. vital_range_check     — Single vital status (for doctors)
  2. health_certificate    — Combined health grade (for insurance)
  3. insurance_claim_proof — Prove a health event happened (for claims)
  4. monitoring_compliance — History-based compliance % (for monitoring)

Each circuit takes PRIVATE inputs (raw vitals) and outputs
PUBLIC claims (normal/warning/critical) + a proof_hash.
The proof_hash is anchored on Cardano — nobody can fake it.
"""
import hashlib
import json
from datetime import datetime
from typing import List, Dict, Optional


# ============================================================
#  MEDICAL THRESHOLDS (based on standard clinical ranges)
# ============================================================

THRESHOLDS = {
    "temperature_f": {
        "normal":   (97.0, 99.5),
        "warning":  [(95.0, 97.0), (99.5, 100.4)],
        "critical": {"low": 95.0, "high": 100.4},
        "unit": "°F",
        "label": "Body Temperature",
    },
    "pulse_bpm": {
        "normal":   (60, 100),
        "warning":  [(40, 60), (100, 150)],
        "critical": {"low": 40, "high": 150},
        "unit": "BPM",
        "label": "Heart Rate",
    },
    "spo2_percent": {
        "normal":   (95, 100),
        "warning":  [(90, 95)],
        "critical": {"low": 90, "high": None},
        "unit": "%",
        "label": "Blood Oxygen (SpO2)",
    },
    "air_quality_ppm": {
        "normal":   (0, 400),
        "warning":  [(400, 1000)],
        "critical": {"low": None, "high": 1000},
        "unit": "PPM",
        "label": "Air Quality",
    },
}

# Insurance claim event types
CLAIM_TYPES = {
    "HYPOXIA":      {"vital": "spo2_percent",      "condition": "below", "threshold": 90},
    "MILD_HYPOXIA": {"vital": "spo2_percent",      "condition": "below", "threshold": 95},
    "FEVER":        {"vital": "temperature_f",      "condition": "above", "threshold": 100.4},
    "TACHYCARDIA":  {"vital": "pulse_bpm",          "condition": "above", "threshold": 100},
    "BRADYCARDIA":  {"vital": "pulse_bpm",          "condition": "below", "threshold": 60},
    "AIR_HAZARD":   {"vital": "air_quality_ppm",    "condition": "above", "threshold": 1000},
}


# ============================================================
#  HELPER: Proof hash generation
# ============================================================

def _generate_proof_hash(circuit_name: str, inputs: dict) -> str:
    """
    SHA-256 hash binding the circuit name + inputs.
    This is the 'proof' — anchored on Cardano to make it tamper-proof.
    In production, this would be a real SNARK/STARK proof.
    """
    material = json.dumps({"circuit": circuit_name, **inputs}, sort_keys=True, default=str)
    return hashlib.sha256(material.encode()).hexdigest()


def _classify_vital(vital_name: str, value: float) -> str:
    """Classify a vital reading as NORMAL, WARNING, or CRITICAL."""
    t = THRESHOLDS.get(vital_name)
    if not t:
        return "UNKNOWN"

    low, high = t["normal"]
    if low <= value <= high:
        return "NORMAL"

    crit = t["critical"]
    if crit["low"] is not None and value < crit["low"]:
        return "CRITICAL"
    if crit["high"] is not None and value > crit["high"]:
        return "CRITICAL"

    return "WARNING"


# ============================================================
#  CIRCUIT 1: vital_range_check
#  Doctor wants to know: is this ONE vital okay?
# ============================================================

def vital_range_check(vital_name: str, value: float, reading_hash: str) -> dict:
    """
    Check if a single vital is in normal/warning/critical range.
    
    PRIVATE input: value (hidden from doctor)
    PUBLIC output: status (NORMAL/WARNING/CRITICAL) + proof_hash
    """
    status = _classify_vital(vital_name, value)
    t = THRESHOLDS.get(vital_name, {})

    proof_hash = _generate_proof_hash("vital_range_check", {
        "vital": vital_name,
        "value": value,
        "reading_hash": reading_hash,
    })

    return {
        "circuit": "vital_range_check",
        "vital": vital_name,
        "label": t.get("label", vital_name),
        "status": status,
        "normal_range": f"{t['normal'][0]}–{t['normal'][1]} {t.get('unit', '')}",
        "proof_hash": proof_hash,
        "reading_hash": reading_hash,
        "timestamp": datetime.utcnow().isoformat(),
        # Raw value is NOT included — that's the zero-knowledge part
    }


# ============================================================
#  CIRCUIT 2: health_certificate
#  Insurance wants: "Is this person healthy?"
# ============================================================

def health_certificate(reading: dict, reading_hash: str) -> dict:
    """
    Combined health check across all vitals.
    
    PRIVATE inputs: all 4 vital values (hidden)
    PUBLIC output: score (0-4), grade (A/B/C/F), proof_hash
    """
    checks = {}
    for vital_name in ["temperature_f", "pulse_bpm", "spo2_percent", "air_quality_ppm"]:
        value = reading.get(vital_name)
        if value is not None:
            status = _classify_vital(vital_name, value)
            checks[vital_name] = status
        else:
            checks[vital_name] = "NO_DATA"

    normal_count = sum(1 for s in checks.values() if s == "NORMAL")
    total = sum(1 for s in checks.values() if s != "NO_DATA")

    if total == 0:
        grade = "N/A"
    elif normal_count == total:
        grade = "A"
    elif normal_count >= total - 1:
        grade = "B"
    elif normal_count >= total / 2:
        grade = "C"
    else:
        grade = "F"

    proof_hash = _generate_proof_hash("health_certificate", {
        "values": {k: reading.get(k) for k in ["temperature_f", "pulse_bpm", "spo2_percent", "air_quality_ppm"]},
        "reading_hash": reading_hash,
    })

    # Build per-vital summary (status only, no raw values)
    vital_summary = {}
    for vital_name, status in checks.items():
        t = THRESHOLDS.get(vital_name, {})
        vital_summary[vital_name] = {
            "label": t.get("label", vital_name),
            "status": status,
            # NO raw value here
        }

    return {
        "circuit": "health_certificate",
        "score": f"{normal_count}/{total}",
        "grade": grade,
        "all_normal": normal_count == total,
        "vitals": vital_summary,
        "proof_hash": proof_hash,
        "reading_hash": reading_hash,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ============================================================
#  CIRCUIT 3: insurance_claim_proof
#  Insurance wants: "Did this health event really happen?"
# ============================================================

def insurance_claim_proof(reading: dict, claim_type: str, reading_hash: str, cardano_tx_id: Optional[str] = None) -> dict:
    """
    Verify that a specific health event occurred.
    
    PRIVATE input: actual vital value (hidden)
    PUBLIC output: claim verified YES/NO + proof_hash + Cardano tx link
    """
    claim_def = CLAIM_TYPES.get(claim_type)
    if not claim_def:
        return {
            "circuit": "insurance_claim_proof",
            "claim_type": claim_type,
            "error": f"Unknown claim type. Valid types: {list(CLAIM_TYPES.keys())}",
        }

    vital_name = claim_def["vital"]
    value = reading.get(vital_name)

    if value is None:
        verified = False
    elif claim_def["condition"] == "below":
        verified = value < claim_def["threshold"]
    else:
        verified = value > claim_def["threshold"]

    proof_hash = _generate_proof_hash("insurance_claim_proof", {
        "claim_type": claim_type,
        "value": value,
        "threshold": claim_def["threshold"],
        "reading_hash": reading_hash,
    })

    t = THRESHOLDS.get(vital_name, {})
    return {
        "circuit": "insurance_claim_proof",
        "claim_type": claim_type,
        "claim_description": f"{t.get('label', vital_name)} {'below' if claim_def['condition'] == 'below' else 'above'} {claim_def['threshold']}{t.get('unit', '')}",
        "verified": verified,
        "proof_hash": proof_hash,
        "reading_hash": reading_hash,
        "cardano_tx_id": cardano_tx_id,
        "cardano_verify_url": f"https://preprod.cardanoscan.io/transaction/{cardano_tx_id}" if cardano_tx_id else None,
        "timestamp": datetime.utcnow().isoformat(),
        # Raw value is NOT included
    }


# ============================================================
#  CIRCUIT 4: monitoring_compliance
#  Doctor/Insurance: "Were vitals safe over a period?"
# ============================================================

def monitoring_compliance(readings: List[dict], vital_name: str) -> dict:
    """
    Check compliance over multiple readings.
    
    PRIVATE inputs: all historical vital values (hidden)
    PUBLIC output: compliance percentage + proof_hash
    """
    t = THRESHOLDS.get(vital_name)
    if not t:
        return {"error": f"Unknown vital: {vital_name}"}

    total = 0
    safe_count = 0
    warning_count = 0
    critical_count = 0

    for r in readings:
        value = r.get(vital_name)
        if value is None:
            continue
        total += 1
        status = _classify_vital(vital_name, value)
        if status == "NORMAL":
            safe_count += 1
        elif status == "WARNING":
            warning_count += 1
        else:
            critical_count += 1

    compliance = round((safe_count / total * 100), 1) if total > 0 else 0

    proof_hash = _generate_proof_hash("monitoring_compliance", {
        "vital": vital_name,
        "values": [r.get(vital_name) for r in readings if r.get(vital_name) is not None],
    })

    return {
        "circuit": "monitoring_compliance",
        "vital": vital_name,
        "label": t.get("label", vital_name),
        "total_readings": total,
        "safe_readings": safe_count,
        "warning_readings": warning_count,
        "critical_readings": critical_count,
        "compliance_percent": compliance,
        "status": "COMPLIANT" if compliance >= 90 else "NON_COMPLIANT",
        "proof_hash": proof_hash,
        "timestamp": datetime.utcnow().isoformat(),
        # Individual readings are NOT included
    }


# ============================================================
#  MASTER: Generate all proofs for a reading
# ============================================================

def generate_all_proofs(reading: dict, reading_hash: str, cardano_tx_id: Optional[str] = None) -> List[dict]:
    """
    Run ALL circuits on a single reading.
    Called automatically when sensor data is ingested.
    Returns a list of all proof objects.
    """
    proofs = []

    # Circuit 1: Individual vital checks
    for vital_name in ["temperature_f", "pulse_bpm", "spo2_percent", "air_quality_ppm"]:
        value = reading.get(vital_name)
        if value is not None:
            proof = vital_range_check(vital_name, value, reading_hash)
            proofs.append(proof)

    # Circuit 2: Combined health certificate
    cert = health_certificate(reading, reading_hash)
    proofs.append(cert)

    # Circuit 3: Auto-detect any insurance-claimable events
    for claim_type, claim_def in CLAIM_TYPES.items():
        value = reading.get(claim_def["vital"])
        if value is not None:
            if claim_def["condition"] == "below" and value < claim_def["threshold"]:
                proof = insurance_claim_proof(reading, claim_type, reading_hash, cardano_tx_id)
                proofs.append(proof)
            elif claim_def["condition"] == "above" and value > claim_def["threshold"]:
                proof = insurance_claim_proof(reading, claim_type, reading_hash, cardano_tx_id)
                proofs.append(proof)

    return proofs
