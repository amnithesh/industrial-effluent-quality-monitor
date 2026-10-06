# Industrial Effluent Quality Monitor
### Real-Time Effluent Monitoring & Automatic Discharge Control
**College Engineering Capstone Prototype**

---

## 1. Project Overview

The **Industrial Effluent Quality Monitor** is an IoT-enabled environmental engineering solution designed to monitor industrial wastewater discharge in real time. It measures two core effluent quality parameters:
- **pH Level** (Acidity / Alkalinity: 0.0 – 14.0 pH)
- **Turbidity** (Suspended colloidal solids: 0 – 100+ NTU)

The system automatically evaluates effluent compliance against configurable threshold limits. If effluent parameters violate the configured limits, the system triggers an emergency interlock that shuts off the solenoid discharge valve, preventing harmful untreated industrial wastewater from entering municipal sewers or natural water bodies.

### System Architecture Flow

```text
[ pH Sensor (Analog) ]
        ↓
[ Turbidity Sensor (Analog) ]
        ↓
[ ESP32 Microcontroller (ADC Sampling) ]
        ↓ (Automatic Fail-Safe Logic)
[ Solenoid Discharge Valve (Relay GPIO 26) ]
        ↓
[ Wi-Fi / HTTPS ]
        ↓
[ Firebase Realtime Database (/effluentMonitor/current) ]
        ↓ (Real-Time WebSocket onValue)
[ React SCADA Web Dashboard ]
```

---

## 2. Installation & Quick Start

Ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) installed on your workstation.

### Step 1: Clone or Navigate to the Project Directory
```bash
cd d:/miniproject
```

### Step 2: Install Project Dependencies
```bash
npm install
```
*(On Windows PowerShell, if script execution policy restricts `npm`, use `npm.cmd install`)*

### Step 3: Run the Development Server
```bash
npm run dev
```
*(or `npm.cmd run dev`)*

Open your browser and navigate to:
```text
http://localhost:5173/
```

The application will start immediately. If Firebase credentials have not yet been provided, the dashboard automatically starts in **Demonstration / Simulation Mode** so you can test all features right out of the box.

---

## 3. Firebase Project Creation

To stream live cloud telemetry from Firebase Realtime Database:

1. Visit the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Enter a project name (e.g., `effluent-quality-monitor`).
4. (Optional) Disable Google Analytics for this prototype, then click **Create Project**.
5. Once your project is ready, click **Continue**.

---

## 4. Firebase Realtime Database Setup

1. In the left navigation menu of the Firebase Console, go to **Build** → **Realtime Database**.
2. Click **Create Database**.
3. Choose a database location (e.g., `United States` or closest to your location).
4. For security rules during project testing:
   - Select **Start in test mode** (allows read/write for 30 days) OR set the rules below in the **Rules** tab:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
5. Click **Enable**.
6. Note your Database URL, which will look like:
   `https://your-project-id-default-rtdb.firebaseio.com/`

---

## 5. Where to Put Firebase Credentials

