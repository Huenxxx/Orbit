import { create } from 'zustand';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

// Types for Steam API responses
interface SteamApiResponse {
    success: boolean;
    error?: string;
    games?: any[];
    profile?: {
        steamId: string;
        personaName: string;
        avatarFull: string;
        avatarMedium: string;
        avatar: string;
    };
}

// Types for linked accounts
export interface SteamGame {
    appid: number;
    name: string;
    playtime_forever: number; // minutes
    playtime_2weeks?: number;
    img_icon_url: string;
    img_logo_url: string;
    has_community_visible_stats?: boolean;
    iconUrl?: string;
    headerUrl?: string;
    capsuleUrl?: string;
}

export interface EpicGame {
    id: string;
    title: string;
    namespace: string;
    image: string;
}

export interface LinkedAccount {
    platform: 'steam' | 'epic';
    userId: string;
    username: string;
    avatarUrl?: string;
    linkedAt: string;
    lastSync?: string;
}

interface LinkedAccountsState {
    steamAccount: LinkedAccount | null;
    epicAccount: LinkedAccount | null;
    steamGames: SteamGame[];
    epicGames: EpicGame[];
    installedSteamGames: InstalledSteamGame[];
    steamInstalled: boolean;
    steamPath: string | null;
    isLinkingSteam: boolean;
    isLinkingEpic: boolean;
    isSyncingSteam: boolean;
    isSyncingEpic: boolean;
    error: string | null;

    // Actions
    linkSteamAccount: (steamId: string) => Promise<boolean>;
    linkSteamAccountAuto: () => Promise<boolean>;
    linkEpicAccount: () => Promise<boolean>;
    unlinkSteamAccount: () => void;
    unlinkEpicAccount: () => void;
    syncSteamGames: () => Promise<void>;
    syncEpicGames: () => Promise<void>;
    loadLinkedAccounts: () => void;
    detectLocalSteam: () => Promise<void>;
    launchSteamGame: (appId: number) => Promise<boolean>;
    installSteamGame: (appId: number) => Promise<boolean>;
}

// Installed Steam Game from local detection
export interface InstalledSteamGame {
    appid: number;
    name: string;
    installdir: string | null;
    sizeOnDisk: number;
    lastUpdated: number;
    buildId: string | null;
    installPath: string;
    libraryPath: string;
    headerUrl: string;
    capsuleUrl: string;
    isInstalled: boolean;
}

// Steam local info response
interface SteamLocalInfo {
    success: boolean;
    error?: string;
    steamInstalled: boolean;
    steamPath?: string;
    isRunning?: boolean;
    user?: {
        steamId: string;
        personaName: string;
        timestamp: number;
        mostRecent: boolean;
    };
    installedGames?: InstalledSteamGame[];
}

// Storage keys
const STORAGE_KEY_STEAM = 'orbit-linked-steam';
const STORAGE_KEY_EPIC = 'orbit-linked-epic';
const STORAGE_KEY_STEAM_GAMES = 'orbit-steam-games';
const STORAGE_KEY_EPIC_GAMES = 'orbit-epic-games';

