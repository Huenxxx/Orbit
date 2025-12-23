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
        const newGame: Game = {
            ...gameData,
            id: uuidv4(),
            dateAdded: new Date().toISOString()
        };

        const updatedGames = [...get().games, newGame];
        set({ games: updatedGames });

        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-games', updatedGames);
            } else {
                localStorage.setItem('orbit-games', JSON.stringify(updatedGames));
            }
        } catch (error) {
            set({ error: (error as Error).message });
        }
    },

    updateGame: async (id, updates) => {
        const updatedGames = get().games.map(game =>
            game.id === id ? { ...game, ...updates } : game
        );
        set({ games: updatedGames });

        try {
            if (isElectron) {
                const { ipcRenderer } = window.require('electron');
                await ipcRenderer.invoke('save-games', updatedGames);
            } else {
                localStorage.setItem('orbit-games', JSON.stringify(updatedGames));
            }
        } catch (error) {
            set({ error: (error as Error).message });
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
                const result = await ipcRenderer.invoke('launch-game', game.executablePath);
                if (result.success) {
                    await get().updateGame(id, { lastPlayed: new Date().toISOString() });
                }
                return result;
            }
            return { success: false, error: 'Game launch only available in desktop app' };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
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

    toggleSidebar: () => void;
    setCurrentPage: (page: string) => void;
    openModal: (modalId: string) => void;
    closeModal: () => void;
    addNotification: (type: string, message: string) => void;
    removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
    sidebarCollapsed: false,
    currentPage: 'dashboard',
    modalOpen: null,
    notifications: [],

    toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
    setCurrentPage: (page) => set({ currentPage: page }),
    openModal: (modalId) => set({ modalOpen: modalId }),
    closeModal: () => set({ modalOpen: null }),

    addNotification: (type, message) => {
        const id = uuidv4();
        set({ notifications: [...get().notifications, { id, type, message }] });
        setTimeout(() => get().removeNotification(id), 5000);
    },

    removeNotification: (id) => {
        set({ notifications: get().notifications.filter(n => n.id !== id) });
    }
}));
