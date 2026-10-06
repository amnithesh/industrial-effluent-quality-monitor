import React, { useState } from 'react';
import {
  Cpu,
  Radio,
  ArrowRight,
  Database,
  Monitor,
  Copy,
  Check,
  Zap,
  Terminal,
  Layers,
  HelpCircle
} from 'lucide-react';

const ESP32_ARDUINO_CODE = `/*
 * ====================================================================
 * PROJECT: Industrial Effluent Quality Monitor
 * CONTROLLER: ESP32 DevKit V1
 * ARCHITECTURE:
 *   pH Sensor (Analog)       -> ESP32 GPIO 34 (ADC)
 *   Turbidity Sensor (Analog)-> ESP32 GPIO 35 (ADC)
 *   Relay (Discharge Valve)  -> ESP32 GPIO 26
 *   ESP32 -> Wi-Fi -> Firebase Realtime Database -> React Dashboard
 * ====================================================================
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Provide Firebase token generation and RTDB helper
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// --- Wi-Fi Credentials ---
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// --- Firebase Project Credentials ---
#define API_KEY "AIzaSyCsObqJMp5P9PI7csO2Iw0zE2MlCrNi7xU"
#define DATABASE_URL "https://industry-monitor-e8e52-default-rtdb.firebaseio.com/"

// --- Hardware Pin Definitions ---
#define PIN_PH_SENSOR        34  // ADC1 Channel 6
#define PIN_TURBIDITY_SENSOR 35  // ADC1 Channel 7
#define PIN_VALVE_RELAY      26  // Relay signal pin (Active LOW or HIGH)

// --- Valve Logic Constants ---
#define VALVE_OPEN_STATE   HIGH  // Adjust based on your relay module (HIGH = energized)
#define VALVE_CLOSED_STATE LOW

// --- Configured Threshold Limits ---
float phMin = 6.0;
float phMax = 9.0;
float turbidityMax = 50.0;

// Firebase Data Objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastSendTime = 0;
const unsigned long sendInterval = 4000; // Send telemetry every 4 seconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n=== INDUSTRIAL EFFLUENT MONITOR STARTUP ===");

  // Initialize Valve Relay pin (Fail-safe initial state: CLOSED)
  pinMode(PIN_VALVE_RELAY, OUTPUT);
  digitalWrite(PIN_VALVE_RELAY, VALVE_CLOSED_STATE);
  Serial.println("[Valve] Fail-safe state initialized: CLOSED");

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[WiFi] Connected! IP: " + WiFi.localIP().toString());

  // Configure Firebase Client
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;

  // Anonymous or Email/Password Sign-In
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("[Firebase] Initialized connection to Realtime Database");
}

// Function to read and calibrate pH probe
float readSensorPH() {
  // Take 10 ADC samples for noise averaging
  int totalAdc = 0;
  for (int i = 0; i < 10; i++) {
    totalAdc += analogRead(PIN_PH_SENSOR);
    delay(10);
  }
  float avgAdc = totalAdc / 10.0;
  float voltage = (avgAdc / 4095.0) * 3.3;

  // Standard analog pH probe linear formula: pH = 7.0 + ((2.5 - voltage) / slope)
  // Calibrate with buffer solutions (pH 4.01, 7.00, 9.18) for exact slope
  float phValue = 7.0 + ((2.5 - voltage) * 3.5);

  // Clamp within 0.0 - 14.0
  if (phValue < 0.0) phValue = 0.0;
  if (phValue > 14.0) phValue = 14.0;
  return phValue;
}

// Function to read and calibrate Turbidity probe
float readSensorTurbidity() {
  int totalAdc = 0;
  for (int i = 0; i < 10; i++) {
    totalAdc += analogRead(PIN_TURBIDITY_SENSOR);
    delay(10);
  }
  float avgAdc = totalAdc / 10.0;
  float voltage = (avgAdc / 4095.0) * 3.3;

  // Turbidity sensor characteristic curve (voltage decreases as turbidity rises)
  // Clean water ~ 2.5V - 3.0V (0 NTU). Murky water < 1.5V.
  float ntu = 0.0;
  if (voltage < 2.5) {
    ntu = -1120.4 * (voltage * voltage) + 5742.3 * voltage - 4352.9;
  }
  if (ntu < 0.0) ntu = 0.0;
  return ntu;
}

void loop() {
  if (Firebase.ready() && (millis() - lastSendTime > sendInterval || lastSendTime == 0)) {
    lastSendTime = millis();

    // 1. Read calibrated sensors
    float ph = readSensorPH();
    float turbidity = readSensorTurbidity();

    // 2. Central Compliance Evaluation Logic
    bool isCompliant = (ph >= phMin && ph <= phMax && turbidity <= turbidityMax);
    String complianceStr = isCompliant ? "COMPLIANT" : "NON-COMPLIANT";
    String valveStr = isCompliant ? "OPEN" : "CLOSED";

    // 3. Actuate Solenoid Valve (Fail-Safe: CLOSED whenever non-compliant)
    if (isCompliant) {
      digitalWrite(PIN_VALVE_RELAY, VALVE_OPEN_STATE);
    } else {
      digitalWrite(PIN_VALVE_RELAY, VALVE_CLOSED_STATE);
    }

    // 4. Construct JSON payload for /effluentMonitor/current
    FirebaseJson json;
    json.set("ph", ph);
    json.set("turbidity", turbidity);
    json.set("compliance", complianceStr);
    json.set("valve", valveStr);
    json.set("mode", "LIVE"); // Mark source as LIVE physical sensor
    json.set("timestamp", (double)millis()); // Or NTP timestamp

    // Push to /effluentMonitor/current
    if (Firebase.RTDB.setJSON(&fbdo, "/effluentMonitor/current", &json)) {
      Serial.printf("[Telemetry Sent] pH: %.2f | Turbidity: %.1f NTU | %s | Valve: %s\\n",
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
      Firebase.RTDB.pushJSON(&fbdo, "/effluentMonitor/history", &json);
    }
  }
}
`;

