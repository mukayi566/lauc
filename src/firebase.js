import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  /**
   * IMPORTANT: The authDomain MUST match a domain that is:
   * 1. Listed in Firebase Console → Authentication → Settings → Authorized domains
   * 2. Your deployed Vercel URL (e.g. fairviewuniversity.vercel.app) must be added there.
   *
   * Using your custom Vercel domain here prevents the Same-Origin Policy error
   * that occurs when Firebase redirects auth through firebaseapp.com.
   */
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize auth
export const auth = getAuth(app);

/**
 * Initialize Firestore with persistent offline cache.
 * This means the app will still work (read data) when offline or on poor network.
 * Note: If you see "Database '(default)' not found", please go to the 
 * Firebase Console → Firestore Database and click "Create database".
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Secondary app instance — used to create users without logging the admin out
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export const storage = getStorage(app);

export default app;
