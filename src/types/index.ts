// Game Types
export interface Game {
    id: string;
    title: string;
    description: string;
    coverImage: string;
    backgroundImage?: string;
    screenshots?: string[];
    trailerUrl?: string;
    executablePath?: string;
    installPath?: string;
    platform: GamePlatform;
    genres: string[];
    developer: string;
    publisher?: string;
    releaseDate?: string;
    rating?: number;
    metacriticScore?: number;
    playtime: number; // in minutes
    lastPlayed?: string;
    dateAdded: string;
    status: GameStatus;
    tags: string[];
    isFavorite: boolean;
    achievements?: Achievement[];
    isInstalled: boolean;
    size?: string;
}

export type GamePlatform = 'steam' | 'epic' | 'gog' | 'origin' | 'uplay' | 'minecraft' | 'custom' | 'other';

export type GameStatus = 'not_started' | 'playing' | 'completed' | 'on_hold' | 'dropped';

// Profile Types
export interface UserProfile {
    id: string;
    username: string;
    avatar: string | null;
    bio?: string;
    status: UserStatus;
    currentGame: string | null;
    stats: UserStats;
    createdAt: string;
    lastSeen: string;
}

export type UserStatus = 'online' | 'playing' | 'away' | 'busy' | 'offline';

export interface UserStats {
    gamesCompleted: number;
    totalPlaytime: number;
    favoriteGenre: string | null;
    achievementsUnlocked: number;
    gamesOwned: number;
    averagePlaytime: number;
}

// Achievement Types
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    gameId: string;
    unlockedAt?: string;
    isUnlocked: boolean;
    rarity: AchievementRarity;
    points: number;
}

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Settings Types
export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
    autoSync: boolean;
    launchAtStartup: boolean;
    minimizeToTray: boolean;
    discordRpc: boolean;
    downloadPath: string;
    maxConcurrentDownloads: number;
}

// UI Types
export type ViewMode = 'grid' | 'list' | 'compact';

export type SortOption = 'name' | 'lastPlayed' | 'playtime' | 'dateAdded' | 'rating';

export interface FilterOptions {
    platforms: GamePlatform[];
    genres: string[];
    status: GameStatus[];
    tags: string[];
    search: string;
}

// API Types (for RAWG or similar)
export interface GameSearchResult {
    id: number;
    slug: string;
    name: string;
    released: string;
    background_image: string;
    rating: number;
    ratings_count: number;
    metacritic: number;
    genres: { id: number; name: string }[];
    platforms: { platform: { id: number; name: string } }[];
}

// Session Types
export interface GameSession {
    id: string;
    gameId: string;
    startTime: string;
    endTime?: string;
    duration: number; // in minutes
}

// Notification Types
export interface AppNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
}
