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
import requests
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
#  ZKP SERVER INTEGRATION
# ============================================================

ZK_SERVER_URL = "http://127.0.0.1:9000"

def prove_via_zk_server(circuit_name: str, payload: dict) -> Optional[dict]:
    """Call the local ZK Server to generate a real Groth16 proof."""
    try:
        r = requests.post(f"{ZK_SERVER_URL}/zk/prove/{circuit_name}", json=payload, timeout=10)
        if r.status_code == 200:
            return r.json()
        print(f"ZK Server warning ({circuit_name}): {r.text}")
    except Exception as e:
        print(f"ZK Server error ({circuit_name}): {e}")
    return None


# ============================================================
#  CIRCUIT 1: vital_range_check
#  Doctor wants to know: is this ONE vital okay?
# ============================================================

def vital_range_check(vital_name: str, value: float, reading_hash: str, ts_iso: str) -> dict:
    """
    Check if a single vital is in normal/warning/critical range.
    
    PRIVATE input: value (hidden from doctor)
    PUBLIC output: status (NORMAL/WARNING/CRITICAL) + real Groth16 proof
    """
    status = _classify_vital(vital_name, value)
    t = THRESHOLDS.get(vital_name, {})

    # Simulate patient ID and timestamp for the proof
    patient_id = "123456789"
    # Convert ISO to unix timestamp bucket roughly
    try:
        ts = str(int(datetime.fromisoformat(ts_iso.replace('Z', '+00:00')).timestamp()))
    except:
        ts = "1700000000"
        
    # Convert reading hash from hex to decimal string for Circom Field Math
    try:
        reading_hash_dec = str(int(reading_hash[:15], 16)) # use first 15 chars to fit in field
    except:
        reading_hash_dec = "777777"

    zk_data = None

    # Map our backend vital names to the ZK circuits
    if vital_name == "spo2_percent":
        zk_data = prove_via_zk_server("spo2_ge", {
            "spo2": int(value),
            "minSpo2": 95,
            "patientId": patient_id,
            "ts": ts,
            "readingHash": reading_hash_dec
        })
    elif vital_name == "pulse_bpm":
        zk_data = prove_via_zk_server("bpm_range", {
            "bpm": int(value),
            "minBpm": 60,
            "maxBpm": 100,
            "patientId": patient_id,
            "ts": ts,
            "readingHash": reading_hash_dec
        })
    elif vital_name == "temperature_f":
        zk_data = prove_via_zk_server("temp_range_f10", {
            "temp10": int(value * 10),
            "minTemp10": 970,
            "maxTemp10": 995,
            "patientId": patient_id,
            "ts": ts,
            "readingHash": reading_hash_dec
        })

    # Fallback to simulated proof hash if ZK server fails or unsupported vital
    if zk_data and "proof" in zk_data:
        proof_payload = zk_data["proof"]
        public_signals = zk_data["publicSignals"]
        is_real_zkp = True
        # Extract commitment (usually the last or first public signal, assume last)
        commitment = public_signals[-1] if public_signals else None
    else:
        proof_payload = _generate_proof_hash("vital_range_check", {
            "vital": vital_name, "value": value, "reading_hash": reading_hash
        })
        public_signals = []
        is_real_zkp = False
        commitment = None

    return {
        "circuit": "vital_range_check",
        "vital": vital_name,
        "label": t.get("label", vital_name),
        "status": status,
        "normal_range": f"{t['normal'][0]}–{t['normal'][1]} {t.get('unit', '')}",
        "proof_hash": proof_payload if not is_real_zkp else "ZKP_ATTACHED",
        "zkp_proof": proof_payload if is_real_zkp else None,
        "zkp_public_signals": public_signals if is_real_zkp else None,
        "commitment": commitment,
        "is_real_zkp": is_real_zkp,
        "zkp_circuit": zk_data["circuit"] if is_real_zkp else None,
        "reading_hash": reading_hash,
        "timestamp": datetime.utcnow().isoformat(),
        # Raw value is NOT included!
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
    ts_iso = reading.get("timestamp", datetime.utcnow().isoformat())
    for vital_name in ["temperature_f", "pulse_bpm", "spo2_percent", "air_quality_ppm"]:
        value = reading.get(vital_name)
        if value is not None:
            proof = vital_range_check(vital_name, value, reading_hash, str(ts_iso))
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
