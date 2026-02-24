"""
Sensor routes — the core ingestion pipeline.
Combines health_monitor's smart 2-second merge with health_api's encryption + hashing + Cardano anchoring.
"""
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from typing import List
from datetime import datetime, timedelta

from ..models import PartialSensorData, SensorData, StoredReading, SpO2Data
from ..database import STORAGE_MODE, sensor_collection
from ..crypto_utils import generate_dek, encrypt_payload, encrypt_dek, hash_reading, decrypt_payload
from ..cardano_anchoring import anchor_hash_on_cardano
from ..zkp_engine import generate_all_proofs
from ..tx_queue import enqueue_anchoring, enqueue_pending, get_queue_status

router = APIRouter()


# ---- Helper: storage abstraction ----

async def _get_latest():
    if STORAGE_MODE == "json":
        from ..json_store import get_latest_reading
        return get_latest_reading()
    else:
        return await sensor_collection.find_one({}, sort=[("timestamp", -1)])


async def _save_new(record: dict) -> str:
    if STORAGE_MODE == "json":
        from ..json_store import save_reading
        return save_reading(record)
    else:
        result = await sensor_collection.insert_one(record)
        return str(result.inserted_id)


async def _update_latest(update_fields: dict, record_id=None):
    if STORAGE_MODE == "json":
        from ..json_store import update_latest_reading
        update_latest_reading(update_fields)
    else:
        await sensor_collection.update_one(
            {"_id": record_id},
            {"$set": update_fields}
        )


async def _get_history(limit: int = 50):
    if STORAGE_MODE == "json":
        from ..json_store import get_history
        return get_history(limit)
    else:
        cursor = sensor_collection.find({}).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(length=limit)

# Note: old _anchor_and_update is replaced by tx_queue module
# which serializes Cardano transactions to prevent UTxO contention


# ---- Routes ----

