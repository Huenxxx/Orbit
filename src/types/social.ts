// Notification types and interfaces for ORBIT

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'game' | 'friend';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    icon?: string; // URL or icon name
    gameName?: string;
    friendName?: string;
    friendAvatar?: string;
    duration?: number; // ms, default 5000
    timestamp: number;
    read: boolean;
}

export interface Friend {
    id: string;
    odisea: string; // Username for friend system
    displayName: string;
    avatar: string | null;
    status: 'online' | 'offline' | 'away' | 'busy' | 'in-game';
    currentGame?: string;
    lastSeen: number;
    addedAt: number;
}

export interface FriendRequest {
    id: string;
    fromUserId: string;
    fromUsername: string;
    fromAvatar: string | null;
    toUserId: string;
    status: 'pending' | 'accepted' | 'rejected';
    sentAt: number;
}
