// Authentication Store
import { create } from 'zustand';
import type { User } from 'firebase/auth';
import { authService } from '../services/authService';
import type { UserData } from '../services/authService';

interface AuthState {
    user: User | null;
    userData: UserData | null;
    isLoading: boolean;
    isInitialized: boolean;
    isAvailable: boolean;
    error: string | null;

    // Actions
    initialize: () => void;
    register: (email: string, password: string, username: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateProfile: (data: Partial<UserData>) => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    userData: null,
    isLoading: false,
    isInitialized: false,
    isAvailable: authService.isAvailable(),
    error: null,

    initialize: () => {
        // Check if Firebase is available
        if (!authService.isAvailable()) {
            set({ isInitialized: true, isAvailable: false });
            return;
        }

        // Subscribe to auth state changes
        authService.onAuthStateChange(async (user) => {
            if (user) {
                // User is signed in, try to fetch additional data
                let userData = null;
                try {
                    userData = await authService.getUserData(user.uid);
                } catch (err: any) {
                    console.warn('⚠️ Could not fetch user data from Firestore:', err.message);
                }
                set({ user, userData, isInitialized: true, isLoading: false });
            } else {
                // User is signed out
                set({ user: null, userData: null, isInitialized: true, isLoading: false });
            }
        });
    },

    register: async (email, password, username) => {
        if (!authService.isAvailable()) {
            set({ error: 'Firebase no está configurado. Configura las credenciales para usar esta función.' });
            throw new Error('Firebase no configurado');
        }

        set({ isLoading: true, error: null });
        try {
            await authService.register(email, password, username);
            set({ isLoading: false });
            // Auth state listener will update the user
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    login: async (email, password) => {
        if (!authService.isAvailable()) {
            set({ error: 'Firebase no está configurado. Configura las credenciales para usar esta función.' });
            throw new Error('Firebase no configurado');
        }

        set({ isLoading: true, error: null });
        try {
            await authService.login(email, password);
            set({ isLoading: false });
            // Auth state listener will update the user
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    loginWithGoogle: async () => {
        if (!authService.isAvailable()) {
            set({ error: 'Firebase no está configurado. Configura las credenciales para usar esta función.' });
            throw new Error('Firebase no configurado');
        }

        set({ isLoading: true, error: null });
        try {
            await authService.loginWithGoogle();
            set({ isLoading: false });
            // Auth state listener will update the user
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    logout: async () => {
        if (!authService.isAvailable()) return;

        set({ isLoading: true, error: null });
        try {
            await authService.logout();
            set({ user: null, userData: null, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    resetPassword: async (email) => {
        if (!authService.isAvailable()) {
            set({ error: 'Firebase no está configurado' });
            throw new Error('Firebase no configurado');
        }

        set({ isLoading: true, error: null });
        try {
            await authService.resetPassword(email);
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    updateProfile: async (data) => {
        const { user } = get();
        if (!user || !authService.isAvailable()) return;

        set({ isLoading: true, error: null });
        try {
            await authService.updateUserProfile(user.uid, data);
            const userData = await authService.getUserData(user.uid);
            set({ userData, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    clearError: () => set({ error: null })
}));
