#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"

// WiFi Credentials
const char* ssid = "Vicky";
const char* password = "12345678900000";

// Backend API URL - Update to your computer's local IP address
const char* serverName = "http://10.109.70.142:8000/sensor-data"; 

MAX30105 particleSensor;
float currentSpo2 = 98.0; 
unsigned long lastDataSend = 0;
const long interval = 1000; // Send data every 1 second

void setup() {
  Serial.begin(115200);
  delay(10);
  
  // Connect D1 (SCL) and D2 (SDA) on the ESP8266
  Wire.begin(D2, D1); // Explicitly state the SDA, SCL pins for ESP8266 

  // Initialize MAX30102
  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("MAX30102 was not found. Please check wiring/power.");
    while (1); // Halt if sensor not found
  } else {
    Serial.println("MAX30102 initialized successfully!");
    byte ledBrightness = 60; // Enough to see the red LED
    byte sampleAverage = 4;
    byte ledMode = 2; // Red + IR
    int sampleRate = 100;
    int pulseWidth = 411;
    int adcRange = 4096;
    
    particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
  }

  // Connect to WiFi
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Placeholder SpO2 Calculation (Replace with Maxim algorithm over window logic for production)
  long irValue = particleSensor.getIR();
  if (irValue > 50000) {
    // Finger is detected on the sensor
    currentSpo2 = 96.0 + (random(0, 40) / 10.0); // Simulate realistic 96-100% SpO2
    if (currentSpo2 > 100.0) currentSpo2 = 100.0;
  } else {
    currentSpo2 = 0.0; // No finger
  }

  // Send data to backend API every second
  if (millis() - lastDataSend >= interval) {
    lastDataSend = millis();
    sendDataToBackend();
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void sendDataToBackend() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Build JSON with ONLY SpO2 (Backend will handle the merging)
  String jsonPayload = "{";
  jsonPayload += "\"spo2_percent\":" + String(currentSpo2, 1);
  jsonPayload += "}";

  WiFiClient client;
  HTTPClient http;

  http.begin(client, serverName);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(jsonPayload);

  Serial.print("HTTP POST => ");
  Serial.println(httpResponseCode);

  http.end();
}
