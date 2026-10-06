/*
 * ====================================================================
 * PROJECT: Industrial Effluent Quality Monitor
 * CONTROLLER: ESP32 DevKit V1
 *
 * SENSORS & ACTUATORS:
 *   1. Analog pH Sensor Module         -> ESP32 GPIO 34 (ADC1_CH6)
 *   2. Analog Turbidity Sensor Module  -> ESP32 GPIO 35 (ADC1_CH7)
 *   3. 5V Relay Module (Solenoid Valve)-> ESP32 GPIO 26
 *
 * TELEMETRY ARCHITECTURE:
 *   Sensors -> ESP32 -> Wi-Fi -> Firebase Realtime DB -> React Dashboard
 * ====================================================================
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Helper extensions for Firebase token and RTDB operations
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// ====================================================================
// 1. CONFIGURATION (REPLACE WITH YOUR LOCAL CREDENTIALS)
// ====================================================================
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

#define API_KEY         "AIzaSyCsObqJMp5P9PI7csO2Iw0zE2MlCrNi7xU"
#define DATABASE_URL    "https://industry-monitor-e8e52-default-rtdb.firebaseio.com/"

// ====================================================================
// 2. HARDWARE PIN DEFINITIONS
// ====================================================================
#define PIN_PH_SENSOR        34  // Analog pH Probe (ADC1 Channel 6)
#define PIN_TURBIDITY_SENSOR 35  // Analog Turbidity Probe (ADC1 Channel 7)
#define PIN_VALVE_RELAY      26  // Solenoid Valve Relay Signal

// Valve Logic State (Adjust if using Active-LOW relay)
#define VALVE_OPEN_STATE     HIGH
#define VALVE_CLOSED_STATE   LOW

// Default Project Configured Thresholds
float phMin = 6.0;
float phMax = 9.0;
float turbidityMax = 50.0;

// Firebase instances
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastTelemetryTime = 0;
const unsigned long telemetryInterval = 4000; // Sample and transmit live every 4s
unsigned long lastHistoryLogTime = 0;         // History archive interval (1 min routine vs immediate fault)

// ====================================================================
// SENSOR CALIBRATION AND SAMPLING
// ====================================================================
float readSensorPH() {
  int totalAdc = 0;
  for (int i = 0; i < 10; i++) {
    totalAdc += analogRead(PIN_PH_SENSOR);
    delay(10);
  }
  float avgAdc = totalAdc / 10.0;
  float voltage = (avgAdc / 4095.0) * 3.3;

  // Linear pH formula: standard neutral reference is ~2.5V at pH 7.0
  float phVal = 7.0 + ((2.5 - voltage) * 3.5);
  if (phVal < 0.0) phVal = 0.0;
  if (phVal > 14.0) phVal = 14.0;
  return phVal;
}

float readSensorTurbidity() {
  int totalAdc = 0;
  for (int i = 0; i < 10; i++) {
    totalAdc += analogRead(PIN_TURBIDITY_SENSOR);
    delay(10);
  }
  float avgAdc = totalAdc / 10.0;
  float voltage = (avgAdc / 4095.0) * 3.3;

  // Turbidity sensor curve (clear water ~ 2.5V - 3.0V)
  float ntu = 0.0;
  if (voltage < 2.5) {
    ntu = -1120.4 * (voltage * voltage) + 5742.3 * voltage - 4352.9;
  }
  if (ntu < 0.0) ntu = 0.0;
  return ntu;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("INDUSTRIAL EFFLUENT QUALITY MONITOR (ESP32)");
  Serial.println("==================================================");

  // Solenoid Relay Pin Setup - Initial Fail-Safe: CLOSED
  pinMode(PIN_VALVE_RELAY, OUTPUT);
  digitalWrite(PIN_VALVE_RELAY, VALVE_CLOSED_STATE);
  Serial.println("[Actuator] Solenoid Valve initialized to Fail-Safe: CLOSED");

  // Connect to Local Wi-Fi
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected successfully!");
  Serial.print("[WiFi] ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  // Configure Firebase Client
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("[Firebase] Initialized connection to Realtime Database.");
}

void loop() {
  // Read real-time telemetry and sync with cloud
  if (Firebase.ready() && (millis() - lastTelemetryTime > telemetryInterval || lastTelemetryTime == 0)) {
    lastTelemetryTime = millis();

    // 1. Read calibrated physical analog probes
    float ph = readSensorPH();
    float turbidity = readSensorTurbidity();

    // 2. Central Compliance Evaluation Logic
    bool isCompliant = (ph >= phMin && ph <= phMax && turbidity <= turbidityMax);
    String complianceStr = isCompliant ? "COMPLIANT" : "NON-COMPLIANT";
    String valveStr = isCompliant ? "OPEN" : "CLOSED";

    // 3. Actuate Solenoid Valve Relay (Automatic Discharge Control)
    if (isCompliant) {
      digitalWrite(PIN_VALVE_RELAY, VALVE_OPEN_STATE);
    } else {
      digitalWrite(PIN_VALVE_RELAY, VALVE_CLOSED_STATE);
    }

    // 4. Construct JSON payload for /effluentMonitor/current
    FirebaseJson currentJson;
    currentJson.set("ph", ph);
    currentJson.set("turbidity", turbidity);
    currentJson.set("compliance", complianceStr);
    currentJson.set("valve", valveStr);
    currentJson.set("mode", "LIVE");
    currentJson.set("timestamp", (double)millis());

    // 5. Update /effluentMonitor/current in Firebase
    if (Firebase.RTDB.setJSON(&fbdo, "/effluentMonitor/current", &currentJson)) {
      Serial.printf("[Cloud Sync] pH: %.2f | Turb: %.1f NTU | %s | Valve: %s\n",
                    ph, turbidity, complianceStr.c_str(), valveStr.c_str());
    } else {
      Serial.println("[Firebase Error] " + fbdo.errorReason());
    }

    // 6. Append to /effluentMonitor/history:
    // Log immediately if CLOSED / non-compliant OR once every 60s (1 min) for routine compliant baseline
    bool isClosedCondition = (!isCompliant);
    bool isOneMinuteDue = (millis() - lastHistoryLogTime >= 60000 || lastHistoryLogTime == 0);
    if (isClosedCondition || isOneMinuteDue) {
      lastHistoryLogTime = millis();
      Firebase.RTDB.pushJSON(&fbdo, "/effluentMonitor/history", &currentJson);
      Serial.printf("[History Logged] %s | Synced to cloud archive.\n", isClosedCondition ? "FAULT / CLOSED" : "1-MIN BASELINE");
    }
  }
}
