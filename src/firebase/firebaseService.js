import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  query,
  limitToLast,
  serverTimestamp
} from 'firebase/database';
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig';
import { DEFAULT_SETTINGS } from '../utils/compliance';

let app = null;
let db = null;
let isInitialized = false;

// Initialize Firebase if configured
export function initFirebase() {
  if (!isFirebaseConfigured()) {
    console.warn(
      '[Firebase] Placeholder configuration detected. Realtime Database disabled until credentials are added.'
    );
    return null;
  }

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = getDatabase(app);
    isInitialized = true;
    return db;
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    isInitialized = false;
    return null;
  }
}

export function getDb() {
  if (!db && isFirebaseConfigured()) {
    return initFirebase();
  }
  return db;
}

/**
 * Listens to Realtime Database connection status via /.info/connected
 */
export function subscribeToConnectionStatus(callback) {
  const database = getDb();
  if (!database) {
    callback(false);
    return () => {};
  }

  const connectedRef = ref(database, '.info/connected');
  const unsubscribe = onValue(
    connectedRef,
    (snapshot) => {
      const isConnected = snapshot.val() === true;
      callback(isConnected);
    },
    (error) => {
      console.warn('[Firebase] Connection status listener error:', error);
      callback(false);
    }
  );

  return unsubscribe;
}

/**
 * Listens to /effluentMonitor/current in real time.
 */
export function subscribeToCurrentData(callback, onError) {
  const database = getDb();
  if (!database) {
    if (onError) onError(new Error('Firebase is not configured'));
    return () => {};
  }

  const currentRef = ref(database, 'effluentMonitor/current');
  const unsubscribe = onValue(
    currentRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        callback(val);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('[Firebase] Error reading /effluentMonitor/current:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Listens to /effluentMonitor/settings
 */
export function subscribeToSettings(callback) {
  const database = getDb();
  if (!database) {
    callback(DEFAULT_SETTINGS);
    return () => {};
  }

  const settingsRef = ref(database, 'effluentMonitor/settings');
  const unsubscribe = onValue(
    settingsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        // Fallback default
        callback(DEFAULT_SETTINGS);
      }
    },
    (err) => {
      console.warn('[Firebase] Settings listener error:', err);
      callback(DEFAULT_SETTINGS);
    }
  );

  return unsubscribe;
}

/**
 * Listens to latest records from /effluentMonitor/history
 */
export function subscribeToHistory(callback, maxRecords = 30) {
  const database = getDb();
  if (!database) {
    callback([]);
    return () => {};
  }

  const historyRef = query(ref(database, 'effluentMonitor/history'), limitToLast(maxRecords));
  const unsubscribe = onValue(
    historyRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const records = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        // Sort newest first or chronological
        callback(records);
      } else {
        callback([]);
      }
    },
    (err) => {
      console.warn('[Firebase] History listener error:', err);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Listens to /effluentMonitor/alerts
 */
export function subscribeToAlerts(callback, maxAlerts = 20) {
  const database = getDb();
  if (!database) {
    callback([]);
    return () => {};
  }

  const alertsRef = query(ref(database, 'effluentMonitor/alerts'), limitToLast(maxAlerts));
  const unsubscribe = onValue(
    alertsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const alertsList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        // Sort newest first
        alertsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        callback(alertsList);
      } else {
        callback([]);
      }
    },
    (err) => {
      console.warn('[Firebase] Alerts listener error:', err);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Writes current reading to /effluentMonitor/current and appends to /effluentMonitor/history
 */
export async function writeSensorReading(
  { ph, turbidity, compliance, valve, mode = 'SIMULATION', timestamp = Date.now() },
  shouldLogHistory = true
) {
  const database = getDb();
  if (!database) {
    return false;
  }

  const currentPayload = {
    ph: Number(ph),
    turbidity: Number(turbidity),
    compliance: compliance || 'COMPLIANT',
    valve: valve || 'OPEN',
    mode,
    timestamp
  };

  try {
    // 1. Always update /effluentMonitor/current for live real-time telemetry
    const currentRef = ref(database, 'effluentMonitor/current');
    await set(currentRef, currentPayload);

    // 2. Append to /effluentMonitor/history when requested:
    // (Routine logging: once every 1 min | Event logging: immediately when CLOSED / fault occurs)
    if (shouldLogHistory) {
      const historyRef = ref(database, 'effluentMonitor/history');
      await push(historyRef, currentPayload);
    }

    return true;
  } catch (error) {
    console.error('[Firebase] Failed to write sensor reading:', error);
    throw error;
  }
}

/**
 * Logs a new alert to /effluentMonitor/alerts
 */
export async function writeAlert({ type, message, severity, timestamp = Date.now() }) {
  const database = getDb();
  if (!database) return false;

  try {
    const alertsRef = ref(database, 'effluentMonitor/alerts');
    await push(alertsRef, {
      type,
      message,
      severity,
      timestamp
    });
    return true;
  } catch (err) {
    console.warn('[Firebase] Could not save alert to Firebase:', err);
    return false;
  }
}

/**
 * Saves threshold settings to /effluentMonitor/settings
 */
export async function updateSettings(settings) {
  const database = getDb();
  if (!database) {
    return false;
  }

  try {
    const settingsRef = ref(database, 'effluentMonitor/settings');
    await set(settingsRef, {
      phMin: Number(settings.phMin),
      phMax: Number(settings.phMax),
      turbidityMax: Number(settings.turbidityMax)
    });
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to update settings:', err);
    throw err;
  }
}

/**
 * Clears old telemetry history from /effluentMonitor/history
 */
export async function clearHistory() {
  const database = getDb();
  if (!database) return false;

  try {
    const historyRef = ref(database, 'effluentMonitor/history');
    await set(historyRef, null);
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to clear history:', err);
    return false;
  }
}
