from fastapi import APIRouter, HTTPException, status
from typing import List
from .models import SensorData, PartialSensorData
from .database import sensor_collection
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/sensor-data", status_code=status.HTTP_201_CREATED)
async def create_sensor_data(data: PartialSensorData):
    try:
        # Only take fields that were explicitly sent (not None)
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        
        # Find the very last record inserted
        latest_record = await sensor_collection.find_one({}, sort=[("timestamp", -1)])
        now = datetime.utcnow()
        
        # If there is a record and it was inserted less than 2 seconds ago, merge into it
        if latest_record and (now - latest_record.get("timestamp", now)) < timedelta(seconds=2):
            await sensor_collection.update_one(
                {"_id": latest_record["_id"]},
                {"$set": update_dict}
            )
            return {"message": "Data merged successfully", "id": str(latest_record["_id"])}
            
        else:
            # Create a brand new record, carrying over previous values for any missing fields to avoid nulls
            new_record = {}
            if latest_record:
                new_record = {k: v for k, v in latest_record.items() if k != "_id"}
            
            new_record.update(update_dict)
            new_record["timestamp"] = now
            
            # Validate it has all required fields using the full SensorData model 
            # (If it's the very first record and missing fields, this will naturally error out or we can provide defaults)
            try:
                full_data = SensorData(**new_record)
                result = await sensor_collection.insert_one(full_data.model_dump())
                return {"message": "New data saved successfully", "id": str(result.inserted_id)}
            except Exception as validation_error:
                # If we fail validation (e.g. first boot missing SpO2), just insert the partial as a starting point
                result = await sensor_collection.insert_one(new_record)
                return {"message": "Partial initial data saved", "id": str(result.inserted_id)}
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/latest-data", response_model=SensorData)
async def get_latest_data():
    latest_record = await sensor_collection.find_one({}, sort=[("timestamp", -1)])
    if not latest_record:
        raise HTTPException(status_code=404, detail="No sensor data found")
    
    return SensorData(**latest_record)

@router.get("/history", response_model=List[SensorData])
async def get_history():
    cursor = sensor_collection.find({}).sort("timestamp", -1).limit(50)
    history = await cursor.to_list(length=50)
    
    if not history:
        return []
        
    result = []
    for record in history:
        result.append(SensorData(**record))
        
    return result
