// Notification Store for ORBIT
import { create } from 'zustand';
import type { Notification, NotificationType } from '../types/social';

interface NotificationState {
    notifications: Notification[];
    maxNotifications: number;

    // Actions
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => string;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;

    // Convenience methods
    showGameStarted: (gameName: string, coverUrl?: string) => void;
    showFriendGameStarted: (friendName: string, gameName: string, friendAvatar?: string) => void;
    showFriendOnline: (friendName: string, friendAvatar?: string) => void;
    showSuccess: (title: string, message: string) => void;
    showError: (title: string, message: string) => void;
    showInfo: (title: string, message: string) => void;
}

const generateId = () => `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    maxNotifications: 5,

    addNotification: (notification) => {
        const id = generateId();
        const newNotification: Notification = {
            ...notification,
            id,
            timestamp: Date.now(),
            read: false,
            duration: notification.duration || 5000,
        };

        set((state) => {
            // Keep only the most recent notifications
            const notifications = [newNotification, ...state.notifications]
                .slice(0, state.maxNotifications);
            return { notifications };
        });

        // Auto-remove after duration
        if (newNotification.duration && newNotification.duration > 0) {
            setTimeout(() => {
                get().removeNotification(id);
            }, newNotification.duration);
        }

        return id;
    },

    removeNotification: (id) => {
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        }));
    },

    clearAll: () => set({ notifications: [] }),

    markAsRead: (id) => {
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
            ),
        }));
    },

    markAllAsRead: () => {
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
    },

    // Convenience methods
    showGameStarted: (gameName, coverUrl) => {
        get().addNotification({
            type: 'game',
            title: 'Iniciando juego',
            message: gameName,
            icon: coverUrl,
            gameName,
            duration: 4000,
        });
    },

    showFriendGameStarted: (friendName, gameName, friendAvatar) => {
        get().addNotification({
            type: 'friend',
            title: `${friendName} está jugando`,
            message: gameName,
            friendName,
            friendAvatar,
            gameName,
            duration: 6000,
        });
    },

    showFriendOnline: (friendName, friendAvatar) => {
        get().addNotification({
            type: 'friend',
            title: 'Amigo conectado',
            message: `${friendName} está online`,
            friendName,
            friendAvatar,
            duration: 4000,
        });
    },

    showSuccess: (title, message) => {
        get().addNotification({
            type: 'success',
            title,
            message,
            duration: 4000,
        });
    },

    showError: (title, message) => {
        get().addNotification({
            type: 'error',
            title,
            message,
            duration: 6000,
        });
    },

    showInfo: (title, message) => {
        get().addNotification({
            type: 'info',
            title,
            message,
            duration: 4000,
        });
    },
}));