Open the file:
[`src/firebase/firebaseConfig.js`](file:///d:/miniproject/src/firebase/firebaseConfig.js)

In the Firebase Console:
1. Go to **Project Settings** (gear icon in the top left) → **General** tab.
2. Scroll down to **Your apps** and click the **Web icon (`</>`)**.
3. Register the web app (e.g., `Effluent-Dashboard`).
4. Copy the `firebaseConfig` object and replace the placeholder values in [`src/firebase/firebaseConfig.js`](file:///d:/miniproject/src/firebase/firebaseConfig.js):

```javascript
// Replace the placeholder Firebase configuration with your Firebase project's configuration:
export const firebaseConfig = {
  apiKey: "AIzaSyYourActualApiKey...",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

---

## 6. Firebase Realtime Database Structure

The database is structured hierarchically under the root node `effluentMonitor/`:

```text
effluentMonitor/
│
├── current/
│   ├── ph: 7.21                (float: 0.0 - 14.0)
│   ├── turbidity: 18.4         (float: NTU)
│   ├── compliance: "COMPLIANT" (string: "COMPLIANT" | "NON-COMPLIANT")
│   ├── valve: "OPEN"           (string: "OPEN" | "CLOSED")
│   ├── timestamp: 1758880000000(integer: epoch timestamp in ms)
│   └── mode: "LIVE"            (string: "LIVE" | "SIMULATION")
│
├── history/
│   └── -NxyzReadingId/
│       ├── ph: 7.21
│       ├── turbidity: 18.4
│       ├── compliance: "COMPLIANT"
│       ├── valve: "OPEN"
│       ├── timestamp: 1758880000000
│       └── mode: "LIVE"
│
├── alerts/
│   └── -NxyzAlertId/
│       ├── type: "PH_OUT_OF_RANGE"
│       ├── message: "pH level (4.80) is OUT OF LIMIT."
│       ├── severity: "CRITICAL" ("INFO" | "WARNING" | "CRITICAL")
│       └── timestamp: 1758880000000
│
└── settings/
    ├── phMin: 6.0              (float: default 6.0)
    ├── phMax: 9.0              (float: default 9.0)
    └── turbidityMax: 50.0      (float: default 50.0 NTU)
```

> **IMPORTANT:** The default values (`phMin = 6.0`, `phMax = 9.0`, `turbidityMax = 50.0 NTU`) are **PROJECT CONFIGURED LIMITS** established for this laboratory prototype demonstration. They are not universal statutory or legal discharge standards.

---

## 7. How Simulation Mode Works

Because physical probes are often awaiting hardware assembly, the dashboard provides a dedicated **Simulation Engine**:
- **[Normal Condition]**: Injects `pH = 7.20`, `Turbidity = 18.0 NTU`.
  - Result: `COMPLIANT`, Valve `OPEN`.
- **[Simulate pH Fault]**: Injects `pH = 4.80`, `Turbidity = 18.0 NTU`.
  - Result: `NON-COMPLIANT`, Valve `CLOSED`, Critical Alert created.
- **[Simulate Turbidity Fault]**: Injects `pH = 7.20`, `Turbidity = 72.0 NTU`.
  - Result: `NON-COMPLIANT`, Valve `CLOSED`, Critical Alert created.
- **[Simulate Both Faults]**: Injects `pH = 4.80`, `Turbidity = 72.0 NTU`.
  - Result: `NON-COMPLIANT`, Valve `CLOSED`.
- **[Simulate Missing Sensor]**: Injects `null` values to test sensor disconnect error handling (`pH SENSOR DATA UNAVAILABLE` / `TURBIDITY SENSOR DATA UNAVAILABLE`).
- **Continuous Live Ticker**: Toggles an automated periodic telemetry generator that adds realistic analog fluctuation (±0.04 pH, ±0.4 NTU) every 3.5 seconds.

When Firebase is connected, simulation buttons write directly to `/effluentMonitor/current` with `mode: "SIMULATION"`. When Firebase is in demo mode, it updates the local state and history seamlessly.

---

## 8. How ESP32 Will Connect (Hardware Architecture)

When physical hardware is connected, the ESP32 samples analog voltages from both probes and transmits readings directly to Firebase:

### Hardware Pinout

| Component | Pin on Module | ESP32 Pin | Signal Type | Function |
|---|---|---|---|---|
| **Analog pH Probe Module** | AOUT | `GPIO 34` | Analog (0 – 3.3V) | ADC1 Channel 6 |
| **Turbidity Sensor Module** | AOUT | `GPIO 35` | Analog (0 – 3.3V) | ADC1 Channel 7 |
| **Relay Module (Valve)** | IN | `GPIO 26` | Digital Output | Controls Solenoid |
| **Solenoid Valve (12V)** | Terminals | Relay COM & NO | 12V DC External | Water outflow |

### Arduino C++ Firmware

The complete, ready-to-flash Arduino sketch is stored at:
[`esp32/industrial_effluent_esp32.ino`](file:///d:/miniproject/esp32/industrial_effluent_esp32.ino)

It can also be viewed and copied directly from the **ESP32 Hardware & Code** tab in the dashboard.

---

## 9. Which Files Need to Be Changed When Real Sensors Are Connected

**ZERO files in the React web dashboard need to be changed!**

The web application is designed to be completely hardware-agnostic:
1. In the React dashboard: Simply update your real Firebase credentials in [`src/firebase/firebaseConfig.js`](file:///d:/miniproject/src/firebase/firebaseConfig.js).
2. In the ESP32 Arduino code: Flash [`esp32/industrial_effluent_esp32.ino`](file:///d:/miniproject/esp32/industrial_effluent_esp32.ino) with your Wi-Fi SSID, Password, and Firebase URL/Key.
3. Once powered on, the ESP32 writes to `/effluentMonitor/current` with `mode: "LIVE"`.
4. The dashboard automatically switches its header badge to `LIVE FIREBASE` and displays actual sensor readings.

---

## 10. Automated Compliance Logic & Fail-Safe Rule

The compliance calculation is governed by `evaluateCompliance(ph, turbidity, settings)` in [`src/utils/compliance.js`](file:///d:/miniproject/src/utils/compliance.js):

$$\text{isCompliant} = (\text{ph} \ge \text{phMin}) \land (\text{ph} \le \text{phMax}) \land (\text{turbidity} \le \text{turbidityMax})$$

- If `isCompliant` is `true`: Compliance = `COMPLIANT`, Valve = `OPEN`.
- If `isCompliant` is `false`: Compliance = `NON-COMPLIANT`, Valve = `CLOSED`.

### Core Safety Interlock
The dashboard enforces that the UI will **NEVER display `NON-COMPLIANT + VALVE OPEN`** because this would contradict the project's automatic shutoff control logic. If an invalid or missing sensor signal is received, the fail-safe automatically enforces emergency valve closure (`CLOSED`).

---

## 11. Verification & Testing

To run the automated compliance test suite:
```bash
node --test test/compliance.test.js
```
All 8 verification tests validate:
- Normal compliant conditions
- pH fault scenarios
- Turbidity fault scenarios
- Compound faults
- Sensor disconnect / null value handling
- Strict enforcement against `NON-COMPLIANT + VALVE OPEN`
- Dynamic threshold recalculation
