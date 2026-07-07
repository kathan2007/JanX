// firebase.js — JanX Firebase SDK initialization
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase config — reads from Vite env vars (fallback to hardcoded for local dev)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyBgtv8Uj8w2AQN83TobEj8IAE8t5E7K9c0",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "janx-501309.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "janx-501309",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "janx-501309.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "3165489456",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:3165489456:web:dbb2518aef6ce5c92f20f5",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth — required by App.jsx, ResidentPortal.jsx, AuthModal.jsx
export const auth = getAuth(app);

export default app;