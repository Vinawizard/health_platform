import os
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)

database = client.iot_health_db

# Collections
users_collection = database.get_collection("users")
institutions_collection = database.get_collection("institutions")
devices_collection = database.get_collection("devices")
consents_collection = database.get_collection("consents")
sensor_collection = database.get_collection("sensor_readings")
chain_events_collection = database.get_collection("chain_events")
zk_proofs_collection = database.get_collection("zk_proofs")

async def init_db():
    try:
        # Create indexes for unique fields and fast lookups
        await users_collection.create_index("email", unique=True)
        await devices_collection.create_index("device_pubkey", unique=True)
        await sensor_collection.create_index("timestamp")
        await sensor_collection.create_index("patient_id")
        print("Successfully connected to MongoDB and created indexes.")
    except Exception as e:
        print(f"Warning: Could not connect to MongoDB. The server will still start, but API calls will fail until MongoDB is running. Error: {e}")