export const useLinkedAccountsStore = create<LinkedAccountsState>((set, get) => ({
    steamAccount: null,
    epicAccount: null,
    steamGames: [],
    epicGames: [],
    installedSteamGames: [],
    steamInstalled: false,
    steamPath: null,
    isLinkingSteam: false,
    isLinkingEpic: false,
    isSyncingSteam: false,
    isSyncingEpic: false,
    error: null,

    loadLinkedAccounts: () => {
        try {
            // Load Steam account
            const steamData = localStorage.getItem(STORAGE_KEY_STEAM);
            if (steamData) {
                const steam = JSON.parse(steamData);
                set({ steamAccount: steam });
            }

            // Load Epic account
            const epicData = localStorage.getItem(STORAGE_KEY_EPIC);
            if (epicData) {
                const epic = JSON.parse(epicData);
                set({ epicAccount: epic });
            }

            // Load Steam games
            const steamGamesData = localStorage.getItem(STORAGE_KEY_STEAM_GAMES);
            if (steamGamesData) {
                set({ steamGames: JSON.parse(steamGamesData) });
            }

            // Load Epic games
            const epicGamesData = localStorage.getItem(STORAGE_KEY_EPIC_GAMES);
            if (epicGamesData) {
                set({ epicGames: JSON.parse(epicGamesData) });
            }
        } catch (error) {
            console.error('Error loading linked accounts:', error);
        }
    },

    linkSteamAccount: async (steamId: string) => {
        set({ isLinkingSteam: true, error: null });

        try {
            // Validate Steam ID format (should be 17 digits)
            const cleanSteamId = steamId.trim();

            // Check if we're in Electron environment
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            let username = `Steam User ${cleanSteamId.slice(-4)}`;
            let avatarUrl = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

            // Try to fetch real profile from Steam API
            if (ipcRenderer) {
                const profileResult = await ipcRenderer.invoke('steam-get-player-summary', cleanSteamId) as SteamApiResponse;

                if (profileResult.success && profileResult.profile) {
                    username = profileResult.profile.personaName;
                    avatarUrl = profileResult.profile.avatarFull || profileResult.profile.avatarMedium || avatarUrl;
                }
            }

            const account: LinkedAccount = {
                platform: 'steam',
                userId: cleanSteamId,
                username: username,
                avatarUrl: avatarUrl,
                linkedAt: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEY_STEAM, JSON.stringify(account));
            set({ steamAccount: account, isLinkingSteam: false });

            // Sync games after linking
            await get().syncSteamGames();

            return true;
        } catch (error) {
            console.error('Error linking Steam account:', error);
            set({ error: (error as Error).message, isLinkingSteam: false });
            return false;
        }
    },

    linkEpicAccount: async () => {
        set({ isLinkingEpic: true, error: null });

        try {
            // Epic Games requires OAuth authentication
            // For demonstration, we'll create a mock connection

            const account: LinkedAccount = {
                platform: 'epic',
                userId: 'epic_' + Date.now(),
                username: 'Epic Player',
                avatarUrl: undefined,
                linkedAt: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEY_EPIC, JSON.stringify(account));
            set({ epicAccount: account, isLinkingEpic: false });

            // Sync games after linking
            await get().syncEpicGames();

            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLinkingEpic: false });
            return false;
        }
    },

    unlinkSteamAccount: () => {
        localStorage.removeItem(STORAGE_KEY_STEAM);
        localStorage.removeItem(STORAGE_KEY_STEAM_GAMES);
        set({ steamAccount: null, steamGames: [] });
    },

    unlinkEpicAccount: () => {
        localStorage.removeItem(STORAGE_KEY_EPIC);
        localStorage.removeItem(STORAGE_KEY_EPIC_GAMES);
        set({ epicAccount: null, epicGames: [] });
    },

    syncSteamGames: async () => {
        const { steamAccount } = get();
        if (!steamAccount) return;

        set({ isSyncingSteam: true, error: null });

        try {
            // Check if we're in Electron environment
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) {
                throw new Error('Esta función solo está disponible en la aplicación de escritorio');
            }

            // Fetch real games from Steam API
            const result = await ipcRenderer.invoke('steam-get-owned-games', steamAccount.userId) as SteamApiResponse;

            if (!result.success || !result.games) {
                throw new Error(result.error || 'Error al obtener juegos de Steam');
            }

            const steamGames: SteamGame[] = result.games.map((game: any) => ({
                appid: game.appid,
                name: game.name,
                playtime_forever: game.playtime_forever,
                playtime_2weeks: game.playtime_2weeks,
                img_icon_url: game.img_icon_url,
                img_logo_url: game.img_logo_url || '',
                has_community_visible_stats: game.has_community_visible_stats,
                // Additional URLs for display
                iconUrl: game.iconUrl,
                headerUrl: game.headerUrl,
                capsuleUrl: game.capsuleUrl
            }));

            localStorage.setItem(STORAGE_KEY_STEAM_GAMES, JSON.stringify(steamGames));
            set({
                steamGames: steamGames,
                isSyncingSteam: false,
                steamAccount: {
                    ...steamAccount,
                    lastSync: new Date().toISOString()
                }
            });

            // Update stored account with lastSync
            const updatedAccount = { ...steamAccount, lastSync: new Date().toISOString() };
            localStorage.setItem(STORAGE_KEY_STEAM, JSON.stringify(updatedAccount));

        } catch (error) {
            console.error('Error syncing Steam games:', error);
            set({ error: (error as Error).message, isSyncingSteam: false });
        }
    },

    syncEpicGames: async () => {
        const { epicAccount } = get();
        if (!epicAccount) return;

        set({ isSyncingEpic: true, error: null });

        try {
            // Mock Epic Games data
            const mockEpicGames: EpicGame[] = [
                {
                    id: "fortnite",
                    title: "Fortnite",
                    namespace: "fn",
                    image: "https://cdn2.unrealengine.com/fortnite-chapter-4-logo-512x512-86c0dfa51e9f.png"
                },
                {
                    id: "rocket-league",
                    title: "Rocket League",
                    namespace: "rl",
                    image: "https://cdn2.unrealengine.com/rl-logo-512-512-1930517.png"
                },
                {
                    id: "fall-guys",
                    title: "Fall Guys",
                    namespace: "fg",
                    image: "https://cdn2.unrealengine.com/fallguys-512-512-512x512-14c43ef9b3b5.png"
                },
                {
                    id: "alan-wake-2",
                    title: "Alan Wake 2",
                    namespace: "aw2",
                    image: "https://cdn2.unrealengine.com/aw2-512-512-512x512.png"
                },
                {
                    id: "gta-v",
                    title: "Grand Theft Auto V",
                    namespace: "gtav",
                    image: "https://cdn2.unrealengine.com/gtav-512-512.png"
                }
            ];

            localStorage.setItem(STORAGE_KEY_EPIC_GAMES, JSON.stringify(mockEpicGames));
            set({
                epicGames: mockEpicGames,
                isSyncingEpic: false,
                epicAccount: {
                    ...epicAccount,
                    lastSync: new Date().toISOString()
                }
            });

            // Update stored account with lastSync
            const updatedAccount = { ...epicAccount, lastSync: new Date().toISOString() };
            localStorage.setItem(STORAGE_KEY_EPIC, JSON.stringify(updatedAccount));

        } catch (error) {
            set({ error: (error as Error).message, isSyncingEpic: false });
        }
    },

    // Detect local Steam installation and get user info
    detectLocalSteam: async () => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) {
                set({ steamInstalled: false, error: 'Solo disponible en la aplicación de escritorio' });
                return;
            }

            const result = await ipcRenderer.invoke('steam-get-local-info') as SteamLocalInfo;

            if (result.success) {
                set({
                    steamInstalled: result.steamInstalled,
                    steamPath: result.steamPath || null,
                    installedSteamGames: result.installedGames || [],
                    error: null
                });

                // If we found a logged-in user and no account is linked, auto-link
                if (result.user && !get().steamAccount) {
                    await get().linkSteamAccountAuto();
                }
            } else {
                set({
                    steamInstalled: false,
                    error: result.error || 'No se pudo detectar Steam'
                });
            }
        } catch (error) {
            console.error('Error detecting local Steam:', error);
            set({ steamInstalled: false, error: (error as Error).message });
        }
    },

    // Auto-link Steam account using local installation
    linkSteamAccountAuto: async () => {
        set({ isLinkingSteam: true, error: null });

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) {
                throw new Error('Solo disponible en la aplicación de escritorio');
            }

            // Get local Steam info
            const localInfo = await ipcRenderer.invoke('steam-get-local-info') as SteamLocalInfo;

            if (!localInfo.success || !localInfo.user) {
                // Open Steam so user can log in
                await ipcRenderer.invoke('steam-open-login');
                throw new Error('Por favor, inicia sesión en Steam y vuelve a intentarlo');
            }

            const steamId = localInfo.user.steamId;
            let username = localInfo.user.personaName;
            let avatarUrl = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

            // Try to get full profile from Steam API for better avatar
            const profileResult = await ipcRenderer.invoke('steam-get-player-summary', steamId) as SteamApiResponse;

            if (profileResult.success && profileResult.profile) {
                username = profileResult.profile.personaName;
                avatarUrl = profileResult.profile.avatarFull || profileResult.profile.avatarMedium || avatarUrl;
            }

            const account: LinkedAccount = {
                platform: 'steam',
                userId: steamId,
                username: username,
                avatarUrl: avatarUrl,
                linkedAt: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEY_STEAM, JSON.stringify(account));
            set({
                steamAccount: account,
                isLinkingSteam: false,
                installedSteamGames: localInfo.installedGames || []
            });

            // Sync games from Steam API
            await get().syncSteamGames();

            return true;
        } catch (error) {
            console.error('Error auto-linking Steam:', error);
            set({ error: (error as Error).message, isLinkingSteam: false });
            return false;
        }
    },

    // Launch a Steam game
    launchSteamGame: async (appId: number) => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) {
                throw new Error('Solo disponible en la aplicación de escritorio');
            }

            const result = await ipcRenderer.invoke('steam-launch-game', appId);
            return result.success;
        } catch (error) {
            console.error('Error launching game:', error);
            return false;
        }
    },

    // Install a Steam game
    installSteamGame: async (appId: number) => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };

            if (!ipcRenderer) {
                throw new Error('Solo disponible en la aplicación de escritorio');
            }

            const result = await ipcRenderer.invoke('steam-install-game', appId);
            return result.success;
        } catch (error) {
            console.error('Error installing game:', error);
            return false;
        }
    }
}));
