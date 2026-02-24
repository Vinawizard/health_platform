# IoT Health and Environment Monitoring System

A complete production-ready real-time monitoring system using ESP32, FastAPI, MongoDB, and Next.js.

## System Architecture
- **Hardware**: ESP32 reading from DS18B20 (Temp), HW-827 (Pulse), AD8232 (ECG), and MQ-135 (Air Quality).
- **Backend**: FastAPI (Python 3.10) with Motor for async MongoDB operations.
- **Frontend**: Next.js 14 App Router, Tailwind CSS, Recharts for live ECG waveform.
- **Database**: MongoDB

## Hardware Wiring Description
| Sensor | Pin on ESP32 | Notes |
|---|---|---|
| DS18B20 Temp | GPIO 4 | OneWire Data Pin |
| HW-827 Pulse | GPIO 34 | Analog Read |
| AD8232 ECG | GPIO 35 (OUTPUT) | Analog Read |
| AD8232 ECG | GPIO 32 (LO+) | Leads Off Detection Plus |
| AD8232 ECG | GPIO 33 (LO-) | Leads Off Detection Minus |
| MQ-135 Air Quality | GPIO 36 | Analog Read |

## Setup Instructions

### 1. MongoDB Setup Guide
1. Install [MongoDB Community Edition](https://www.mongodb.com/try/download/community) and run the MongoDB server locally on port 27017, OR set up a free cluster on MongoDB Atlas.
2. Get your Connection URI (e.g., `mongodb://localhost:27017` or `mongodb+srv://...`).

### 2. Backend Setup
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Add your MongoDB URI to the `.env` file.
5. Run the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### 3. ESP32 Upload Steps
1. Open `esp32/main.ino` in the Arduino IDE.
2. Install the required libraries via the Library Manager: `OneWire` and `DallasTemperature`.
3. Update the Wi-Fi credentials in the code:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
4. Update the `serverName` with your backend's local IP address (e.g., `http://192.168.1.100:8000/sensor-data`).
5. Select the ESP32 Dev Module board and correct COM port.
6. Click **Upload**. Open the Serial Monitor at `115200` baud to verify the connection and data transmission.

### 4. Frontend Setup
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the real-time dashboard.

### 5. API Testing Instructions
You can test the backend API independently from the ESP32 using the provided Python script:
1. Ensure the FastAPI backend is running.
2. Navigate to the `backend` folder.
3. Run the test script to simulate one payload from the ESP32:
   ```bash
   python test_api.py
   ```
4. Alternatively, use tools like Postman or cURL:
   ```bash
   curl -X POST http://localhost:8000/sensor-data \
        -H "Content-Type: application/json" \
        -d '{"temperature_f": 98.6, "pulse_bpm": 72, "air_quality_ppm": 250, "ecg_wave": [500,510,520], "timestamp": "2026-02-21T12:00:00Z"}'
   ```
