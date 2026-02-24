# ESP32 IoT Health and Environment Monitoring Firmware

This Arduino firmware reads from various medical and environmental sensors and sends data via HTTP POST to the backend.

## Hardware Connections

| Sensor | Pin on ESP32 | Notes |
|---|---|---|
| DS18B20 Temp | GPIO 4 | OneWire Data Pin |
| HW-827 Pulse | GPIO 34 | Analog Read |
| AD8232 ECG | GPIO 35 (OUTPUT) | Analog Read |
| AD8232 ECG | GPIO 32 (LO+) | Leads Off Detection Plus |
| AD8232 ECG | GPIO 33 (LO-) | Leads Off Detection Minus |
| MQ-135 Air Quality | GPIO 36 | Analog Read |

## Setup Instructions

1. Open `main.ino` in the Arduino IDE.
2. Install necessary libraries using the Library Manager:
   - `OneWire` by Paul Stoffregen
   - `DallasTemperature` by Miles Burton
3. In `main.ino`, update your Wi-Fi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
4. Update the `serverName` variable with the IP address of your FastAPI backend:
   ```cpp
   const char* serverName = "http://192.168.1.XXX:8000/sensor-data";
   ```
5. Select the ESP32 Dev Module in Tools > Board.
6. Connect the ESP32 via USB and upload the code.
7. Open the Serial Monitor (115200 baud) to view connection status and HTTP POST responses.
