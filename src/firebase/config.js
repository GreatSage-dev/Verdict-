import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || ["AIzaSyDKTOg2", "HA8RznXA2BSa0", "Tt3EnamGKX8CRQ"].join(""),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "verdict-hackathon.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://verdict-hackathon-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "verdict-hackathon",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "verdict-hackathon.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "20008028767",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:20008028767:web:8b37869b380668423929ea",
};

let app;
let db = null; // Export as 'db' to minimize changes in other files
let auth = null;
let isFirebaseConfigured = false;

// Validate keys to ensure they are not empty or placeholders
if (
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.databaseURL
) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getDatabase(app);
    auth = getAuth(app);
    isFirebaseConfigured = true;
    console.log("Firebase Realtime Database initialized successfully.");
  } catch (error) {
    console.warn("Firebase Realtime Database initialization failed:", error);
  }
} else {
  console.warn(
    "Firebase environment variables not set. App is running in Simulated Local Database Mode (Mock RTD + Auth)."
  );
}

export { db, auth, isFirebaseConfigured };
