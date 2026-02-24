"""
Local JSON file storage — for testing without MongoDB.
Stores readings in backend/data/sensor_readings.json
"""
import os
import json
from datetime import datetime
from typing import Optional, List

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")


def _ensure_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _read_file(filename: str) -> list:
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return []
    with open(filepath, "r") as f:
        return json.load(f)


def _write_file(filename: str, data: list):
    _ensure_dir()
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ---- Sensor Readings ----

def save_reading(record: dict) -> str:
    """Append a reading to sensor_readings.json. Returns a fake ID."""
    records = _read_file("sensor_readings.json")
    record_id = f"local_{len(records) + 1}"
    record["_id"] = record_id
    records.append(record)
    _write_file("sensor_readings.json", records)
    return record_id


def get_latest_reading() -> Optional[dict]:
    """Return the most recent reading."""
    records = _read_file("sensor_readings.json")
    if not records:
        return None
    return records[-1]


def get_history(limit: int = 50) -> List[dict]:
    """Return the last N readings, newest first."""
    records = _read_file("sensor_readings.json")
    return list(reversed(records[-limit:]))


def update_latest_reading(update_fields: dict):
    """Update fields on the most recent reading (for 2-second merge)."""
    records = _read_file("sensor_readings.json")
    if records:
        records[-1].update(update_fields)
        _write_file("sensor_readings.json", records)


def update_reading_by_hash(record_hash: str, update_fields: dict) -> bool:
    """Update a specific reading by its hash. Returns True if found."""
    records = _read_file("sensor_readings.json")
    for r in records:
        if r.get("hash") == record_hash:
            r.update(update_fields)
            _write_file("sensor_readings.json", records)
            return True
    return False


def get_pending_readings() -> List[dict]:
    """Get all readings that haven't been anchored on-chain yet."""
    records = _read_file("sensor_readings.json")
    return [r for r in records if r.get("hash") and not r.get("anchored")]


# ---- Chain Events ----

def save_chain_event(event: dict) -> str:
    """Append a chain anchoring event."""
    events = _read_file("chain_events.json")
    event_id = f"evt_{len(events) + 1}"
    event["_id"] = event_id
    events.append(event)
    _write_file("chain_events.json", events)
    return event_id


# ---- ZKP Proofs ----

def save_proofs(proofs: list):
    """Append multiple ZKP proofs to zk_proofs.json."""
    existing = _read_file("zk_proofs.json")
    for p in proofs:
        p["_id"] = f"proof_{len(existing) + 1}"
        existing.append(p)
    _write_file("zk_proofs.json", existing)


def get_proofs_for_reading(reading_hash: str) -> List[dict]:
    """Get all proofs linked to a specific reading hash."""
    all_proofs = _read_file("zk_proofs.json")
    return [p for p in all_proofs if p.get("reading_hash") == reading_hash]


def get_latest_proofs() -> List[dict]:
    """Get proofs for the most recent reading."""
    latest = get_latest_reading()
    if not latest or not latest.get("hash"):
        return []
    return get_proofs_for_reading(latest["hash"])


def get_all_proofs() -> List[dict]:
    """Get all proofs."""
    return _read_file("zk_proofs.json")

