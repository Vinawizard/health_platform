"""
Unified data models for the Health Platform.
Combines sensor fields (from health_monitor) + encryption/blockchain fields.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class SpO2Data(BaseModel):
    """Data from the dedicated SpO2 board (MAX30102)."""
    spo2_percent: float = Field(..., description="Blood Oxygen Saturation in %")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)


class SensorData(BaseModel):
    """Full sensor reading — what gets stored after merge."""
    temperature_f: float = Field(..., description="Body Temperature in Fahrenheit")
    pulse_bpm: int = Field(..., description="Pulse Rate in BPM")
    spo2_percent: float = Field(..., description="Blood Oxygen Saturation in %")
    air_quality_ppm: float = Field(..., description="Air Quality in PPM")
    ecg_wave: List[int] = Field(..., description="Array of 100 ECG analog readings")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

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
    """Partial reading — ESP32 or ESP8266 may send only some fields."""
    temperature_f: Optional[float] = None
    pulse_bpm: Optional[int] = None
    spo2_percent: Optional[float] = None
    air_quality_ppm: Optional[float] = None
    ecg_wave: Optional[List[int]] = None
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)


class StoredReading(BaseModel):
    """What actually gets saved — sensor data + encryption + blockchain fields."""
    # Sensor fields (plaintext kept for local testing, encrypted in production)
    temperature_f: Optional[float] = None
    pulse_bpm: Optional[int] = None
    spo2_percent: Optional[float] = None
    air_quality_ppm: Optional[float] = None
    ecg_wave: Optional[List[int]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Encryption fields
    ciphertext: Optional[str] = None
    nonce: Optional[str] = None
    encrypted_dek: Optional[str] = None

    # Blockchain fields
    hash: Optional[str] = None
    anchored: bool = False
    cardano_tx_id: Optional[str] = None
