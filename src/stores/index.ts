import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
    Game,
    GameStatus,
    GamePlatform,
    UserProfile,
    UserStatus,
    AppSettings,
    ViewMode,
    SortOption,
    FilterOptions,
    Achievement
} from '../types';
import { cloudSyncService } from '../services/cloudSyncService';
import { authService } from '../services/authService';
import { gameMatchingService } from '../services/gameMatchingService';

// Helper to check if we're in Electron
const isElectron = typeof window !== 'undefined' && window.require;

// Games Store
interface GamesState {
    games: Game[];
    isLoading: boolean;
    error: string | null;
    viewMode: ViewMode;
    sortBy: SortOption;
    sortOrder: 'asc' | 'desc';
    filters: FilterOptions;
    selectedGame: Game | null;

    // Actions
    loadGames: () => Promise<void>;
    addGame: (game: Omit<Game, 'id' | 'dateAdded'>) => Promise<void>;
    updateGame: (id: string, updates: Partial<Game>) => Promise<void>;
    deleteGame: (id: string) => Promise<void>;
    setViewMode: (mode: ViewMode) => void;
    setSortBy: (sort: SortOption) => void;
    setSortOrder: (order: 'asc' | 'desc') => void;
    setFilters: (filters: Partial<FilterOptions>) => void;
    resetFilters: () => void;
    setSelectedGame: (game: Game | null) => void;
    toggleFavorite: (id: string) => Promise<void>;
    updatePlaytime: (id: string, minutes: number) => Promise<void>;
    launchGame: (id: string) => Promise<{ success: boolean; error?: string }>;
    // Game matching
    rematchGame: (id: string) => Promise<void>;
    matchAllUnmatchedGames: () => Promise<void>;
}

const defaultFilters: FilterOptions = {
    platforms: [],
    genres: [],
    status: [],
    tags: [],
    search: ''
};

