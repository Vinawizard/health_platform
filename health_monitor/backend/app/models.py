from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SensorData(BaseModel):
    temperature_f: float = Field(..., description="Body Temperature in Fahrenheit")
    pulse_bpm: int = Field(..., description="Pulse Rate in BPM")
    spo2_percent: float = Field(..., description="Blood Oxygen Saturation in %")
    air_quality_ppm: float = Field(..., description="Air Quality in PPM")
    ecg_wave: List[int] = Field(..., description="Array of 100 ECG analog readings")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="ISO timestamp of the reading")

    model_config = {
        "json_schema_extra": {
            "example": {
                "temperature_f": 98.6,
                "pulse_bpm": 75,
                "spo2_percent": 98.0,
                "air_quality_ppm": 250.5,
                "ecg_wave": [500] * 100,
                "timestamp": "2026-02-21T12:00:00Z"
            }
        }
    }

class PartialSensorData(BaseModel):
    temperature_f: Optional[float] = Field(None, description="Body Temperature in Fahrenheit")
    pulse_bpm: Optional[int] = Field(None, description="Pulse Rate in BPM")
    spo2_percent: Optional[float] = Field(None, description="Blood Oxygen Saturation in %")
    air_quality_ppm: Optional[float] = Field(None, description="Air Quality in PPM")
    ecg_wave: Optional[List[int]] = Field(None, description="Array of 100 ECG analog readings")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="ISO timestamp of the reading")
