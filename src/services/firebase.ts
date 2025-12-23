// Firebase Configuration for ORBIT

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
    return !!(
        firebaseConfig.apiKey &&
        firebaseConfig.apiKey !== "" &&
        firebaseConfig.projectId &&
        firebaseConfig.projectId !== ""
    );
};

// Initialize Firebase only if configured
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

try {
    if (isFirebaseConfigured()) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log('✅ Firebase initialized successfully');
    } else {
        console.warn('⚠️ Firebase not configured. Cloud features disabled. Set VITE_FIREBASE_* env variables.');
    }
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

export { app, auth, db };
export default app;
