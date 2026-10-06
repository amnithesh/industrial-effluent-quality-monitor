import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import SensorCard from './components/SensorCard';
import ComplianceCard from './components/ComplianceCard';
import ValveStatus from './components/ValveStatus';
import TrendChart from './components/TrendChart';
import AlertPanel from './components/AlertPanel';
import EventLog from './components/EventLog';
import SimulationPanel from './components/SimulationPanel';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import HardwareGuideView from './components/HardwareGuideView';

import {
  DEFAULT_SETTINGS,
  evaluateCompliance
} from './utils/compliance';

import {
  initFirebase,
  subscribeToConnectionStatus,
  subscribeToCurrentData,
  subscribeToSettings,
  subscribeToHistory,
  subscribeToAlerts,
  writeSensorReading,
  writeAlert,
  updateSettings,
  clearHistory
} from './firebase/firebaseService';

import { isFirebaseConfigured } from './firebase/firebaseConfig';
import { Info, WifiOff, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Navigation tab: 'dashboard' | 'history' | 'settings' | 'hardware'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Firebase status
  const [isFirebaseReady, setIsFirebaseReady] = useState(isFirebaseConfigured());
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);

  // Settings
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Current reading state
  const [currentData, setCurrentData] = useState({
    ph: 7.21,
    turbidity: 18.4,
    compliance: 'COMPLIANT',
    valve: 'OPEN',
    timestamp: Date.now(),
    mode: 'SIMULATION' // 'LIVE' | 'SIMULATION'
  });

  // History readings (used for TrendChart & History table)
  const [historyData, setHistoryData] = useState([
    {
      id: 'init-1',
      ph: 7.20,
      turbidity: 18.0,
      compliance: 'COMPLIANT',
      valve: 'OPEN',
      mode: 'SIMULATION',
      timestamp: Date.now() - 60000
    },
    {
      id: 'init-2',
      ph: 7.22,
      turbidity: 18.2,
      compliance: 'COMPLIANT',
      valve: 'OPEN',
      mode: 'SIMULATION',
      timestamp: Date.now() - 45000
    },
    {
      id: 'init-3',
      ph: 7.21,
      turbidity: 18.4,
      compliance: 'COMPLIANT',
      valve: 'OPEN',
      mode: 'SIMULATION',
      timestamp: Date.now() - 30000
    }
  ]);

  // Alerts
  const [alerts, setAlerts] = useState([
    {
      id: 'alert-init-1',
      type: 'SYSTEM_STARTUP',
      message: 'Effluent Quality Monitoring Supervisory System initialized.',
      severity: 'INFO',
      timestamp: Date.now() - 65000
    }
  ]);

  // Continuous auto-simulation state (enabled by default for live real-time stream)
  const [isAutoSimulating, setIsAutoSimulating] = useState(true);

  // Settings and currentData refs to prevent stale closure in listeners
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const currentDataRef = useRef(currentData);
  currentDataRef.current = currentData;

  // Track last time history was logged (routine 1-minute interval vs immediate fault logging)
  const lastHistoryLogTimeRef = useRef(0);
  const lastValveStateRef = useRef('OPEN');

  // Previous evaluation ref for alert state transition de-duplication
  const prevEvalRef = useRef({
    isCompliant: true,
    statusPh: 'NORMAL',
    statusTurbidity: 'NORMAL',
    hasSensorError: false
  });

  // Evaluate compliance using central logic
  const evaluation = evaluateCompliance(currentData.ph, currentData.turbidity, settings);

  // Helper to add an alert with de-duplication
  const triggerAlert = useCallback(
    async (type, message, severity) => {
      const newAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type,
        message,
        severity,
        timestamp: Date.now()
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);

      if (isFirebaseConfigured() && isFirebaseConnected) {
        try {
          await writeAlert(newAlert);
        } catch {
          // Alert saved in local state
        }
      }
    },
    [isFirebaseConnected]
  );

  // Detect state transitions and trigger alerts (prevents duplicates every second)
  useEffect(() => {
    const prev = prevEvalRef.current;
    const curr = evaluation;

    // Check pH transition
    if (prev.statusPh !== curr.statusPh) {
      if (curr.statusPh === 'OUT OF LIMIT') {
        triggerAlert(
          'PH_OUT_OF_RANGE',
          `pH level (${Number(currentData.ph).toFixed(2)}) is OUT OF LIMIT. Project range: ${settings.phMin} – ${settings.phMax} pH.`,
          'CRITICAL'
        );
      } else if (curr.statusPh === 'DATA_UNAVAILABLE') {
        triggerAlert(
          'PH_SENSOR_DISCONNECT',
          'pH sensor signal is missing or disconnected. Fail-safe engaged.',
          'CRITICAL'
        );
      } else if (curr.statusPh === 'NORMAL' && prev.statusPh !== 'NORMAL') {
        triggerAlert(
          'PH_NORMAL',
          `pH level recovered to normal (${Number(currentData.ph).toFixed(2)} pH).`,
          'INFO'
        );
      }
    }

    // Check Turbidity transition
    if (prev.statusTurbidity !== curr.statusTurbidity) {
      if (curr.statusTurbidity === 'HIGH') {
        triggerAlert(
          'HIGH_TURBIDITY',
          `Turbidity (${Number(currentData.turbidity).toFixed(1)} NTU) EXCEEDS LIMIT of ≤ ${settings.turbidityMax} NTU.`,
          'CRITICAL'
        );
      } else if (curr.statusTurbidity === 'DATA_UNAVAILABLE') {
        triggerAlert(
          'TURBIDITY_SENSOR_DISCONNECT',
          'Turbidity sensor signal is missing or disconnected. Fail-safe engaged.',
          'CRITICAL'
        );
      } else if (curr.statusTurbidity === 'NORMAL' && prev.statusTurbidity !== 'NORMAL') {
        triggerAlert(
          'TURBIDITY_NORMAL',
          `Turbidity level returned to normal (${Number(currentData.turbidity).toFixed(1)} NTU).`,
          'INFO'
        );
      }
    }

    // Check overall compliance transition
    if (prev.isCompliant !== curr.isCompliant) {
      if (!curr.isCompliant) {
        triggerAlert(
          'NON_COMPLIANT_DISCHARGE',
          'NON-COMPLIANT EFFLUENT DETECTED: Automatic Solenoid Discharge Valve CLOSED to prevent contamination.',
          'CRITICAL'
        );
      } else {
        triggerAlert(
          'COMPLIANT_DISCHARGE',
          'Effluent quality is COMPLIANT with prototype limits. Solenoid Discharge Valve OPENED.',
          'INFO'
        );
      }
    }

    // Update ref
    prevEvalRef.current = {
      isCompliant: curr.isCompliant,
      statusPh: curr.statusPh,
      statusTurbidity: curr.statusTurbidity,
      hasSensorError: curr.hasSensorError
    };
  }, [
    currentData.ph,
    currentData.turbidity,
    evaluation,
    settings.phMin,
    settings.phMax,
    settings.turbidityMax,
    triggerAlert
  ]);

  // Initialize and subscribe to Firebase if configured
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsFirebaseReady(false);
      setIsFirebaseConnected(false);
      return;
    }

    setIsFirebaseReady(true);
    const db = initFirebase();
    if (!db) {
      setFirebaseError('Failed to initialize Firebase');
      return;
    }

    // 1. Connection status listener
    const unsubConn = subscribeToConnectionStatus((connected) => {
      setIsFirebaseConnected(connected);
      if (!connected) {
        triggerAlert(
          'FIREBASE_DISCONNECT',
          'FIREBASE CONNECTION LOST. Telemetry stream interrupted.',
          'CRITICAL'
        );
      }
    });

    // 2. Settings listener
    const unsubSettings = subscribeToSettings((remoteSettings) => {
      if (remoteSettings) {
        const nextSettings = {
          phMin: remoteSettings.phMin !== undefined ? Number(remoteSettings.phMin) : DEFAULT_SETTINGS.phMin,
          phMax: remoteSettings.phMax !== undefined ? Number(remoteSettings.phMax) : DEFAULT_SETTINGS.phMax,
          turbidityMax:
            remoteSettings.turbidityMax !== undefined
              ? Number(remoteSettings.turbidityMax)
              : DEFAULT_SETTINGS.turbidityMax
        };
        settingsRef.current = nextSettings;
        setSettings(nextSettings);

        // Immediate recalculation of compliance for current telemetry
        const cur = currentDataRef.current;
        const evalResult = evaluateCompliance(cur.ph, cur.turbidity, nextSettings);
        if (cur.compliance !== evalResult.compliance || cur.valve !== evalResult.valve) {
          const updated = {
            ...cur,
            compliance: evalResult.compliance,
            valve: evalResult.valve
          };
          setCurrentData(updated);
          // Sync corrected compliance and valve to Firebase /effluentMonitor/current
          writeSensorReading(updated).catch((e) => console.warn(e));
        }
      }
    });

    // 3. Real-time current data listener (/effluentMonitor/current)
    const unsubCurrent = subscribeToCurrentData(
      (data) => {
        if (data) {
          // Re-evaluate compliance based on LATEST active settings
          const evalResult = evaluateCompliance(data.ph, data.turbidity, settingsRef.current);
          const calculatedCompliance = evalResult.compliance;
          const calculatedValve = evalResult.valve;

          setCurrentData({
            ph: data.ph,
            turbidity: data.turbidity,
            // Central safety: calculated compliance overrides any stale remote text
            compliance: calculatedCompliance,
            valve: calculatedValve,
            timestamp: data.timestamp || Date.now(),
            mode: data.mode || 'LIVE'
          });

          // If Firebase has stale compliance or valve (e.g. after settings change), sync it back
          if (data.compliance !== calculatedCompliance || data.valve !== calculatedValve) {
            writeSensorReading({
              ...data,
              compliance: calculatedCompliance,
              valve: calculatedValve
            }).catch((e) => console.warn(e));
          }
        }
      },
      (err) => {
        setFirebaseError(err.message);
      }
    );

    // 4. History listener (/effluentMonitor/history)
    const unsubHistory = subscribeToHistory((records) => {
      if (records && records.length > 0) {
        setHistoryData(records);
      }
    }, 50);

    // 5. Alerts listener (/effluentMonitor/alerts)
    const unsubAlerts = subscribeToAlerts((remoteAlerts) => {
      if (remoteAlerts && remoteAlerts.length > 0) {
        setAlerts(remoteAlerts);
      }
    }, 30);

    return () => {
      if (unsubConn) unsubConn();
      if (unsubSettings) unsubSettings();
      if (unsubCurrent) unsubCurrent();
      if (unsubHistory) unsubHistory();
      if (unsubAlerts) unsubAlerts();
    };
  }, []);

  // Injection handler (for Simulation buttons & custom values)
  const handleInjectReading = async (ph, turbidity, mode = 'SIMULATION') => {
    const timestamp = Date.now();
    const evalResult = evaluateCompliance(ph, turbidity, settings);

    const record = {
      id: `local-${timestamp}`,
      ph,
      turbidity,
      compliance: evalResult.compliance,
      valve: evalResult.valve,
      mode,
      timestamp
    };

    // Optimistic local state update
    setCurrentData(record);
    // Manual action or fault test is logged to history immediately
    lastHistoryLogTimeRef.current = timestamp;
    lastValveStateRef.current = evalResult.valve;
    setHistoryData((prev) => [...prev.slice(-49), record]);

    // Push to Firebase if configured
    if (isFirebaseConfigured()) {
      try {
        await writeSensorReading(
          {
            ph,
            turbidity,
            compliance: evalResult.compliance,
            valve: evalResult.valve,
            mode,
            timestamp
          },
          true // Always log manual test triggers
        );
      } catch (err) {
        console.warn('Firebase write failed, keeping local update:', err);
      }
    }
  };

  // Continuous auto-simulation ticker (realistic analog sensor fluctuation)
  useEffect(() => {
    if (!isAutoSimulating) return;

    const interval = setInterval(() => {
      // Create minor realistic fluctuation around baseline
      setCurrentData((prev) => {
        const basePh = prev.ph !== null && prev.ph !== undefined ? Number(prev.ph) : 7.2;
        const baseTurb =
          prev.turbidity !== null && prev.turbidity !== undefined ? Number(prev.turbidity) : 18.0;

        // Minor drift +/- 0.04 pH, +/- 0.3 NTU
        const deltaPh = (Math.random() - 0.49) * 0.08;
        const deltaTurb = (Math.random() - 0.49) * 0.7;

        let nextPh = Math.round((basePh + deltaPh) * 100) / 100;
        let nextTurb = Math.round((baseTurb + deltaTurb) * 10) / 10;

        // Keep within reasonable boundaries
        if (nextPh < 3.0) nextPh = 3.2;
        if (nextPh > 12.0) nextPh = 11.8;
        if (nextTurb < 1.0) nextTurb = 1.5;

        const evalResult = evaluateCompliance(nextPh, nextTurb, settings);
        const timestamp = Date.now();

        const reading = {
          id: `sim-${timestamp}`,
          ph: nextPh,
          turbidity: nextTurb,
          compliance: evalResult.compliance,
          valve: evalResult.valve,
          mode: 'SIMULATION',
          timestamp
        };

        const isClosed = evalResult.valve === 'CLOSED' || !evalResult.isCompliant;
        const valveJustClosed = isClosed && lastValveStateRef.current !== 'CLOSED';
        const timeSinceLastLog = Date.now() - lastHistoryLogTimeRef.current;
        const isOneMinuteElapsed = timeSinceLastLog >= 60000; // 1 minute interval

        // LOGGING POLICY:
        // 1. Any CLOSED / fault condition -> Log immediately so faults always show!
        // 2. Compliant / OPEN -> Log once every 1 minute as routine baseline.
        const shouldLogToHistory = isClosed || valveJustClosed || isOneMinuteElapsed;

        lastValveStateRef.current = evalResult.valve;

        if (shouldLogToHistory) {
          lastHistoryLogTimeRef.current = Date.now();
          setHistoryData((hist) => [...hist.slice(-49), reading]);
        }

        // Push to Firebase: updates /current always, and appends to /history only when shouldLogToHistory is true
        if (isFirebaseConfigured() && isFirebaseConnected) {
          writeSensorReading(reading, shouldLogToHistory).catch((e) => console.warn(e));
        }

        return reading;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isAutoSimulating, settings, isFirebaseConnected]);

  // Handler for saving settings
  const handleSaveSettings = async (newSettings) => {
    settingsRef.current = newSettings;
    setSettings(newSettings);

    // Re-evaluate current reading against the new thresholds immediately
    const cur = currentDataRef.current;
    const evalResult = evaluateCompliance(cur.ph, cur.turbidity, newSettings);
    const updated = {
      ...cur,
      compliance: evalResult.compliance,
      valve: evalResult.valve
    };
    setCurrentData(updated);

    if (isFirebaseConfigured()) {
      await updateSettings(newSettings);
      // Immediately sync corrected compliance and valve to Firebase /effluentMonitor/current!
      await writeSensorReading(updated);
    }
  };

  // Clear alerts
  const handleClearAlerts = () => {
    setAlerts([]);
  };

  // Clear history
  const handleClearHistory = async () => {
    if (window.confirm('Clear all telemetry records from history?')) {
      setHistoryData([]);
      if (isFirebaseConfigured() && isFirebaseConnected) {
        await clearHistory();
      }
    }
  };

  // Determine top header data source badge
  const isLiveFirebase = isFirebaseConfigured() && isFirebaseConnected && currentData.mode === 'LIVE';
  const dataSourceText = isLiveFirebase
    ? 'LIVE FIREBASE'
    : currentData.mode === 'LIVE'
    ? 'LIVE ESP32 (CACHE)'
    : isFirebaseConfigured() && isFirebaseConnected
    ? 'SIMULATION (FIREBASE SYNC)'
    : 'SIMULATION (LOCAL ENGINE)';

  const systemOnline = isFirebaseConfigured() ? isFirebaseConnected : true;

  return (
    <div className="industrial-dashboard-app">
      {/* Informative Firebase Config Banner if using default placeholders */}
      {!isFirebaseConfigured() && (
        <div className="config-alert-strip">
          <div className="config-alert-content">
            <Info size={16} />
            <span>
              <strong>DEMONSTRATION MODE:</strong> Firebase credentials are currently placeholders in{' '}
              <code>src/firebase/firebaseConfig.js</code>. The dashboard is actively running with the
              built-in simulation engine. Add your Firebase project keys to stream real cloud telemetry.
            </span>
          </div>
        </div>
      )}

      {/* Main SCADA Header */}
      <Header
        systemOnline={systemOnline}
        isFirebaseActive={isFirebaseConnected}
        dataSource={dataSourceText}
        controller="ESP32"
        lastUpdate={currentData.timestamp}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        complianceState={evaluation}
      />

      {/* Main View Area */}
      <main className="dashboard-content-body">
        {activeTab === 'dashboard' && (
          <div className="dashboard-view-layout">
            {/* 4 Main Industrial SCADA Cards */}
            <section className="sensor-cards-grid" aria-label="Main Telemetry Displays">
              <SensorCard
                type="ph"
                value={currentData.ph}
                status={evaluation.statusPh}
                settings={settings}
                hasError={evaluation.statusPh === 'DATA_UNAVAILABLE'}
              />

              <SensorCard
                type="turbidity"
                value={currentData.turbidity}
                status={evaluation.statusTurbidity}
                settings={settings}
                hasError={evaluation.statusTurbidity === 'DATA_UNAVAILABLE'}
              />

              <ComplianceCard evaluation={evaluation} settings={settings} />

              <ValveStatus
                evaluation={evaluation}
                reportedValve={currentData.valve}
              />
            </section>

            {/* Simulation Controls Panel (Prominently labeled for college testing) */}
            <section className="simulation-section" aria-label="Hardware Simulation Controls">
              <SimulationPanel
                onInjectReading={handleInjectReading}
                isAutoSimulating={isAutoSimulating}
                setIsAutoSimulating={setIsAutoSimulating}
                isFirebaseActive={isFirebaseConfigured() && isFirebaseConnected}
              />
            </section>

            {/* Real-time Trend Chart */}
            <section className="chart-section" aria-label="Effluent Quality Trend Chart">
              <TrendChart historyData={historyData} currentSettings={settings} />
            </section>

            {/* Event Log & SCADA Alarms side by side */}
            <section className="logs-alarms-grid" aria-label="Events and Alarms">
              <EventLog events={historyData.slice().reverse()} />
              <AlertPanel alerts={alerts} onClearAlerts={handleClearAlerts} />
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={historyData.slice().reverse()}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            currentSettings={settings}
            onSaveSettings={handleSaveSettings}
            isFirebaseActive={isFirebaseConfigured() && isFirebaseConnected}
          />
        )}

        {activeTab === 'hardware' && <HardwareGuideView />}
      </main>

      {/* Industrial SCADA Footer */}
      <footer className="scada-footer">
        <div className="footer-left">
          <span>Industrial Effluent Quality Monitor Prototype</span>
          <span className="footer-divider">•</span>
          <span>Fail-Safe Automatic Interlock System</span>
        </div>
        <div className="footer-right">
          <span>Telemetry Polling: Real-Time WebSocket</span>
          <span className="footer-divider">•</span>
          <span>ESP32 Telemetry Standard v1.0</span>
        </div>
      </footer>
    </div>
  );
}
