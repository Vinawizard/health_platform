import os
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)

database = client.iot_health_db

sensor_collection = database.get_collection("sensor_readings")
