"""
Test the full pipeline: send mock sensor data → verify it was encrypted, hashed, and stored.
"""
import requests
import json
import random
import math
from datetime import datetime, timezone

API_URL = "http://localhost:8000"


def generate_mock_sensor_data():
    """Simulate what the ESP32 sends."""
    ecg_wave = []
    for i in range(100):
        val = 500 + random.randint(-10, 10)
        if 48 <= i <= 52:
            val += int(200 * math.sin((i - 48) * math.pi / 4))
        ecg_wave.append(val)

    return {
        "temperature_f": round(random.uniform(97.0, 101.5), 1),
        "pulse_bpm": random.randint(60, 130),
        "spo2_percent": round(random.uniform(95.0, 100.0), 1),
        "air_quality_ppm": round(random.uniform(200.0, 700.0), 1),
        "ecg_wave": ecg_wave,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    }


def test_full_pipeline():
    print("=" * 60)
    print("  HEALTH PLATFORM — FULL PIPELINE TEST")
    print("=" * 60)

    # 1. Check API is running
    print("\n1. Checking API is running...")
    try:
        r = requests.get(f"{API_URL}/")
        print(f"   ✅ API is up: {r.json()['message']}")
    except requests.exceptions.ConnectionError:
        print("   ❌ API not running! Start it with:")
        print("      cd backend && python -m uvicorn app.main:app --reload --port 8000")
        return

    # 2. Send mock sensor data (simulating ESP32)
    print("\n2. Sending mock sensor data (simulating ESP32)...")
    payload = generate_mock_sensor_data()
    print(f"   Temp: {payload['temperature_f']}°F | BPM: {payload['pulse_bpm']} | SpO2: {payload['spo2_percent']}%")

    r = requests.post(f"{API_URL}/sensor-data", json=payload)
    response = r.json()
    print(f"   Status: {r.status_code}")
    print(f"   Response: {json.dumps(response, indent=2)}")

    if "hash" in response:
        print(f"   ✅ SHA-256 Hash: {response['hash']}")
    else:
        print(f"   ⚠️  No hash in response (check server logs)")

    # 3. Fetch latest data
    print("\n3. Fetching latest data...")
    r = requests.get(f"{API_URL}/latest-data")
    latest = r.json()
    print(f"   Temp: {latest.get('temperature_f')}°F")
    print(f"   BPM: {latest.get('pulse_bpm')}")
    print(f"   SpO2: {latest.get('spo2_percent')}%")
    print(f"   Hash: {latest.get('hash')}")
    print(f"   Anchored on Cardano: {latest.get('anchored')}")
    if latest.get("cardano_tx_id"):
        print(f"   ✅ Cardano Tx: https://preprod.cardanoscan.io/transaction/{latest['cardano_tx_id']}")

    # 4. Verify the hash
    if response.get("hash"):
        print(f"\n4. Verifying record hash...")
        r = requests.get(f"{API_URL}/verify/{response['hash']}")
        verify = r.json()
        print(f"   Anchored: {verify.get('anchored')}")
        if verify.get("verify_url"):
            print(f"   ✅ View on Cardanoscan: {verify['verify_url']}")

    # 5. Check local JSON storage
    print("\n5. Checking local JSON storage...")
    try:
        import os
        json_path = os.path.join(os.path.dirname(__file__), "data", "sensor_readings.json")
        if os.path.exists(json_path):
            with open(json_path, "r") as f:
                data = json.load(f)
            print(f"   ✅ {len(data)} readings stored in data/sensor_readings.json")
            last = data[-1]
            if last.get("ciphertext"):
                print(f"   ✅ Data is encrypted (ciphertext: {last['ciphertext'][:50]}...)")
            if last.get("hash"):
                print(f"   ✅ Hash computed: {last['hash']}")
        else:
            print(f"   ⚠️  No JSON file yet (using MongoDB?)")
    except Exception as e:
        print(f"   ⚠️  {e}")

    print("\n" + "=" * 60)
    print("  TEST COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    test_full_pipeline()
