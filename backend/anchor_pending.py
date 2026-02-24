"""
Anchor Pending Readings — re-tries all unanchored readings on Cardano.

Each Cardano transaction needs ~20-30 seconds to confirm so the
UTxO is available for the next transaction. This script processes
pending readings ONE AT A TIME with a 30-second delay.

Usage:
  python anchor_pending.py
"""

import asyncio
import json
import os
import sys
import time

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.json_store import get_pending_readings, update_reading_by_hash, save_chain_event
from app.cardano_anchoring import anchor_hash_on_cardano

DELAY_BETWEEN_TX = 30  # seconds — Cardano block time is ~20s


async def main():
    pending = get_pending_readings()
    total = len(pending)

    if total == 0:
        print("✅ All readings are already anchored on-chain!")
        return

    print(f"{'='*60}")
    print(f"  Anchor Pending Readings")
    print(f"  {total} readings to anchor on Cardano Preprod")
    print(f"  Delay: {DELAY_BETWEEN_TX}s between transactions")
    print(f"  Estimated time: ~{total * DELAY_BETWEEN_TX // 60} minutes")
    print(f"{'='*60}")
    print()

    success = 0
    failed = 0

    for i, reading in enumerate(pending, 1):
        record_hash = reading.get("hash", "")
        timestamp = reading.get("timestamp", "")
        temp = reading.get("temperature_f", "?")
        bpm = reading.get("pulse_bpm", "?")

        print(f"  [{i}/{total}] Anchoring hash: {record_hash[:24]}...")
        print(f"           Temp={temp}  BPM={bpm}  ts={timestamp}")

        try:
            tx_hash = await anchor_hash_on_cardano(record_hash, str(timestamp))

            if tx_hash:
                # Update the reading in storage
                update_reading_by_hash(record_hash, {
                    "anchored": True,
                    "cardano_tx_id": tx_hash,
                })
                save_chain_event({
                    "record_hash": record_hash,
                    "tx_hash": tx_hash,
                    "timestamp": str(timestamp),
                })
                print(f"           ✅ Tx: {tx_hash}")
                print(f"           🔗 https://preprod.cardanoscan.io/transaction/{tx_hash}")
                success += 1
            else:
                print(f"           ❌ Anchoring returned None (check Blockfrost key / wallet balance)")
                failed += 1
        except Exception as e:
            print(f"           ❌ Error: {e}")
            failed += 1

        # Wait before next transaction (UTxO needs to confirm)
        if i < total:
            print(f"           Waiting {DELAY_BETWEEN_TX}s for block confirmation...")
            time.sleep(DELAY_BETWEEN_TX)

        print()

    print(f"{'='*60}")
    print(f"  COMPLETE: {success} anchored, {failed} failed, {total} total")
    remaining = len(get_pending_readings())
    print(f"  Still pending: {remaining}")
    print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
