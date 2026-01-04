// Cloud Sync Service for ORBIT
// Handles synchronization of games, settings, and user data with Firebase

import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { Game, AppSettings } from '../types';

// Sync status types
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface CloudSyncState {
    status: SyncStatus;
    lastSyncTime: Date | null;
    pendingChanges: boolean;
    error: string | null;
}

export interface CloudData {
    games: Game[];
    settings: AppSettings;
    lastModified: Date;
}

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
    let timeoutId: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
}

class CloudSyncService {
    private syncState: CloudSyncState = {
        status: 'idle',
        lastSyncTime: null,
        pendingChanges: false,
        error: null
    };

    private listeners: Set<(state: CloudSyncState) => void> = new Set();
    private gamesUnsubscribe: Unsubscribe | null = null;
    private settingsUnsubscribe: Unsubscribe | null = null;
    private syncQueue: Promise<void> = Promise.resolve();
    private isOnline: boolean = navigator.onLine;

    constructor() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateState({ status: 'idle' });
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateState({ status: 'offline' });
        });
    }

    // Check if cloud sync is available
    isAvailable(): boolean {
        return isFirebaseConfigured() && !!db;
    }

    // Get current sync state
    getState(): CloudSyncState {
        return { ...this.syncState };
    }

    // Subscribe to state changes
    subscribe(callback: (state: CloudSyncState) => void): () => void {
        this.listeners.add(callback);
        callback(this.syncState);
        return () => this.listeners.delete(callback);
    }

    // Update state and notify listeners
    private updateState(updates: Partial<CloudSyncState>) {
        this.syncState = { ...this.syncState, ...updates };
        this.listeners.forEach(cb => cb(this.syncState));
    }

    // =====================
    // GAMES SYNC
    // =====================

    // Sync games to cloud with debouncing
    syncGamesToCloud = debounce(async (uid: string, games: Game[]): Promise<boolean> => {
        if (!this.isAvailable() || !uid) return false;

        this.updateState({ status: 'syncing', pendingChanges: true });

        try {
            const gamesRef = doc(db!, 'users', uid, 'library', 'games');
            await setDoc(gamesRef, {
                games,
                lastModified: serverTimestamp(),
                deviceId: this.getDeviceId(),
                version: 1
            });

            this.updateState({
                status: 'synced',
                lastSyncTime: new Date(),
                pendingChanges: false,
                error: null
            });

            console.log('✅ Games synced to cloud:', games.length, 'games');
            return true;
        } catch (error: any) {
            console.error('❌ Failed to sync games:', error);
            this.updateState({
                status: 'error',
                error: error.message || 'Error al sincronizar juegos'
            });
            return false;
        }
    }, 2000); // 2 second debounce

    // Get games from cloud
    async getGamesFromCloud(uid: string): Promise<Game[] | null> {
        if (!this.isAvailable() || !uid) return null;

        try {
            const gamesRef = doc(db!, 'users', uid, 'library', 'games');
            const gamesDoc = await getDoc(gamesRef);

            if (gamesDoc.exists()) {
                const data = gamesDoc.data();
                return data.games || [];
            }
            return [];
        } catch (error) {
            console.error('❌ Failed to get games from cloud:', error);
            return null;
        }
    }

    // Listen for games changes in real-time
    subscribeToGames(uid: string, callback: (games: Game[]) => void): () => void {
        if (!this.isAvailable() || !uid) {
            return () => { };
        }

        // Unsubscribe from previous listener
        if (this.gamesUnsubscribe) {
            this.gamesUnsubscribe();
        }

        const gamesRef = doc(db!, 'users', uid, 'library', 'games');
        this.gamesUnsubscribe = onSnapshot(gamesRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // Only propagate changes from other devices
                if (data.deviceId !== this.getDeviceId()) {
                    console.log('📥 Received games update from cloud');
                    callback(data.games || []);
                }
            }
        }, (error) => {
            console.error('❌ Games subscription error:', error);
            this.updateState({ status: 'error', error: error.message });
        });

        return () => {
            if (this.gamesUnsubscribe) {
                this.gamesUnsubscribe();
                this.gamesUnsubscribe = null;
            }
        };
    }

    // =====================
    // SETTINGS SYNC
    // =====================

    // Sync settings to cloud
    syncSettingsToCloud = debounce(async (uid: string, settings: AppSettings): Promise<boolean> => {
        if (!this.isAvailable() || !uid) return false;

        try {
            const settingsRef = doc(db!, 'users', uid, 'settings', 'data');
            await setDoc(settingsRef, {
                ...settings,
                lastModified: serverTimestamp(),
                deviceId: this.getDeviceId()
            });

            console.log('✅ Settings synced to cloud');
            return true;
        } catch (error: any) {
            console.error('❌ Failed to sync settings:', error);
            return false;
        }
    }, 1000);

    // Get settings from cloud
    async getSettingsFromCloud(uid: string): Promise<AppSettings | null> {
        if (!this.isAvailable() || !uid) return null;

        try {
            const settingsRef = doc(db!, 'users', uid, 'settings', 'data');
            const settingsDoc = await getDoc(settingsRef);

            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                // Remove metadata fields
                const { lastModified, deviceId, ...settings } = data;
                return settings as AppSettings;
            }
            return null;
        } catch (error) {
            console.error('❌ Failed to get settings from cloud:', error);
            return null;
        }
    }

    // Listen for settings changes
    subscribeToSettings(uid: string, callback: (settings: AppSettings) => void): () => void {
        if (!this.isAvailable() || !uid) {
            return () => { };
        }

        if (this.settingsUnsubscribe) {
            this.settingsUnsubscribe();
        }

        const settingsRef = doc(db!, 'users', uid, 'settings', 'data');
        this.settingsUnsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.deviceId !== this.getDeviceId()) {
                    console.log('📥 Received settings update from cloud');
                    const { lastModified, deviceId, ...settings } = data;
                    callback(settings as AppSettings);
                }
            }
        });

        return () => {
            if (this.settingsUnsubscribe) {
                this.settingsUnsubscribe();
                this.settingsUnsubscribe = null;
            }
        };
    }

    // =====================
    // MERGE STRATEGIES
    // =====================

    // Merge local games with cloud games (conflict resolution)
    mergeGames(localGames: Game[], cloudGames: Game[]): Game[] {
        const mergedMap = new Map<string, Game>();

        // Add cloud games first
        cloudGames.forEach(game => {
            mergedMap.set(game.id, game);
        });

        // Merge local games (local wins for newer lastPlayed)
        localGames.forEach(localGame => {
            const cloudGame = mergedMap.get(localGame.id);

            if (!cloudGame) {
                // Game only exists locally, add it
                mergedMap.set(localGame.id, localGame);
            } else {
                // Game exists in both - merge by keeping the one with latest activity
                const localDate = new Date(localGame.lastPlayed || localGame.dateAdded);
                const cloudDate = new Date(cloudGame.lastPlayed || cloudGame.dateAdded);

                if (localDate >= cloudDate) {
                    // Local is newer, use local but merge playtime
                    mergedMap.set(localGame.id, {
                        ...localGame,
                        playtime: Math.max(localGame.playtime, cloudGame.playtime)
                    });
                } else {
                    // Cloud is newer, use cloud but merge playtime
                    mergedMap.set(localGame.id, {
                        ...cloudGame,
                        playtime: Math.max(localGame.playtime, cloudGame.playtime)
                    });
                }
            }
        });

        return Array.from(mergedMap.values());
    }

    // Merge settings (local wins for most settings)
    mergeSettings(localSettings: AppSettings, cloudSettings: AppSettings): AppSettings {
        // For settings, generally prefer local as user is actively using this device
        // But some settings like theme might want to sync
        return {
            ...cloudSettings,
            ...localSettings,
            // Always use cloud for these (they affect all devices)
            language: cloudSettings.language || localSettings.language,
        };
    }

    // =====================
    // FULL SYNC
    // =====================

    // Perform a full sync with the cloud
    async fullSync(uid: string, localGames: Game[], localSettings: AppSettings): Promise<{
        games: Game[];
        settings: AppSettings;
        merged: boolean;
    }> {
        if (!this.isAvailable()) {
            return { games: localGames, settings: localSettings, merged: false };
        }

        this.updateState({ status: 'syncing' });

        try {
            // Get cloud data
            const [cloudGames, cloudSettings] = await Promise.all([
                this.getGamesFromCloud(uid),
                this.getSettingsFromCloud(uid)
            ]);

            let finalGames = localGames;
            let finalSettings = localSettings;
            let merged = false;

            // Merge games if cloud has data
            if (cloudGames && cloudGames.length > 0) {
                finalGames = this.mergeGames(localGames, cloudGames);
                merged = true;
            }

            // Merge settings if cloud has data
            if (cloudSettings) {
                finalSettings = this.mergeSettings(localSettings, cloudSettings);
                merged = true;
            }

            // Upload merged data back to cloud
            await Promise.all([
                this.syncGamesToCloud(uid, finalGames),
                this.syncSettingsToCloud(uid, finalSettings)
            ]);

            this.updateState({
                status: 'synced',
                lastSyncTime: new Date(),
                pendingChanges: false,
                error: null
            });

            console.log('✅ Full sync completed', { merged, gamesCount: finalGames.length });

            return { games: finalGames, settings: finalSettings, merged };
        } catch (error: any) {
            console.error('❌ Full sync failed:', error);
            this.updateState({
                status: 'error',
                error: error.message || 'Error en la sincronización'
            });
            return { games: localGames, settings: localSettings, merged: false };
        }
    }

    // =====================
    // HELPERS
    // =====================

    // Get unique device ID
    private getDeviceId(): string {
        let deviceId = localStorage.getItem('orbit-device-id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('orbit-device-id', deviceId);
        }
        return deviceId;
    }

    // Force sync now
    async forceSyncNow(uid: string, games: Game[], settings: AppSettings): Promise<boolean> {
        if (!this.isAvailable()) return false;

        this.updateState({ status: 'syncing' });

        try {
            await Promise.all([
                setDoc(doc(db!, 'users', uid, 'library', 'games'), {
                    games,
                    lastModified: serverTimestamp(),
                    deviceId: this.getDeviceId(),
                    version: 1
                }),
                setDoc(doc(db!, 'users', uid, 'settings', 'data'), {
                    ...settings,
                    lastModified: serverTimestamp(),
                    deviceId: this.getDeviceId()
                })
            ]);

            this.updateState({
                status: 'synced',
                lastSyncTime: new Date(),
                pendingChanges: false,
                error: null
            });

            return true;
        } catch (error: any) {
            this.updateState({ status: 'error', error: error.message });
            return false;
        }
    }

    // Cleanup subscriptions
    cleanup() {
        if (this.gamesUnsubscribe) {
            this.gamesUnsubscribe();
            this.gamesUnsubscribe = null;
        }
        if (this.settingsUnsubscribe) {
            this.settingsUnsubscribe();
            this.settingsUnsubscribe = null;
        }
        this.listeners.clear();
    }
}

export const cloudSyncService = new CloudSyncService();
export default cloudSyncService;
