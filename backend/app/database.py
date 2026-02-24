"""
Database layer — switches between MongoDB and local JSON based on STORAGE_MODE env var.
Set STORAGE_MODE=json for local testing, or leave as default for MongoDB.
"""
import os
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

STORAGE_MODE = os.getenv("STORAGE_MODE", "json").lower()  # default to json for easy testing
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

# MongoDB setup (only used if STORAGE_MODE=mongo)
if STORAGE_MODE == "mongo":
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
    database = client.iot_health_db
    sensor_collection = database.get_collection("sensor_readings")
    chain_events_collection = database.get_collection("chain_events")
else:
    client = None
    database = None
    sensor_collection = None
    chain_events_collection = None


async def init_db():
    """Initialize database — create indexes for MongoDB, create data dir for JSON."""
    if STORAGE_MODE == "mongo":
        try:
            await sensor_collection.create_index("timestamp")
            print("✅ Connected to MongoDB and created indexes.")
        except Exception as e:
            print(f"⚠️  MongoDB not available: {e}")
    else:
        from . import json_store
        json_store._ensure_dir()
        print("✅ Using local JSON storage in backend/data/")
