import requests
import json
import random
from datetime import datetime, timezone
import math

API_URL = "http://localhost:8000/sensor-data"

def generate_mock_data():
    ecg_wave = []
    for i in range(100):
        val = 500 + random.randint(-10, 10)
        if 48 <= i <= 52:
            val += 200 * math.sin((i - 48) * math.pi / 4)
        ecg_wave.append(int(val))

    return {
        "temperature_f": round(random.uniform(97.0, 101.5), 1),
        "pulse_bpm": random.randint(60, 130),
        "air_quality_ppm": round(random.uniform(200.0, 700.0), 1),
        "ecg_wave": ecg_wave,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    }

if __name__ == "__main__":
    payload = generate_mock_data()
    print("Testing Backend API with simulated data...")
    try:
        response = requests.post(API_URL, json=payload, headers={'Content-Type': 'application/json'})
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API. Is the server running on port 8000?")
