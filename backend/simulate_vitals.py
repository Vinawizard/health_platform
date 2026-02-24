"""
Sensor Simulation Script — Live Demo

Sends realistic sensor data through the backend API so you can watch
the dashboard update in real-time. Each scenario runs for a few readings,
then transitions to the next.

Scenarios:
  1. NORMAL        — All vitals healthy
  2. FEVER         — Temperature spikes to 102.5°F
  3. HYPOXIA       — SpO2 drops to 85%
  4. TACHYCARDIA   — Heart rate jumps to 135 BPM
  5. AIR HAZARD    — Air quality hits 1200 PPM
  6. MULTI-ALERT   — Multiple vitals critical at once
  7. RECOVERY      — All vitals return to normal

Usage:
  python simulate_vitals.py              # Full demo (all scenarios)
  python simulate_vitals.py --fast       # Faster (3s between readings)
  python simulate_vitals.py --scenario 2 # Run only scenario 2 (FEVER)
"""

import requests
import time
import random
import sys
import math

API = "http://localhost:8000/sensor-data"

# ── Scenario Definitions ──────────────────────────────────────────────

SCENARIOS = [
    {
        "name": "NORMAL — Healthy Patient",
        "readings": 4,
        "description": "All vitals within normal range. Dashboard should show green NORMAL badges everywhere.",
        "generate": lambda i: {
            "temperature_f": round(98.2 + random.uniform(-0.3, 0.5), 1),
            "pulse_bpm": random.randint(68, 78),
            "spo2_percent": round(97.0 + random.uniform(0, 2.5), 1),
            "air_quality_ppm": round(random.uniform(80, 200), 1),
            "ecg_wave": generate_ecg(72),
        },
    },
    {
        "name": "FEVER — High Temperature",
        "readings": 3,
        "description": "Temperature > 100.4°F triggers FEVER event. Watch the temperature card turn red and AlertBanner appear.",
        "generate": lambda i: {
            "temperature_f": round(101.8 + random.uniform(0, 1.2), 1),
            "pulse_bpm": random.randint(85, 95),
            "spo2_percent": round(96.0 + random.uniform(0, 2.0), 1),
            "air_quality_ppm": round(random.uniform(100, 250), 1),
            "ecg_wave": generate_ecg(90),
        },
    },
    {
        "name": "HYPOXIA — Low Blood Oxygen",
        "readings": 3,
        "description": "SpO2 < 90% triggers HYPOXIA event. The SpO2 card should show CRITICAL with breathing animation.",
        "generate": lambda i: {
            "temperature_f": round(98.6 + random.uniform(-0.2, 0.3), 1),
            "pulse_bpm": random.randint(90, 105),
            "spo2_percent": round(85.0 + random.uniform(0, 3.5), 1),
            "air_quality_ppm": round(random.uniform(150, 300), 1),
            "ecg_wave": generate_ecg(95),
        },
    },
    {
        "name": "TACHYCARDIA — Rapid Heart Rate",
        "readings": 3,
        "description": "Heart rate > 100 BPM triggers TACHYCARDIA. Watch the heart rate card pulse red.",
        "generate": lambda i: {
            "temperature_f": round(99.0 + random.uniform(-0.3, 0.5), 1),
            "pulse_bpm": random.randint(125, 145),
            "spo2_percent": round(95.5 + random.uniform(0, 2.5), 1),
            "air_quality_ppm": round(random.uniform(100, 200), 1),
            "ecg_wave": generate_ecg(135),
        },
    },
    {
        "name": "AIR HAZARD — Dangerous Air Quality",
        "readings": 3,
        "description": "Air quality > 1000 PPM triggers AIR_HAZARD. The air quality card turns red.",
        "generate": lambda i: {
            "temperature_f": round(98.4 + random.uniform(-0.3, 0.3), 1),
            "pulse_bpm": random.randint(70, 82),
            "spo2_percent": round(96.0 + random.uniform(0, 2.0), 1),
            "air_quality_ppm": round(1100 + random.uniform(0, 400), 1),
            "ecg_wave": generate_ecg(75),
        },
    },
    {
        "name": "MULTI-ALERT — Multiple Critical Vitals",
        "readings": 3,
        "description": "Fever + Tachycardia + Hypoxia at once. Multiple alert banners should appear. Doctor dashboard shows multiple auto-detected events.",
        "generate": lambda i: {
            "temperature_f": round(103.0 + random.uniform(0, 0.8), 1),
            "pulse_bpm": random.randint(130, 150),
            "spo2_percent": round(84.0 + random.uniform(0, 3.0), 1),
            "air_quality_ppm": round(random.uniform(150, 300), 1),
            "ecg_wave": generate_ecg(140),
        },
    },
    {
        "name": "RECOVERY — Back to Normal",
        "readings": 4,
        "description": "All vitals return to healthy range. Alerts should clear. Health certificate should improve to Grade A.",
        "generate": lambda i: {
            "temperature_f": round(98.4 + random.uniform(-0.2, 0.4), 1),
            "pulse_bpm": random.randint(65, 75),
            "spo2_percent": round(97.5 + random.uniform(0, 2.0), 1),
            "air_quality_ppm": round(random.uniform(50, 150), 1),
            "ecg_wave": generate_ecg(70),
        },
    },
]


