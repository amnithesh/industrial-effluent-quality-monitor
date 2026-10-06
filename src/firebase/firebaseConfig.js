/**
 * Firebase Configuration for Industrial Effluent Quality Monitor.
 *
 * REPLACE THESE PLACEHOLDERS WITH YOUR ACTUAL FIREBASE PROJECT CONFIGURATION:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Create or open your project.
 * 3. Go to Project Settings -> General -> Your apps -> Web app (</>).
 * 4. Copy your firebaseConfig credentials and paste them below.
 * 5. Enable "Realtime Database" from the left menu (set rules to allow read/write for development).
 */

export const firebaseConfig = {
  apiKey: "AIzaSyCsObqJMp5P9PI7csO2Iw0zE2MlCrNi7xU",
  authDomain: "industry-monitor-e8e52.firebaseapp.com",
  databaseURL: "https://industry-monitor-e8e52-default-rtdb.firebaseio.com",
  projectId: "industry-monitor-e8e52",
  storageBucket: "industry-monitor-e8e52.firebasestorage.app",
  messagingSenderId: "220699064686",
  appId: "1:220699064686:web:8bbb5a474ce788047ee97f"
};

/**
 * Checks whether the Firebase credentials have been configured
 * or are still using default placeholder values.
 */
export function isFirebaseConfigured() {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.databaseURL !== "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com" &&
    !firebaseConfig.apiKey.includes("YOUR_")
  );
}
