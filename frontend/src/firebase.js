// src/firebase.js
// ─────────────────────────────────────────────────────────────────
// Initializes the Firebase app once.
// All values come from your Firebase Console:
//   Project Settings → General → Your apps → Firebase SDK snippet
//
// Put these in your .env file (Create React App uses VITE_ prefix):
//   VITE_FIREBASE_API_KEY=...
//   VITE_FIREBASE_AUTH_DOMAIN=...
//   VITE_FIREBASE_PROJECT_ID=...
// ─────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// initializeApp is safe to call once — Firebase handles duplicate calls
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;