export const useGamesStore = create<GamesState>((set, get) => ({
    games: [],
    isLoading: false,
    error: null,
    viewMode: 'grid',
    sortBy: 'lastPlayed',
    sortOrder: 'desc',
    filters: defaultFilters,
    selectedGame: null,

    loadGames: async () => {
        set({ isLoading: true, error: null });
        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                const games = await ipcRenderer.invoke('get-games');
                set({ games: games || [], isLoading: false });
            } else {
                // Fallback for web dev
                const stored = localStorage.getItem('orbit-games');
                set({ games: stored ? JSON.parse(stored) : [], isLoading: false });
            }
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    addGame: async (gameData) => {
        // Create base game
        const baseGame: Game = {
            ...gameData,
            id: uuidv4(),
            dateAdded: new Date().toISOString()
        };

        // Add game immediately (optimistic update)
        let updatedGames = [...get().games, baseGame];
        set({ games: updatedGames });

        // Try to auto-match and enrich the game in background
        try {
            const enrichedGame = await gameMatchingService.autoMatchAndEnrich(baseGame);

            // Update with enriched data if matched
            if (enrichedGame.rawgId) {
                updatedGames = get().games.map(g =>
                    g.id === baseGame.id ? { ...g, ...enrichedGame, id: baseGame.id, dateAdded: baseGame.dateAdded } : g
                );
                set({ games: updatedGames });
                console.log(`✅ Game auto-matched: ${enrichedGame.title} (RAWG ID: ${enrichedGame.rawgId})`);
            }
        } catch (error) {
            console.warn('Auto-match failed, using original data:', error);
        }

        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-games', get().games);
            } else {
                localStorage.setItem('orbit-games', JSON.stringify(get().games));
            }

            // Sync to cloud if user is authenticated
            const user = authService.getCurrentUser();
            if (user) {
                cloudSyncService.syncGamesToCloud(user.uid, get().games);
            }
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    updateGame: async (id, updates) => {
        const currentGames = get().games;
        const updatedGames = currentGames.map(game =>
            game.id === id ? { ...game, ...updates } : game
        );

        // Also update selectedGame if it's the one being modified
        const currentSelected = get().selectedGame;
        if (currentSelected && currentSelected.id === id) {
            set({ selectedGame: { ...currentSelected, ...updates } });
        }

        set({ games: updatedGames });

        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-games', updatedGames);
            } else {
                localStorage.setItem('orbit-games', JSON.stringify(updatedGames));
            }

            // Sync to cloud if user is authenticated
            const user = authService.getCurrentUser();
            if (user) {
                cloudSyncService.syncGamesToCloud(user.uid, updatedGames);
            }
            return { success: true };
        } catch (error) {
            console.error('Failed to save game updates:', error);
            set({ error: (error as Error).message });
            return { success: false, error: (error as Error).message };
        }
    },

    deleteGame: async (id) => {
        const updatedGames = get().games.filter(game => game.id !== id);
        set({ games: updatedGames });

        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-games', updatedGames);
            } else {
                localStorage.setItem('orbit-games', JSON.stringify(updatedGames));
            }

            // Sync to cloud if user is authenticated
            const user = authService.getCurrentUser();
            if (user) {
                cloudSyncService.syncGamesToCloud(user.uid, updatedGames);
            }
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    setViewMode: (mode) => set({ viewMode: mode }),
    setSortBy: (sort) => set({ sortBy: sort }),
    setSortOrder: (order) => set({ sortOrder: order }),
    setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
    resetFilters: () => set({ filters: defaultFilters }),
    setSelectedGame: (game) => set({ selectedGame: game }),

    toggleFavorite: async (id) => {
        const game = get().games.find(g => g.id === id);
        if (game) {
            await get().updateGame(id, { isFavorite: !game.isFavorite });
        }
    },

    updatePlaytime: async (id, minutes) => {
        const game = get().games.find(g => g.id === id);
        if (game) {
            await get().updateGame(id, {
                playtime: game.playtime + minutes,
                lastPlayed: new Date().toISOString()
            });
        }
    },

    launchGame: async (id) => {
        const game = get().games.find(g => g.id === id);
        if (!game?.executablePath) {
            return { success: false, error: 'No executable path configured' };
        }

        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('launch-game', {
                    executablePath: game.executablePath,
                    installPath: game.installPath,
                    title: game.title
                });
                if (result.success) {
                    await get().updateGame(id, { lastPlayed: new Date().toISOString() });
                }
                return result;
            }
            return { success: false, error: 'Game launch only available in desktop app' };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    },

    // Re-match a specific game
    rematchGame: async (id) => {
        const game = get().games.find(g => g.id === id);
        if (!game) return;

        set({ isLoading: true });
        try {
            const enrichedGame = await gameMatchingService.rematchGame(game);

            if (enrichedGame.rawgId) {
                const updatedGames = get().games.map(g =>
                    g.id === id ? { ...g, ...enrichedGame, id: game.id, dateAdded: game.dateAdded } : g
                );
                set({ games: updatedGames, isLoading: false });

                // Save and sync
                if (isElectron) {
                    const { ipcRenderer } = window.require('electron');
                    await ipcRenderer.invoke('save-games', updatedGames);
                } else {
                    localStorage.setItem('orbit-games', JSON.stringify(updatedGames));
                }

                const user = authService.getCurrentUser();
                if (user) {
                    cloudSyncService.syncGamesToCloud(user.uid, updatedGames);
                }

                console.log(`✅ Re-matched: ${enrichedGame.title} (RAWG ID: ${enrichedGame.rawgId})`);
            } else {
                set({ isLoading: false });
                console.log(`❌ Could not match: ${game.title}`);
            }
        } catch (error) {
            set({ isLoading: false, error: (error as Error).message });
        }
    },

    // Match all unmatched games in library
    matchAllUnmatchedGames: async () => {
        const unmatchedGames = get().games.filter(g => !g.rawgId);
        if (unmatchedGames.length === 0) return;

        set({ isLoading: true });
        console.log(`🔄 Matching ${unmatchedGames.length} unmatched games...`);

        let matchedCount = 0;
        for (const game of unmatchedGames) {
            try {
                const enrichedGame = await gameMatchingService.autoMatchAndEnrich(game);

                if (enrichedGame.rawgId) {
                    const updatedGames = get().games.map(g =>
                        g.id === game.id ? { ...g, ...enrichedGame, id: game.id, dateAdded: game.dateAdded } : g
                    );
                    set({ games: updatedGames });
                    matchedCount++;
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.warn(`Failed to match ${game.title}:`, error);
            }
        }

        // Save all changes
        const finalGames = get().games;
        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-games', finalGames);
            } else {
                localStorage.setItem('orbit-games', JSON.stringify(finalGames));
            }

            const user = authService.getCurrentUser();
            if (user) {
                cloudSyncService.syncGamesToCloud(user.uid, finalGames);
            }
        } catch (error) {
            console.error('Error saving matched games:', error);
        }

        set({ isLoading: false });
        console.log(`✅ Matched ${matchedCount} of ${unmatchedGames.length} games`);
    }
}));

