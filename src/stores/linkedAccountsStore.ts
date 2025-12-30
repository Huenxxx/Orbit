import { create } from 'zustand';
import { ipc } from '../services/ipc';

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
    platform: 'steam' | 'epic' | 'ea';
    userId: string;
    username: string;
    avatarUrl?: string;
    linkedAt: string;
    lastSync?: string;
    steamLevel?: number;
}

// Steam friend with status
export interface SteamFriend {
    steamId: string;
    personaName: string;
    avatarFull: string;
    personaState: number;
    personaStateString: 'offline' | 'online' | 'busy' | 'away' | 'snooze' | 'looking_to_trade' | 'looking_to_play';
    currentGame: {
        gameId: string;
        gameName: string;
    } | null;
    friendSince: number;
}

interface LinkedAccountsState {
    steamAccount: LinkedAccount | null;
    epicAccount: LinkedAccount | null;
    eaAccount: LinkedAccount | null;
    steamGames: SteamGame[];
    epicGames: EpicGame[];
    eaLocalGames: any[];
    epicLocalGames: any[];
    installedSteamGames: InstalledSteamGame[];
    steamInstalled: boolean;
    steamPath: string | null;
    steamLevel: number | null;
    steamFriends: SteamFriend[];
    epicFriends: SteamFriend[];
    isLinkingSteam: boolean;
    isLinkingEpic: boolean;
    isLinkingEa: boolean;
    isSyncingSteam: boolean;
    isSyncingEpic: boolean;
    isSyncingEa: boolean;
    isSyncingEpicLocal: boolean;
    isLoadingFriends: boolean;
    error: string | null;