@router.post("/sensor-data", status_code=status.HTTP_201_CREATED)
async def create_sensor_data(data: PartialSensorData, background_tasks: BackgroundTasks):
    """
    Receive sensor data from ESP32/ESP8266.
    Pipeline: merge within 2s → encrypt → hash → store → anchor on Cardano.
    """
    try:
        # 1. Get only non-None fields
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}

        # 2. Check if we should merge with the latest record (within 2 seconds)
        latest_record = await _get_latest()
        now = datetime.utcnow()

        if latest_record:
            latest_ts = latest_record.get("timestamp")
            if isinstance(latest_ts, str):
                try:
                    latest_ts = datetime.fromisoformat(latest_ts.replace("Z", "+00:00")).replace(tzinfo=None)
                except:
                    latest_ts = now

            if (now - latest_ts) < timedelta(seconds=2):
                # MERGE into existing record
                await _update_latest(update_dict, latest_record.get("_id"))
                return {
                    "message": "Data merged into existing reading",
                    "id": str(latest_record.get("_id", "merged"))
                }

        # 3. Create a new record — carry over previous values for missing fields
        new_record = {}
        if latest_record:
            skip_keys = {"_id", "ciphertext", "nonce", "encrypted_dek", "hash", "anchored", "cardano_tx_id"}
            new_record = {k: v for k, v in latest_record.items() if k not in skip_keys}

        new_record.update(update_dict)
        new_record["timestamp"] = now

        # 4. Encrypt the sensor payload
        sensor_fields = {
            "temperature_f": new_record.get("temperature_f"),
            "pulse_bpm": new_record.get("pulse_bpm"),
            "spo2_percent": new_record.get("spo2_percent"),
            "air_quality_ppm": new_record.get("air_quality_ppm"),
            "ecg_wave": new_record.get("ecg_wave"),
            "timestamp": now.isoformat(),
        }

        dek = generate_dek()
        ciphertext, nonce = encrypt_payload(sensor_fields, dek)
        enc_dek = encrypt_dek(dek)

        # 5. Hash the encrypted bundle (this goes on Cardano)
        record_hash = hash_reading(now.isoformat(), ciphertext, nonce)

        # 6. Build the full stored record
        new_record["ciphertext"] = ciphertext
        new_record["nonce"] = nonce
        new_record["encrypted_dek"] = enc_dek
        new_record["hash"] = record_hash
        new_record["anchored"] = False
        new_record["cardano_tx_id"] = None

        # 7. Save
        record_id = await _save_new(new_record)

        # 8. Generate ZKP proofs for this reading
        proofs = generate_all_proofs(new_record, record_hash)
        proof_count = len(proofs)
        if STORAGE_MODE == "json":
            from ..json_store import save_proofs
            save_proofs(proofs)

        # 9. Queue Cardano anchoring via serial tx queue (prevents UTxO contention)
        await enqueue_anchoring(record_hash, now.isoformat(), record_id)

        return {
            "message": f"Sensor data saved. {proof_count} ZKP proofs generated. Blockchain anchoring queued.",
            "id": record_id,
            "hash": record_hash,
            "proofs_generated": proof_count,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/sensor-data/spo2", status_code=status.HTTP_201_CREATED)
async def create_spo2_data(data: SpO2Data):
    """
    Dedicated endpoint for the SpO2 board (MAX30102).
    Always merges into the latest record since it's a separate Arduino board
    sending blood oxygen data independently.
    """
    try:
        latest_record = await _get_latest()
        now = datetime.utcnow()

        if latest_record:
            # Always merge SpO2 into the latest record
            record_id = latest_record.get("_id")
            await _update_latest({
                "spo2_percent": data.spo2_percent,
                "timestamp": now,
            }, record_id)
            return {
                "message": f"SpO2 data merged into latest reading (spo2={data.spo2_percent}%)",
                "id": str(record_id),
                "device": "MAX30102",
            }
        else:
            # No existing record — create one with just SpO2
            new_record = {
                "spo2_percent": data.spo2_percent,
                "timestamp": now,
                "anchored": False,
                "cardano_tx_id": None,
            }
            record_id = await _save_new(new_record)
            return {
                "message": f"SpO2 reading created (spo2={data.spo2_percent}%)",
                "id": record_id,
                "device": "MAX30102",
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/latest-data")
async def get_latest_data():
    """Get the most recent sensor reading."""
    latest = await _get_latest()
    if not latest:
        raise HTTPException(status_code=404, detail="No sensor data found")

    # Return both raw fields and blockchain info
    return {
        "temperature_f": latest.get("temperature_f"),
        "pulse_bpm": latest.get("pulse_bpm"),
        "spo2_percent": latest.get("spo2_percent"),
        "air_quality_ppm": latest.get("air_quality_ppm"),
        "ecg_wave": latest.get("ecg_wave"),
        "timestamp": latest.get("timestamp"),
        "hash": latest.get("hash"),
        "anchored": latest.get("anchored", False),
        "cardano_tx_id": latest.get("cardano_tx_id"),
    }


@router.get("/history")
async def get_history():
    """Get the last 50 sensor readings."""
    records = await _get_history(50)
    result = []
    for r in records:
        result.append({
            "temperature_f": r.get("temperature_f"),
            "pulse_bpm": r.get("pulse_bpm"),
            "spo2_percent": r.get("spo2_percent"),
            "air_quality_ppm": r.get("air_quality_ppm"),
            "timestamp": r.get("timestamp"),
            "hash": r.get("hash"),
            "anchored": r.get("anchored", False),
            "cardano_tx_id": r.get("cardano_tx_id"),
        })
    return result


@router.get("/verify/{record_hash}")
async def verify_record(record_hash: str):
    """Check if a record hash has been anchored on Cardano."""
    records = await _get_history(200)
    for r in records:
        if r.get("hash") == record_hash:
            return {
                "hash": record_hash,
                "anchored": r.get("anchored", False),
                "cardano_tx_id": r.get("cardano_tx_id"),
                "verify_url": f"https://preprod.cardanoscan.io/transaction/{r.get('cardano_tx_id')}" if r.get("cardano_tx_id") else None,
            }
    raise HTTPException(status_code=404, detail="Record hash not found")


@router.post("/retry-pending")
async def retry_pending():
    """Re-queue all pending (unanchored) readings for Cardano anchoring."""
    count = await enqueue_pending()
    status = get_queue_status()
    return {
        "message": f"Re-queued {count} pending readings for anchoring",
        "pending_count": count,
        "queue": status,
    }


@router.get("/tx-queue-status")
async def tx_queue_status():
    """Get the current transaction queue status."""
    return get_queue_status()
