import requests
import json
import random
import time
from datetime import datetime

# Simulates the Arduino SpO2/BPM/Temp board
URL = "http://localhost:8000/sensor-data"

def simulate_reading():
    reading = {
        "temperature_f": round(random.uniform(97.5, 99.2), 1),
        "pulse_bpm": random.randint(65, 80),
        "spo2_percent": random.randint(96, 100),
        "air_quality_ppm": random.randint(350, 450),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    print("\n--- Sending Simulated Arduino Data ---")
    print(json.dumps(reading, indent=2))
    
    try:
        r = requests.post(URL, json=reading)
        if r.status_code == 200:
            print("\n✅ Data Accepted by Backend")
            print("Response:", json.dumps(r.json(), indent=2))
            print("\n👉 Now check the Doctor Dashboard or Backend terminal to watch ZKP generation and Cardano anchoring.")
        else:
            print(f"❌ Error {r.status_code}: {r.text}")
    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    simulate_reading()