// Profile Store
interface ProfileState {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;

    loadProfile: () => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    setStatus: (status: UserStatus) => Promise<void>;
    setCurrentGame: (gameId: string | null) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
    profile: null,
    isLoading: false,
    error: null,

    loadProfile: async () => {
        set({ isLoading: true, error: null });
        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                const profile = await ipcRenderer.invoke('get-profile');
                set({ profile, isLoading: false });
            } else {
                const stored = localStorage.getItem('orbit-profile');
                const defaultProfile: UserProfile = {
                    id: uuidv4(),
                    username: 'Jugador',
                    avatar: null,
                    status: 'online',
                    currentGame: null,
                    stats: {
                        gamesCompleted: 0,
                        totalPlaytime: 0,
                        favoriteGenre: null,
                        achievementsUnlocked: 0,
                        gamesOwned: 0,
                        averagePlaytime: 0
                    },
                    createdAt: new Date().toISOString(),
                    lastSeen: new Date().toISOString()
                };
                set({ profile: stored ? JSON.parse(stored) : defaultProfile, isLoading: false });
            }
        } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
        }
    },

    updateProfile: async (updates) => {
        const currentProfile = get().profile;
        if (!currentProfile) return;

        const updatedProfile = { ...currentProfile, ...updates };
        set({ profile: updatedProfile });

        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-profile', updatedProfile);
            } else {
                localStorage.setItem('orbit-profile', JSON.stringify(updatedProfile));
            }
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    setStatus: async (status) => {
        await get().updateProfile({ status, lastSeen: new Date().toISOString() });
    },

    setCurrentGame: async (gameId) => {
        await get().updateProfile({
            currentGame: gameId,
            status: gameId ? 'playing' : 'online'
        });
    }
}));

// Settings Store
interface SettingsState {
    settings: AppSettings;
    isLoading: boolean;

    loadSettings: () => Promise<void>;
    updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
    resetSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
    theme: 'dark',
    language: 'es',
    notifications: true,
    autoSync: true,
    launchAtStartup: false,
    minimizeToTray: true,
    discordRpc: true,
    downloadPath: '',
    maxConcurrentDownloads: 3
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: defaultSettings,
    isLoading: false,

    loadSettings: async () => {
        set({ isLoading: true });
        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                const settings = await ipcRenderer.invoke('get-settings');
                set({ settings: { ...defaultSettings, ...settings }, isLoading: false });
            } else {
                const stored = localStorage.getItem('orbit-settings');
                set({ settings: stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings, isLoading: false });
            }
        } catch {
            set({ isLoading: false });
        }
    },

    updateSettings: async (updates) => {
        const updatedSettings = { ...get().settings, ...updates };
        set({ settings: updatedSettings });

        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-settings', updatedSettings);
            } else {
                localStorage.setItem('orbit-settings', JSON.stringify(updatedSettings));
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    },

    resetSettings: async () => {
        set({ settings: defaultSettings });
        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-settings', defaultSettings);
            } else {
                localStorage.setItem('orbit-settings', JSON.stringify(defaultSettings));
            }
        } catch (error) {
            console.error('Failed to reset settings:', error);
        }
    }
}));