def generate_ecg(bpm):
    """Generate a realistic ECG waveform (100 integer samples, 0-1000 range)."""
    samples = []
    period = 60.0 / bpm
    for i in range(100):
        t = (i / 100.0) * period
        phase = (t % period) / period

        if 0.1 < phase < 0.15:
            val = 0.15 * math.sin((phase - 0.1) / 0.05 * math.pi)
        elif 0.2 < phase < 0.22:
            val = -0.1
        elif 0.22 < phase < 0.28:
            val = 1.0 * math.sin((phase - 0.22) / 0.06 * math.pi)
        elif 0.28 < phase < 0.32:
            val = -0.2 * math.sin((phase - 0.28) / 0.04 * math.pi)
        elif 0.35 < phase < 0.45:
            val = 0.25 * math.sin((phase - 0.35) / 0.10 * math.pi)
        else:
            val = 0.0

        val += random.uniform(-0.02, 0.02)
        # Convert to integer (0-1000 range, centered at 500)
        samples.append(int(500 + val * 500))

    return samples


def send_reading(data):
    """Send a single reading to the backend API."""
    try:
        resp = requests.post(API, json=data, timeout=10)
        return resp.status_code, resp.json()
    except requests.exceptions.ConnectionError:
        return None, {"error": "Cannot connect to backend. Is it running on localhost:8000?"}
    except Exception as e:
        return None, {"error": str(e)}


def print_header():
    print()
    print("=" * 70)
    print("  VITALSIQ — Sensor Simulation Script")
    print("  Sending simulated sensor data to backend API")
    print("  Watch the dashboard at http://localhost:3000/patient")
    print("  Watch ZKP proofs at http://localhost:3000/doctor")
    print("=" * 70)
    print()


def print_vitals(data):
    """Pretty-print the vital signs being sent."""
    temp = data.get("temperature_f", "—")
    bpm = data.get("pulse_bpm", "—")
    spo2 = data.get("spo2_percent", "—")
    air = data.get("air_quality_ppm", "—")

    # Color indicators
    t_flag = " ** FEVER" if isinstance(temp, (int, float)) and temp > 100.4 else ""
    b_flag = " ** TACHY" if isinstance(bpm, int) and bpm > 100 else ""
    s_flag = " ** HYPOX" if isinstance(spo2, (int, float)) and spo2 < 90 else ""
    a_flag = " ** HAZARD" if isinstance(air, (int, float)) and air > 1000 else ""

    print(f"    Temp: {temp}F{t_flag}  |  BPM: {bpm}{b_flag}  |  SpO2: {spo2}%{s_flag}  |  Air: {air} PPM{a_flag}")


def run_scenario(scenario, delay, index, total):
    """Run a single scenario with multiple readings."""
    name = scenario["name"]
    desc = scenario["description"]
    count = scenario["readings"]

    print()
    print(f"{'─' * 70}")
    print(f"  SCENARIO {index}/{total}: {name}")
    print(f"  {desc}")
    print(f"{'─' * 70}")
    print()

    for i in range(count):
        data = scenario["generate"](i)
        print(f"  Reading {i + 1}/{count}:")
        print_vitals(data)

        status_code, result = send_reading(data)

        if status_code is None:
            print(f"    ERROR: {result.get('error')}")
            return False
        else:
            msg = result.get("message", "")
            print(f"    -> {status_code} {msg}")

        if i < count - 1:
            print(f"    Waiting {delay}s...")
            time.sleep(delay)

    # Wait a bit longer between scenarios
    print(f"\n  Scenario complete. Waiting {delay + 2}s before next scenario...")
    time.sleep(delay + 2)
    return True


def main():
    delay = 5  # seconds between readings
    scenario_filter = None

    # Parse args
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--fast":
            delay = 3
        elif arg == "--scenario" and i < len(sys.argv) - 1:
            scenario_filter = int(sys.argv[i + 1])

    print_header()

    if scenario_filter:
        if 1 <= scenario_filter <= len(SCENARIOS):
            scenarios = [(scenario_filter, SCENARIOS[scenario_filter - 1])]
            print(f"  Running scenario {scenario_filter} only\n")
        else:
            print(f"  Invalid scenario number. Choose 1-{len(SCENARIOS)}")
            return
    else:
        scenarios = list(enumerate(SCENARIOS, 1))
        print(f"  Running all {len(scenarios)} scenarios")
        print(f"  Delay: {delay}s between readings\n")

    total = len(SCENARIOS)

    for idx, scenario in scenarios:
        ok = run_scenario(scenario, delay, idx, total)
        if not ok:
            print("\n  Aborting — backend not reachable.")
            break

    print()
    print("=" * 70)
    print("  SIMULATION COMPLETE")
    print("  Check the dashboards:")
    print("    Patient: http://localhost:3000/patient")
    print("    Doctor:  http://localhost:3000/doctor")
    print("=" * 70)
    print()


if __name__ == "__main__":
    main()