    // Actions
    linkSteamAccount: (steamId: string) => Promise<boolean>;
    linkSteamAccountAuto: () => Promise<boolean>;
    linkSteamWithOpenID: () => Promise<boolean>;
    linkEpicAccount: () => Promise<boolean>;
    linkEaAccount: () => Promise<boolean>;
    unlinkSteamAccount: () => void;
    unlinkEpicAccount: () => void;
    unlinkEaAccount: () => void;
    syncSteamGames: () => Promise<void>;
    syncEpicGames: () => Promise<void>;
    syncEaGames: () => Promise<void>;
    syncEpicLocalGames: () => Promise<void>;
    loadLinkedAccounts: () => void;
    detectLocalSteam: () => Promise<void>;
    launchSteamGame: (appId: number) => Promise<boolean>;
    installSteamGame: (appId: number) => Promise<boolean>;
    getSteamLevel: () => Promise<void>;
    getSteamFriends: () => Promise<void>;
    getEpicFriends: () => Promise<void>;
    getEpicAchievements: (namespace: string, appId: string) => Promise<void>;
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
const STORAGE_KEY_EA = 'orbit-linked-ea';
const STORAGE_KEY_STEAM_GAMES = 'orbit-steam-games';
const STORAGE_KEY_EPIC_GAMES = 'orbit-epic-games';
const STORAGE_KEY_EA_GAMES = 'orbit-ea-games';


export const useLinkedAccountsStore = create<LinkedAccountsState>((set, get) => ({
    steamAccount: null,
    epicAccount: null,
    eaAccount: null,
    steamGames: [],
    epicGames: [],
    eaLocalGames: [],
    epicLocalGames: [],
    installedSteamGames: [],
    steamInstalled: false,
    steamPath: null,
    steamLevel: null,
    steamFriends: [],
    epicFriends: [],
    isLinkingSteam: false,
    isLinkingEpic: false,
    isLinkingEa: false,
    isSyncingSteam: false,
    isSyncingEpic: false,
    isSyncingEa: false,
    isSyncingEpicLocal: false,
    isLoadingFriends: false,
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

            // Load EA account
            const eaData = localStorage.getItem(STORAGE_KEY_EA);
            if (eaData) {
                const ea = JSON.parse(eaData);
                set({ eaAccount: ea });
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

            // Load EA games
            const eaGamesData = localStorage.getItem(STORAGE_KEY_EA_GAMES);
            if (eaGamesData) {
                set({ eaLocalGames: JSON.parse(eaGamesData) });
            }

            // Load Epic local games
            const epicLocalData = localStorage.getItem('orbit-epic-local-games');
            if (epicLocalData) {
                set({ epicLocalGames: JSON.parse(epicLocalData) });
            }
        } catch (error) {
            console.error('Error loading linked accounts:', error);
        }
    },

    syncEpicLocalGames: async () => {
        set({ isSyncingEpicLocal: true });
        try {
            const result = await ipc.invoke<{ success: boolean; games: any[] }>('epic-get-info');
            if (result && result.success && result.games) {
                set({ epicLocalGames: result.games });
                localStorage.setItem('orbit-epic-local-games', JSON.stringify(result.games));
            }
        } catch (error) {
            console.error('Error syncing local Epic games:', error);
        } finally {
            set({ isSyncingEpicLocal: false });
        }
    },

    linkSteamAccount: async (steamId: string) => {
        set({ isLinkingSteam: true, error: null });

        try {
            // Validate Steam ID format (should be 17 digits)
            const cleanSteamId = steamId.trim();

            let username = `Steam User ${cleanSteamId.slice(-4)}`;
            let avatarUrl = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

            // Try to fetch real profile from Steam API
            const profileResult = await ipc.invoke<SteamApiResponse>('steam-get-player-summary', cleanSteamId);

            if (profileResult && profileResult.success && profileResult.profile) {
                username = profileResult.profile.personaName;
                avatarUrl = profileResult.profile.avatarFull || profileResult.profile.avatarMedium || avatarUrl;
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
            // Detect local Epic Games installation
            const result = await ipc.invoke<{
                success: boolean;
                installed: boolean;
                games: any[];
                launcherPath?: string
            }>('epic-get-info');

            if (result && result.success && result.installed) {
                // Create a local account representation
                const account: LinkedAccount = {
                    platform: 'epic',
                    userId: 'local-epic',
                    username: 'Epic Games (Local)',
                    linkedAt: new Date().toISOString()
                };

                localStorage.setItem(STORAGE_KEY_EPIC, JSON.stringify(account));

                // Map local games to EpicGame format
                const epicGames: EpicGame[] = result.games.map((game: any) => ({
                    id: game.id,
                    title: game.name,
                    namespace: 'epic', // We don't have namespace locally, use generic
                    image: '' // We don't have images locally yet
                }));

                localStorage.setItem(STORAGE_KEY_EPIC_GAMES, JSON.stringify(epicGames));
                localStorage.setItem('orbit-epic-local-games', JSON.stringify(result.games));

                set({
                    epicAccount: account,
                    epicGames: epicGames,
                    epicLocalGames: result.games,
                    isLinkingEpic: false
                });

                return true;
            } else {
                throw new Error('No se detectó el launcher de Epic Games instalado.');
            }
        } catch (error) {
            console.error('Error linking Epic account:', error);
            set({ error: (error as Error).message, isLinkingEpic: false });
            return false;
        }
    },

    linkEaAccount: async () => {
        set({ isLinkingEa: true, error: null });

        try {
            // Detect local EA installation
            const result = await ipc.invoke<{
                success: boolean;
                installed: boolean;
                games: any[];
                launcherPath?: string
            }>('ea-get-info');

            if (result && result.success && result.installed) {
                // Create a local account representation
                const account: LinkedAccount = {
                    platform: 'ea',
                    userId: 'local-ea',
                    username: 'EA Desktop (Local)',
                    linkedAt: new Date().toISOString()
                };

                localStorage.setItem(STORAGE_KEY_EA, JSON.stringify(account));
                localStorage.setItem(STORAGE_KEY_EA_GAMES, JSON.stringify(result.games));

                set({
                    eaAccount: account,
                    eaLocalGames: result.games,
                    isLinkingEa: false
                });

                return true;
            } else {
                throw new Error('No se detectó EA Desktop o Origin instalado.');
            }
        } catch (error) {
            console.error('Error linking EA account:', error);
            set({ error: (error as Error).message, isLinkingEa: false });
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

    unlinkEaAccount: () => {
        localStorage.removeItem(STORAGE_KEY_EA);
        localStorage.removeItem(STORAGE_KEY_EA_GAMES);
        set({ eaAccount: null, eaLocalGames: [] });
    },

    syncSteamGames: async () => {
        const { steamAccount } = get();
        if (!steamAccount) return;

        set({ isSyncingSteam: true, error: null });

        try {
            // Fetch real games from Steam API
            const result = await ipc.invoke<SteamApiResponse>('steam-get-owned-games', steamAccount.userId);

            if (!result || !result.success || !result.games) {
                throw new Error(result?.error || 'Error al obtener juegos de Steam');
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
            // Just refresh local info
            const result = await ipc.invoke<{ success: boolean; games: any[] }>('epic-get-info');

            if (result && result.success && result.games) {
                const epicGames: EpicGame[] = result.games.map((game: any) => ({
                    id: game.id,
                    title: game.name,
                    namespace: 'epic',
                    image: '' // Fallback image or look up locally if possible
                }));

                localStorage.setItem(STORAGE_KEY_EPIC_GAMES, JSON.stringify(epicGames));
                localStorage.setItem('orbit-epic-local-games', JSON.stringify(result.games));

                set({
                    epicGames: epicGames,
                    epicLocalGames: result.games,
                    isSyncingEpic: false,
                    epicAccount: {
                        ...epicAccount,
                        lastSync: new Date().toISOString()
                    }
                });

                // Update stored account with lastSync
                const updatedAccount = { ...epicAccount, lastSync: new Date().toISOString() };
                localStorage.setItem(STORAGE_KEY_EPIC, JSON.stringify(updatedAccount));
            }
        } catch (error) {
            console.error('Error syncing Epic games:', error);
            set({ error: (error as Error).message, isSyncingEpic: false });
        }
    },

    syncEaGames: async () => {
        const { eaAccount } = get();
        if (!eaAccount) return;

        set({ isSyncingEa: true, error: null });

        try {
            const result = await ipc.invoke<{ success: boolean; games: any[] }>('ea-get-info');

            if (result && result.success && result.games) {
                localStorage.setItem(STORAGE_KEY_EA_GAMES, JSON.stringify(result.games));

                set({
                    eaLocalGames: result.games,
                    isSyncingEa: false,
                    eaAccount: {
                        ...eaAccount,
                        lastSync: new Date().toISOString()
                    }
                });

                const updatedAccount = { ...eaAccount, lastSync: new Date().toISOString() };
                localStorage.setItem(STORAGE_KEY_EA, JSON.stringify(updatedAccount));
            }
        } catch (error) {
            console.error('Error syncing EA games:', error);
            set({ error: (error as Error).message, isSyncingEa: false });
        }
    },

    // Detect local Steam installation and get user info
    detectLocalSteam: async () => {
        try {
            const result = await ipc.invoke<SteamLocalInfo>('steam-get-local-info');

            if (result && result.success) {
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
                    error: result?.error || 'No se pudo detectar Steam'
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
            // Get local Steam info
            const localInfo = await ipc.invoke<SteamLocalInfo>('steam-get-local-info');

            if (!localInfo || !localInfo.success || !localInfo.user) {
                // Open Steam so user can log in
                await ipc.invoke('steam-open-login');
                throw new Error('Por favor, inicia sesión en Steam y vuelve a intentarlo');
            }

            const steamId = localInfo.user.steamId;
            let username = localInfo.user.personaName;
            let avatarUrl = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

            // Try to get full profile from Steam API for better avatar
            const profileResult = await ipc.invoke<SteamApiResponse>('steam-get-player-summary', steamId);

            if (profileResult && profileResult.success && profileResult.profile) {
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
            const result = await ipc.invoke<{ success: boolean }>('steam-launch-game', appId);
            return result?.success || false;
        } catch (error) {
            console.error('Error launching game:', error);
            return false;
        }
    },

    // Install a Steam game
    installSteamGame: async (appId: number) => {
        try {
            const result = await ipc.invoke<{ success: boolean }>('steam-install-game', appId);
            return result?.success || false;
        } catch (error) {
            console.error('Error installing game:', error);
            return false;
        }
    },

    // Link Steam account using OpenID authentication
    linkSteamWithOpenID: async () => {
        set({ isLinkingSteam: true, error: null });

        try {
            // Start OpenID authentication flow
            const authResult = await ipc.invoke<{ success: boolean; steamId?: string; error?: string }>('steam-openid-login');

            if (!authResult || !authResult.success || !authResult.steamId) {
                throw new Error(authResult?.error || 'Error en la autenticación de Steam');
            }

            const steamId = authResult.steamId;

            // Get profile info from Steam API
            let username = `Steam User ${steamId.slice(-4)}`;
            let avatarUrl = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

            const profileResult = await ipc.invoke<SteamApiResponse>('steam-get-player-summary', steamId);

            if (profileResult && profileResult.success && profileResult.profile) {
                username = profileResult.profile.personaName;
                avatarUrl = profileResult.profile.avatarFull || profileResult.profile.avatarMedium || avatarUrl;
            }

            // Get Steam level
            const levelResult = await ipc.invoke<{ success: boolean; level: number }>('steam-get-level', steamId);
            const steamLevel = levelResult && levelResult.success ? levelResult.level : 0;

            const account: LinkedAccount = {
                platform: 'steam',
                userId: steamId,
                username: username,
                avatarUrl: avatarUrl,
                linkedAt: new Date().toISOString(),
                steamLevel: steamLevel
            };

            localStorage.setItem(STORAGE_KEY_STEAM, JSON.stringify(account));
            set({
                steamAccount: account,
                steamLevel: steamLevel,
                isLinkingSteam: false
            });

            // Sync games after linking
            await get().syncSteamGames();

            // Load friends
            await get().getSteamFriends();

            return true;
        } catch (error) {
            console.error('Error linking Steam with OpenID:', error);
            set({ error: (error as Error).message, isLinkingSteam: false });
            return false;
        }
    },

    // Get Steam level
    getSteamLevel: async () => {
        const { steamAccount } = get();
        if (!steamAccount) return;

        try {
            const result = await ipc.invoke<{ success: boolean; level: number }>('steam-get-level', steamAccount.userId);

            if (result && result.success) {
                set({ steamLevel: result.level });
            }
        } catch (error) {
            console.error('Error getting Steam level:', error);
        }
    },

    // Get Steam friends with status
    getSteamFriends: async () => {
        const { steamAccount } = get();
        if (!steamAccount) return;

        set({ isLoadingFriends: true });

        try {
            const result = await ipc.invoke<{ success: boolean; friends: any[] }>('steam-get-friends', steamAccount.userId);

            if (result && result.success && result.friends) {
                set({
                    steamFriends: result.friends as SteamFriend[],
                    isLoadingFriends: false
                });
            } else {
                set({ isLoadingFriends: false });
            }
        } catch (error) {
            console.error('Error getting Steam friends:', error);
            set({ isLoadingFriends: false });
        }
    },

    // Get Epic friends with status
    getEpicFriends: async () => {
        // Local detection does not support friends fetching
        set({ epicFriends: [], isLoadingFriends: false });
    },

    getEpicAchievements: async (_namespace: string, _appId: string) => {
        // Local detection does not support achievements fetching
        console.log('Epic achievements not supported in local mode');
    }
} as any));
