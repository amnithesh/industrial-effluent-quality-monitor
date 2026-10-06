import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push } from 'firebase/database';
import { firebaseConfig } from '../src/firebase/firebaseConfig.js';

console.log('Testing live Firebase RTDB connection...');
console.log('Database URL:', firebaseConfig.databaseURL);

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function seedInitialData() {
  try {
    // 1. Write default settings
    console.log('Writing /effluentMonitor/settings ...');
    await set(ref(db, 'effluentMonitor/settings'), {
      phMin: 6.0,
      phMax: 9.0,
      turbidityMax: 50.0
    });
    console.log('Settings written successfully!');

    // 2. Write initial current reading
    console.log('Writing /effluentMonitor/current ...');
    const timestamp = Date.now();
    await set(ref(db, 'effluentMonitor/current'), {
      ph: 7.21,
      turbidity: 18.4,
      compliance: 'COMPLIANT',
      valve: 'OPEN',
      mode: 'SIMULATION',
      timestamp
    });
    console.log('Current reading written successfully!');

    // 3. Write initial history entry
    console.log('Writing /effluentMonitor/history ...');
    await push(ref(db, 'effluentMonitor/history'), {
      ph: 7.21,
      turbidity: 18.4,
      compliance: 'COMPLIANT',
      valve: 'OPEN',
      mode: 'SIMULATION',
      timestamp
    });
    console.log('History entry written successfully!');

    console.log('\nSUCCESS! Your Firebase Realtime Database is live and populated.');
    process.exit(0);
  } catch (error) {
    console.error('Firebase write failed:', error);
    process.exit(1);
  }
}

seedInitialData();
