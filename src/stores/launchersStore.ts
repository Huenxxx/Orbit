import { create } from 'zustand';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

// ============================================
// TYPES
// ============================================

export type Platform = 'steam' | 'epic' | 'gog' | 'ea' | 'ubisoft';

export interface InstalledGame {
    id: string;
    name: string;
    installPath: string;
    executable?: string;
    platform: Platform;
    isInstalled: boolean;
    sizeOnDisk?: number;
    // Optional metadata
    headerUrl?: string;
    capsuleUrl?: string;
    namespace?: string;
    version?: string;
}

export interface LauncherInfo {
    installed: boolean;
    launcherPath: string | null;
    games: InstalledGame[];
    gameCount: number;
    launcherType?: string; // For EA: 'ea' or 'origin'
}

interface AllLaunchersInfo {
    epic: LauncherInfo;
    gog: LauncherInfo;
    ea: LauncherInfo;
    ubisoft: LauncherInfo;
    totalGames: number;
}

interface LaunchersState {
    // Launcher info
    epicInfo: LauncherInfo | null;
    gogInfo: LauncherInfo | null;
    eaInfo: LauncherInfo | null;
    ubisoftInfo: LauncherInfo | null;

    // All games from all platforms
    allInstalledGames: InstalledGame[];

    // Loading states
    isLoading: boolean;
    isLoadingEpic: boolean;
    isLoadingGog: boolean;
    isLoadingEa: boolean;
    isLoadingUbisoft: boolean;

    error: string | null;

    // Actions
    detectAllLaunchers: () => Promise<void>;
    detectEpic: () => Promise<void>;
    detectGog: () => Promise<void>;
    detectEa: () => Promise<void>;
    detectUbisoft: () => Promise<void>;
    launchGame: (platform: Platform, gameId: string) => Promise<boolean>;
    refreshAll: () => Promise<void>;
}

// Storage key
const STORAGE_KEY_LAUNCHERS = 'orbit-launchers-cache';

export const useLaunchersStore = create<LaunchersState>((set, get) => ({
    epicInfo: null,
    gogInfo: null,
    eaInfo: null,
    ubisoftInfo: null,
    allInstalledGames: [],
    isLoading: false,
    isLoadingEpic: false,
    isLoadingGog: false,
    isLoadingEa: false,
    isLoadingUbisoft: false,
    error: null,

    // Detect all launchers at once
    detectAllLaunchers: async () => {
        set({ isLoading: true, error: null });

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) {
                set({ isLoading: false, error: 'Solo disponible en la aplicación de escritorio' });
                return;
            }

            const result = await ipcRenderer.invoke('launchers-get-all-info') as AllLaunchersInfo;

            // Combine all games
            const allGames: InstalledGame[] = [
                ...result.epic.games,
                ...result.gog.games,
                ...result.ea.games,
                ...result.ubisoft.games
            ];

            set({
                epicInfo: result.epic,
                gogInfo: result.gog,
                eaInfo: result.ea,
                ubisoftInfo: result.ubisoft,
                allInstalledGames: allGames,
                isLoading: false,
                error: null
            });

            // Cache the results
            localStorage.setItem(STORAGE_KEY_LAUNCHERS, JSON.stringify({
                epic: result.epic,
                gog: result.gog,
                ea: result.ea,
                ubisoft: result.ubisoft,
                allGames,
                timestamp: Date.now()
            }));

        } catch (error) {
            console.error('Error detecting launchers:', error);
            set({ isLoading: false, error: (error as Error).message });
        }
    },

    // Detect Epic Games
    detectEpic: async () => {
        set({ isLoadingEpic: true });

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) return;

            const result = await ipcRenderer.invoke('epic-get-info') as LauncherInfo;

            set((state) => ({
                epicInfo: result,
                allInstalledGames: [
                    ...state.allInstalledGames.filter(g => g.platform !== 'epic'),
                    ...result.games
                ],
                isLoadingEpic: false
            }));

        } catch (error) {
            console.error('Error detecting Epic:', error);
            set({ isLoadingEpic: false });
        }
    },

    // Detect GOG Galaxy
    detectGog: async () => {
        set({ isLoadingGog: true });

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) return;

            const result = await ipcRenderer.invoke('gog-get-info') as LauncherInfo;

            set((state) => ({
                gogInfo: result,
                allInstalledGames: [
                    ...state.allInstalledGames.filter(g => g.platform !== 'gog'),
                    ...result.games
                ],
                isLoadingGog: false
            }));

        } catch (error) {
            console.error('Error detecting GOG:', error);
            set({ isLoadingGog: false });
        }
    },

    // Detect EA App
    detectEa: async () => {
        set({ isLoadingEa: true });

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) return;

            const result = await ipcRenderer.invoke('ea-get-info') as LauncherInfo;

            set((state) => ({
                eaInfo: result,
                allInstalledGames: [
                    ...state.allInstalledGames.filter(g => g.platform !== 'ea'),
                    ...result.games
                ],
                isLoadingEa: false
            }));

        } catch (error) {
            console.error('Error detecting EA:', error);
            set({ isLoadingEa: false });
        }
    },

    // Detect Ubisoft Connect
    detectUbisoft: async () => {
        set({ isLoadingUbisoft: true });

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) return;

            const result = await ipcRenderer.invoke('ubisoft-get-info') as LauncherInfo;

            set((state) => ({
                ubisoftInfo: result,
                allInstalledGames: [
                    ...state.allInstalledGames.filter(g => g.platform !== 'ubisoft'),
                    ...result.games
                ],
                isLoadingUbisoft: false
            }));

        } catch (error) {
            console.error('Error detecting Ubisoft:', error);
            set({ isLoadingUbisoft: false });
        }
    },

    // Launch a game from any platform
    launchGame: async (platform: Platform, gameId: string) => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) {
                throw new Error('Solo disponible en la aplicación de escritorio');
            }

            const result = await ipcRenderer.invoke('launcher-launch-game', { platform, gameId });
            return result.success;
        } catch (error) {
            console.error('Error launching game:', error);
            return false;
        }
    },

    // Refresh all launcher data
    refreshAll: async () => {
        await get().detectAllLaunchers();
    }
}));