// UI Store for general UI state
interface UIState {
    sidebarCollapsed: boolean;
    currentPage: string;
    modalOpen: string | null;
    notifications: { id: string; type: string; message: string }[];
    gameDetailsData: unknown | null;

    navigationHistory: string[];
    navigationFuture: string[]; // For forward navigation

    toggleSidebar: () => void;
    setCurrentPage: (page: string) => void;
    navigateTo: (page: string, data?: unknown) => void;
    goBack: () => void;
    goForward: () => void;
    openModal: (modalId: string) => void;
    closeModal: () => void;
    addNotification: (type: string, message: string) => void;
    removeNotification: (id: string) => void;

    // Confirm Modal
    confirmModal: {
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
        isDanger?: boolean;
    };
    openConfirmModal: (options: {
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        cancelText?: string;
        isDanger?: boolean;
    }) => void;
    closeConfirmModal: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
    sidebarCollapsed: false,
    currentPage: 'dashboard',
    modalOpen: null,
    notifications: [],
    gameDetailsData: null,
    navigationHistory: [],
    navigationFuture: [],

    toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

    setCurrentPage: (page) => {
        // Simple set, treating as a new navigation
        const current = get().currentPage;
        if (current !== page) {
            set({
                currentPage: page,
                navigationHistory: [...get().navigationHistory, current],
                navigationFuture: [] // Clear future on new navigation
            });
        }
    },

    navigateTo: (page, data) => {
        const current = get().currentPage;
        if (current !== page) {
            set({
                currentPage: page,
                gameDetailsData: data ?? null,
                navigationHistory: [...get().navigationHistory, current],
                navigationFuture: []
            });
        }
    },

    goBack: () => {
        const { navigationHistory, navigationFuture, currentPage } = get();
        if (navigationHistory.length === 0) return;

        const previousPage = navigationHistory[navigationHistory.length - 1];
        const newHistory = navigationHistory.slice(0, -1);

        set({
            currentPage: previousPage,
            navigationHistory: newHistory,
            navigationFuture: [currentPage, ...navigationFuture]
        });
    },

    goForward: () => {
        const { navigationHistory, navigationFuture, currentPage } = get();
        if (navigationFuture.length === 0) return;

        const nextPage = navigationFuture[0];
        const newFuture = navigationFuture.slice(1);

        set({
            currentPage: nextPage,
            navigationHistory: [...navigationHistory, currentPage],
            navigationFuture: newFuture
        });
    },
    openModal: (modalId) => set({ modalOpen: modalId }),
    closeModal: () => set({ modalOpen: null }),

    addNotification: (type, message) => {
        const id = uuidv4();
        set({ notifications: [...get().notifications, { id, type, message }] });
        setTimeout(() => get().removeNotification(id), 5000);
    },

    removeNotification: (id) => {
        set({ notifications: get().notifications.filter(n => n.id !== id) });
    },
    // Confirm Modal
    confirmModal: {
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        isDanger: false
    },

    openConfirmModal: (options) => set({
        confirmModal: {
            isOpen: true,
            title: options.title,
            message: options.message,
            onConfirm: options.onConfirm,
            confirmText: options.confirmText ?? 'Confirmar',
            cancelText: options.cancelText ?? 'Cancelar',
            isDanger: options.isDanger ?? false
        }
    }),

    closeConfirmModal: () => set((state) => ({
        confirmModal: { ...state.confirmModal, isOpen: false }
    }))
}));
