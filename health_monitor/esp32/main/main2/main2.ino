#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <time.h>

const char* ssid = "Vicky";
const char* password = "12345678900000";

const char* serverName = "http://10.109.70.142:8000/sensor-data"; // Replace with actual backend IP

#define ONE_WIRE_BUS 4  // GPIO4
#define LO_PLUS 32      // GPIO32
#define LO_MINUS 33     // GPIO33

#define ECG_PIN 35    // ECG Analog Output
#define PULSE_PIN 34  // Pulse Sensor Analog Output
#define MQ135_PIN 36  // Air Quality Sensor Analog Output

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

unsigned long lastDataSend = 0;
const long interval = 1000; // 1 second

int ecg_wave[100];
int ecg_index = 0;
unsigned long lastEcgRead = 0;
const long ecg_interval = 10; // Read every 10ms to get 100 samples per second

int threshold = 2000; // Peak threshold for BPM detection on ESP32 12-bit ADC (0-4095)
bool aboveThreshold = false;
unsigned long lastBeatTime = 0;
unsigned long beatInterval = 0;
int currentBpm = 0;

const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 0; // UTC
const int   daylightOffset_sec = 0;

void setup() {
  Serial.begin(115200);
  
  analogReadResolution(12);
  pinMode(ECG_PIN, INPUT);
  pinMode(PULSE_PIN, INPUT);
  pinMode(MQ135_PIN, INPUT);

  pinMode(LO_PLUS, INPUT);
  pinMode(LO_MINUS, INPUT);
  
  ds18b20.begin();
  
  connectWiFi();
  
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }
  
  if (millis() - lastEcgRead >= ecg_interval) {
    lastEcgRead = millis();
    
    if((digitalRead(LO_PLUS) == 1) || (digitalRead(LO_MINUS) == 1)){
      ecg_wave[ecg_index] = 2048; // Baseline if lead is off (midpoint of 12-bit ADC)
    } else {
      ecg_wave[ecg_index] = analogRead(ECG_PIN); 
    }
    
    ecg_index++;
    if (ecg_index >= 100) {
      ecg_index = 0; // Prevent overflow, buffer will be sent in full every second
    }
  }
  
  int pulseValue = analogRead(PULSE_PIN);
  if (pulseValue > threshold && !aboveThreshold) {
    aboveThreshold = true;
    unsigned long currentTime = millis();
    beatInterval = currentTime - lastBeatTime;
    lastBeatTime = currentTime;
    
    if (beatInterval > 300 && beatInterval < 2000) {
      currentBpm = 60000 / beatInterval;
    }
  } else if (pulseValue < threshold - 200) { 
    aboveThreshold = false;
  }
  
  if (millis() - lastDataSend >= interval) {
    lastDataSend = millis();
    sendDataToBackend();
  }
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected to WiFi!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi.");
  }
}

String getISOTimestamp() {
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  
  if(timeinfo.tm_year < 110) { // Time not synced yet (before 2010)
    return "1970-01-01T00:00:00Z";
  }
  
  char timeStringBuff[50];
  strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(timeStringBuff);
}

void sendDataToBackend() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  ds18b20.requestTemperatures();
  float tempC = ds18b20.getTempCByIndex(0);
  float tempF = (tempC * 9.0 / 5.0) + 32.0;
  if (tempC == DEVICE_DISCONNECTED_C) tempF = 0.0;
  
  int mq135_analog = analogRead(MQ135_PIN);
  
  float air_quality_ppm = map(mq135_analog, 0, 4095, 0, 1500); 
  
  if (air_quality_ppm < 400) {
    air_quality_ppm = 400;
  } 

  String jsonPayload = "{";
  jsonPayload += "\"temperature_f\":" + String(tempF, 2) + ",";
  jsonPayload += "\"pulse_bpm\":" + String(currentBpm) + ",";
  jsonPayload += "\"air_quality_ppm\":" + String(air_quality_ppm, 2) + ",";
  
  jsonPayload += "\"ecg_wave\":[";
  for (int i = 0; i < 100; i++) {
    jsonPayload += String(ecg_wave[i]);
    if (i < 99) jsonPayload += ",";
  }
  jsonPayload += "],";
  
  jsonPayload += "\"timestamp\":\"" + getISOTimestamp() + "\"";
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
