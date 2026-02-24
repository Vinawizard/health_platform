import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

async def test():
    load_dotenv('d:/fayas/backend/.env')
    uri = os.getenv('MONGODB_URI')
    print("Testing:", uri)
    client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    try:
        await client.admin.command('ping')
        print("SUCCESS")
    except Exception as e:
        print("ERROR:", e)

asyncio.run(test())
