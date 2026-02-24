"""
Cardano Transaction Queue — serializes blockchain submissions.

Problem: Cardano's UTxO model means you can only submit one tx at a time.
The next tx must use the *output* of the previous tx as its input.
If two txs try to spend the same UTxO, one fails with error 400.

Solution: This module provides a singleton asyncio queue that processes
transactions one at a time, waiting for each to confirm before the next.
"""

import asyncio
import time
from typing import Optional

# Time to wait between transactions (seconds).
# Cardano preprod block time is ~20s; we wait 25s for safety.
TX_COOLDOWN = 25

_queue: Optional[asyncio.Queue] = None
_worker_task: Optional[asyncio.Task] = None
_last_tx_time: float = 0


def _get_queue() -> asyncio.Queue:
    global _queue
    if _queue is None:
        _queue = asyncio.Queue()
    return _queue


async def _worker():
    """Process transactions one at a time from the queue."""
    global _last_tx_time
    from .cardano_anchoring import anchor_hash_on_cardano
    from .database import STORAGE_MODE

    q = _get_queue()

    while True:
        try:
            job = await q.get()
            record_hash = job["record_hash"]
            timestamp_str = job["timestamp_str"]
            record_id = job.get("record_id")

            # Wait for cooldown since last tx
            elapsed = time.time() - _last_tx_time
            if elapsed < TX_COOLDOWN and _last_tx_time > 0:
                wait = TX_COOLDOWN - elapsed
                print(f"⏳ Tx queue: waiting {wait:.0f}s for UTxO cooldown...")
                await asyncio.sleep(wait)

            print(f"📤 Tx queue: anchoring {record_hash[:20]}...")
            tx_hash = await anchor_hash_on_cardano(record_hash, timestamp_str)

            if tx_hash:
                _last_tx_time = time.time()

                # Update the stored record
                if STORAGE_MODE == "json":
                    from .json_store import update_reading_by_hash, save_chain_event
                    update_reading_by_hash(record_hash, {
                        "anchored": True,
                        "cardano_tx_id": tx_hash,
                    })
                    save_chain_event({
                        "record_hash": record_hash,
                        "tx_hash": tx_hash,
                        "timestamp": timestamp_str,
                    })
                else:
                    from .database import sensor_collection
                    await sensor_collection.update_one(
                        {"_id": record_id},
                        {"$set": {"anchored": True, "cardano_tx_id": tx_hash}},
                    )

                print(f"✅ Tx queue: anchored! Tx: {tx_hash[:32]}...")
            else:
                print(f"❌ Tx queue: anchoring failed for {record_hash[:20]}")
                # Re-queue failed jobs with a longer delay
                _last_tx_time = time.time()
                await asyncio.sleep(5)
                await q.put(job)
                print(f"🔄 Tx queue: re-queued {record_hash[:20]} (will retry)")

            q.task_done()

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"❌ Tx queue worker error: {e}")
            q.task_done()


def ensure_worker_running():
    """Start the queue worker if not already running."""
    global _worker_task
    if _worker_task is None or _worker_task.done():
        loop = asyncio.get_event_loop()
        _worker_task = loop.create_task(_worker())
        print("🚀 Tx queue worker started")


async def enqueue_anchoring(record_hash: str, timestamp_str: str, record_id=None):
    """Add a transaction to the queue. Returns immediately."""
    ensure_worker_running()
    q = _get_queue()
    await q.put({
        "record_hash": record_hash,
        "timestamp_str": timestamp_str,
        "record_id": record_id,
    })
    print(f"📥 Tx queue: added {record_hash[:20]}... (queue size: {q.qsize()})")


async def enqueue_pending():
    """Re-queue all pending readings that haven't been anchored."""
    from .database import STORAGE_MODE
    if STORAGE_MODE == "json":
        from .json_store import get_pending_readings
        pending = get_pending_readings()
    else:
        from .database import sensor_collection
        cursor = sensor_collection.find({"anchored": False, "hash": {"$exists": True}})
        pending = await cursor.to_list(length=500)

    count = len(pending)
    if count == 0:
        print("✅ No pending readings to anchor")
        return 0

    print(f"📥 Tx queue: re-queuing {count} pending readings...")
    for r in pending:
        await enqueue_anchoring(
            r["hash"],
            str(r.get("timestamp", "")),
            r.get("_id"),
        )
    return count


def get_queue_status():
    """Get current queue status."""
    q = _get_queue()
    return {
        "queue_size": q.qsize(),
        "worker_running": _worker_task is not None and not _worker_task.done(),
        "last_tx_time": _last_tx_time,
        "cooldown_seconds": TX_COOLDOWN,
    }
