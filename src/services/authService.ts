// Authentication Service for ORBIT
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import type { User, UserCredential, Unsubscribe } from 'firebase/auth';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import type { Game, AppSettings } from '../types';

// User data structure in Firestore
export interface UserData {
    uid: string;
    email: string;
    username: string;
    avatar: string | null;
    createdAt: any;
    lastSeen: any;
}

class AuthService {
    private currentUser: User | null = null;

    constructor() {
        // Only listen if Firebase is configured
        if (auth) {
            onAuthStateChanged(auth, (user) => {
                this.currentUser = user;
            });
        }
    }

    // Check if Firebase is available
    isAvailable(): boolean {
        return isFirebaseConfigured() && !!auth;
    }

    // Get current user
    getCurrentUser(): User | null {
        return auth?.currentUser || null;
    }

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return !!auth?.currentUser;
    }

    // Register with email and password
    async register(email: string, password: string, username: string): Promise<UserCredential> {
        if (!auth) throw new Error('Firebase no configurado');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Update profile with username
            await updateProfile(userCredential.user, {
                displayName: username
            });

            // Create user document in Firestore (non-blocking)
            // Don't await - let it run in background to not block the registration
            this.createUserDocument(userCredential.user, username).catch((err) => {
                console.warn('⚠️ Could not create user document in Firestore:', err.message);
            });

            return userCredential;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    // Login with email and password
    async login(email: string, password: string): Promise<UserCredential> {
        if (!auth) throw new Error('Firebase no configurado');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Update last seen (non-blocking)
            this.updateLastSeen(userCredential.user.uid).catch((err) => {
                console.warn('⚠️ Could not update last seen in Firestore:', err.message);
            });

            return userCredential;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    // Login with Google
    async loginWithGoogle(): Promise<UserCredential> {
        if (!auth) throw new Error('Firebase no configurado');

        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);

            // Update/create Firestore document (non-blocking)
            if (db) {
                (async () => {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
                        if (!userDoc.exists()) {
                            await this.createUserDocument(
                                userCredential.user,
                                userCredential.user.displayName || 'Usuario'
                            );
                        } else {
                            await this.updateLastSeen(userCredential.user.uid);
                        }
                    } catch (err: any) {
                        console.warn('⚠️ Could not sync user document with Firestore:', err.message);
                    }
                })();
            }

            return userCredential;
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    // Logout
    async logout(): Promise<void> {
        if (!auth) throw new Error('Firebase no configurado');

        try {
            await signOut(auth);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    // Send password reset email
    async resetPassword(email: string): Promise<void> {
        if (!auth) throw new Error('Firebase no configurado');

        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            throw this.handleAuthError(error);
        }
    }

    // Create user document in Firestore
    private async createUserDocument(user: User, username: string): Promise<void> {
        if (!db) return;

        const userRef = doc(db, 'users', user.uid);
        const userData: UserData = {
            uid: user.uid,
            email: user.email || '',
            username: username,
            avatar: user.photoURL,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp()
        };

        await setDoc(userRef, userData);

        // Create empty collections for user data
        const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
        await setDoc(profileRef, {
            bio: '',
            status: 'online',
            stats: {
                gamesCompleted: 0,
                totalPlaytime: 0,
                achievementsUnlocked: 0
            }
        });
    }

    // Update last seen
    private async updateLastSeen(uid: string): Promise<void> {
        if (!db) return;

        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            lastSeen: serverTimestamp()
        });
    }

    // Get user data from Firestore
    async getUserData(uid: string): Promise<UserData | null> {
        if (!db) return null;

        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            return userDoc.data() as UserData;
        }
        return null;
    }

    // Update user profile
    async updateUserProfile(uid: string, data: Partial<UserData>): Promise<void> {
        if (!db) return;

        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, data);
    }

    // Sync games to cloud
    async syncGamesToCloud(uid: string, games: Game[]): Promise<void> {
        if (!db) return;

        const gamesRef = doc(db, 'users', uid, 'library', 'games');
        await setDoc(gamesRef, {
            games,
            updatedAt: serverTimestamp()
        });
    }

    // Get games from cloud
    async getGamesFromCloud(uid: string): Promise<Game[]> {
        if (!db) return [];

        const gamesRef = doc(db, 'users', uid, 'library', 'games');
        const gamesDoc = await getDoc(gamesRef);

        if (gamesDoc.exists()) {
            return gamesDoc.data().games || [];
        }
        return [];
    }

    // Sync settings to cloud
    async syncSettingsToCloud(uid: string, settings: AppSettings): Promise<void> {
        if (!db) return;

        const settingsRef = doc(db, 'users', uid, 'settings', 'data');
        await setDoc(settingsRef, {
            ...settings,
            updatedAt: serverTimestamp()
        });
    }

    // Get settings from cloud
    async getSettingsFromCloud(uid: string): Promise<AppSettings | null> {
        if (!db) return null;

        const settingsRef = doc(db, 'users', uid, 'settings', 'data');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            delete data.updatedAt;
            return data as AppSettings;
        }
        return null;
    }

    // Handle Firebase auth errors
    private handleAuthError(error: any): Error {
        const errorMessages: Record<string, string> = {
            'auth/email-already-in-use': 'Este email ya está registrado',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
            'auth/invalid-email': 'Email inválido',
            'auth/user-not-found': 'Usuario no encontrado',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/popup-closed-by-user': 'Inicio de sesión cancelado',
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
        };

        const message = errorMessages[error.code] || error.message || 'Error de autenticación';
        return new Error(message);
    }

    // Subscribe to auth state changes
    onAuthStateChange(callback: (user: User | null) => void): Unsubscribe {
        if (!auth) {
            // Return a no-op unsubscribe function
            callback(null);
            return () => { };
        }
        return onAuthStateChanged(auth, callback);
    }
}

export const authService = new AuthService();
export default authService;
