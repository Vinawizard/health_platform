import os
import json
from datetime import datetime
from app.zkp_engine import generate_all_proofs

# Re-generates real ZKPs for old readings that only have SHA-256 fake proofs
DATA_FILE = "data/sensor_readings.json"

def reproof_old_readings():
    if not os.path.exists(DATA_FILE):
        print("No data file found.")
        return

    with open(DATA_FILE, "r") as f:
        readings = json.load(f)

    updated = 0
    for reading in readings:
        if "zkp_payloads" in reading:
            has_real_zkp = any(p.get("is_real_zkp") for p in reading["zkp_payloads"])
            if not has_real_zkp:
                print(f"Reproofing reading {reading['hash'][:8]}...")
                reading["zkp_payloads"] = generate_all_proofs(
                    reading, 
                    reading["hash"], 
                    reading.get("cardano_tx_id")
                )
                updated += 1

    if updated > 0:
        with open(DATA_FILE, "w") as f:
            json.dump(readings, f, indent=4)
        print(f"✅ Successfully generated real ZKPs for {updated} old readings.")
    else:
        print("All readings already have real ZKPs or no readings need updating.")

if __name__ == "__main__":
    reproof_old_readings()