export default function HardwareGuideView() {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ESP32_ARDUINO_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="view-container hardware-guide-view">
      <div className="view-header-strip">
        <div>
          <h2 className="view-heading">ESP32 & SENSOR HARDWARE ARCHITECTURE</h2>
          <p className="view-subtext">
            End-to-end hardware schematics, pinout specifications, and embedded Arduino C++ firmware
          </p>
        </div>

        <button type="button" onClick={handleCopyCode} className="copy-code-btn">
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span>{copied ? 'Copied Arduino Code!' : 'Copy Arduino C++ Code'}</span>
        </button>
      </div>

      {/* Visual System Architecture Diagram */}
      <div className="industrial-card architecture-diagram-card">
        <h3 className="card-title mb-3">Complete System Data Flow Architecture</h3>
        <p className="section-description">
          The telemetry pipeline is architected for zero-code dashboard transitions: simulated data and
          real physical sensor packets share the exact same schema at <code>/effluentMonitor/current</code>.
        </p>

        <div className="diagram-flow-container">
          <div className="diagram-node node-sensor">
            <span className="node-type">PHYSICAL PROBES</span>
            <div className="node-title">pH & Turbidity Sensors</div>
            <span className="node-detail">Analog Outputs (0 – 3.3V)</span>
          </div>

          <div className="diagram-arrow">
            <ArrowRight size={20} />
            <span className="arrow-label">ADC1</span>
          </div>

          <div className="diagram-node node-mcu">
            <span className="node-type">MICROCONTROLLER</span>
            <div className="node-title">ESP32 Dev Board</div>
            <span className="node-detail">Wi-Fi + ADC Sampling</span>
          </div>

          <div className="diagram-branch-down">
            <div className="branch-line"></div>
            <div className="diagram-node node-actuator">
              <span className="node-type">ACTUATION INTERLOCK</span>
              <div className="node-title">Relay & Solenoid Valve</div>
              <span className="node-detail">GPIO 26 (Normally Closed)</span>
            </div>
          </div>

          <div className="diagram-arrow">
            <ArrowRight size={20} />
            <span className="arrow-label">Wi-Fi / HTTPS</span>
          </div>

          <div className="diagram-node node-cloud">
            <span className="node-type">CLOUD BACKEND</span>
            <div className="node-title">Firebase Realtime DB</div>
            <span className="node-detail">/effluentMonitor/current</span>
          </div>

          <div className="diagram-arrow">
            <ArrowRight size={20} />
            <span className="arrow-label">WebSocket / onValue()</span>
          </div>

          <div className="diagram-node node-ui">
            <span className="node-type">SUPERVISORY SCADA</span>
            <div className="node-title">React Web Dashboard</div>
            <span className="node-detail">Live Visuals, Charts & Alerts</span>
          </div>
        </div>
      </div>

      {/* Pinout Specification Table */}
      <div className="industrial-card pinout-card">
        <h3 className="card-title">ESP32 Hardware Pinout Configuration</h3>
        <table className="industrial-table mt-2">
          <thead>
            <tr>
              <th>Component</th>
              <th>Module Pin</th>
              <th>ESP32 GPIO Pin</th>
              <th>Electrical Signal</th>
              <th>Function</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>pH Probe & Module</strong></td>
              <td>AOUT (Analog Output)</td>
              <td><code>GPIO 34 (ADC1_CH6)</code></td>
              <td>0 – 3.3V Analog</td>
              <td>Effluent Acidity / Alkalinity level (0 – 14 pH)</td>
            </tr>
            <tr>
              <td><strong>Turbidity Sensor</strong></td>
              <td>AOUT (Analog Output)</td>
              <td><code>GPIO 35 (ADC1_CH7)</code></td>
              <td>0 – 3.3V Analog</td>
              <td>Suspended solids light scattering (0 – 100+ NTU)</td>
            </tr>
            <tr>
              <td><strong>Relay Module</strong></td>
              <td>IN (Signal Input)</td>
              <td><code>GPIO 26</code></td>
              <td>Digital Output (3.3V)</td>
              <td>Switches 12V Solenoid Valve (OPEN / CLOSED)</td>
            </tr>
            <tr>
              <td><strong>Solenoid Valve</strong></td>
              <td>Coil Terminals</td>
              <td>Relay Common & NO</td>
              <td>12V DC External Supply</td>
              <td>Discharges effluent when compliant, stops when non-compliant</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transition Guide: From Simulation to Live Hardware */}
      <div className="industrial-card transition-guide-card">
        <h3 className="card-title">How to Switch From Simulation to Live ESP32 Hardware</h3>
        <div className="steps-list">
          <div className="step-item">
            <span className="step-num">1</span>
            <div className="step-content">
              <strong>Connect Sensors & ESP32:</strong> Wire the analog pH probe to GPIO 34, Turbidity sensor
              to GPIO 35, and Relay to GPIO 26 according to the table above.
            </div>
          </div>

          <div className="step-item">
            <span className="step-num">2</span>
            <div className="step-content">
              <strong>Paste Credentials into Arduino Code:</strong> Copy the code below into Arduino IDE,
              replace <code>YOUR_WIFI_SSID</code>, <code>YOUR_WIFI_PASSWORD</code>, and your Firebase credentials.
            </div>
          </div>

          <div className="step-item">
            <span className="step-num">3</span>
            <div className="step-content">
              <strong>Flash ESP32:</strong> Upload the sketch. The ESP32 will connect to Wi-Fi and write packets
              with <code>mode: "LIVE"</code> directly to <code>/effluentMonitor/current</code>.
            </div>
          </div>

          <div className="step-item">
            <span className="step-num">4</span>
            <div className="step-content">
              <strong>ZERO Dashboard Changes Required:</strong> The React web dashboard automatically detects
              incoming live data, switches the header badge to <code>LIVE FIREBASE</code>, and displays actual
              sensor telemetry in real time!
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Arduino Code Viewer */}
      <div className="industrial-card code-viewer-card">
        <div className="code-header">
          <span className="code-filename">esp32/industrial_effluent_esp32.ino</span>
          <button type="button" onClick={handleCopyCode} className="copy-code-inline-btn">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>
        <pre className="code-pre">
          <code>{ESP32_ARDUINO_CODE}</code>
        </pre>
      </div>
    </div>
  );
}
