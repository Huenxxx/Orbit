import { create } from 'zustand';
import { cloudSyncService } from '../services/cloudSyncService';
import type { SyncStatus, CloudSyncState } from '../services/cloudSyncService';
import { authService } from '../services/authService';
import type { Game, AppSettings } from '../types';

interface CloudSyncStoreState {
    // Sync state
    status: SyncStatus;
    lastSyncTime: Date | null;
    pendingChanges: boolean;
    error: string | null;
    isInitialized: boolean;
    autoSyncEnabled: boolean;

    // Actions
    initialize: (uid: string, games: Game[], settings: AppSettings) => Promise<{ games: Game[]; settings: AppSettings }>;
    syncGames: (games: Game[]) => Promise<void>;
    syncSettings: (settings: AppSettings) => Promise<void>;
    forceSync: (games: Game[], settings: AppSettings) => Promise<boolean>;
    pullFromCloud: () => Promise<{ games: Game[] | null; settings: AppSettings | null }>;
    setAutoSync: (enabled: boolean) => void;
    clearError: () => void;
    cleanup: () => void;
}

export const useCloudSyncStore = create<CloudSyncStoreState>((set, get) => {
    // Subscribe to sync service state changes
    let unsubscribe: (() => void) | null = null;

    const updateFromService = (state: CloudSyncState) => {
        set({
            status: state.status,
            lastSyncTime: state.lastSyncTime,
            pendingChanges: state.pendingChanges,
            error: state.error
        });
    };

    return {
        // Initial state
        status: 'idle',
        lastSyncTime: null,
        pendingChanges: false,
        error: null,
        isInitialized: false,
        autoSyncEnabled: true,

        // Initialize sync and perform initial merge
        initialize: async (uid, games, settings) => {
            if (!cloudSyncService.isAvailable()) {
                set({ isInitialized: true, status: 'offline' });
                return { games, settings };
            }

            // Subscribe to state changes
            unsubscribe = cloudSyncService.subscribe(updateFromService);

            // Perform full sync
            const result = await cloudSyncService.fullSync(uid, games, settings);

            set({ isInitialized: true });

            return {
                games: result.games,
                settings: result.settings
            };
        },

        // Sync games to cloud (debounced)
        syncGames: async (games) => {
            if (!get().autoSyncEnabled) return;

            const user = authService.getCurrentUser();
            if (!user) return;

            set({ pendingChanges: true });
            await cloudSyncService.syncGamesToCloud(user.uid, games);
        },

        // Sync settings to cloud (debounced)
        syncSettings: async (settings) => {
            if (!get().autoSyncEnabled) return;

            const user = authService.getCurrentUser();
            if (!user) return;

            await cloudSyncService.syncSettingsToCloud(user.uid, settings);
        },

        // Force immediate sync
        forceSync: async (games, settings) => {
            const user = authService.getCurrentUser();
            if (!user) return false;

            return await cloudSyncService.forceSyncNow(user.uid, games, settings);
        },

        // Pull latest data from cloud
        pullFromCloud: async () => {
            const user = authService.getCurrentUser();
            if (!user) return { games: null, settings: null };

            const [games, settings] = await Promise.all([
                cloudSyncService.getGamesFromCloud(user.uid),
                cloudSyncService.getSettingsFromCloud(user.uid)
            ]);

            return { games, settings };
        },

        // Toggle auto-sync
        setAutoSync: (enabled) => {
            set({ autoSyncEnabled: enabled });
        },

        // Clear error
        clearError: () => {
            set({ error: null });
        },

        // Cleanup subscriptions
        cleanup: () => {
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
            cloudSyncService.cleanup();
            set({ isInitialized: false });
        }
    };
});

export default useCloudSyncStore;
