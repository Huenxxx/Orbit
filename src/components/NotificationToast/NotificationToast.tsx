import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Gamepad2,
    Users,
    CheckCircle,
    AlertCircle,
    Info,
    AlertTriangle
} from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import type { Notification } from '../../types/social';
import './NotificationToast.css';

export function NotificationToast() {
    const { notifications, removeNotification } = useNotificationStore();

    const getIcon = (notification: Notification) => {
        switch (notification.type) {
            case 'game':
                if (notification.icon) {
                    return (
                        <img
                            src={notification.icon}
                            alt={notification.gameName}
                            className="notification-game-cover"
                        />
                    );
                }
                return <Gamepad2 size={24} />;
            case 'friend':
                if (notification.friendAvatar) {
                    return (
                        <img
                            src={notification.friendAvatar}
                            alt={notification.friendName}
                            className="notification-avatar"
                        />
                    );
                }
                return <Users size={24} />;
            case 'success':
                return <CheckCircle size={24} />;
            case 'error':
                return <AlertCircle size={24} />;
            case 'warning':
                return <AlertTriangle size={24} />;
            case 'info':
            default:
                return <Info size={24} />;
        }
    };

    return (
        <div className="notification-container">
            <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                    <motion.div
                        key={notification.id}
                        className={`notification-toast notification-${notification.type}`}
                        initial={{ opacity: 0, x: 100, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 100, scale: 0.8 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        layout
                    >
                        <div className="notification-icon">
                            {getIcon(notification)}
                        </div>
                        <div className="notification-content">
                            <h4 className="notification-title">{notification.title}</h4>
                            <p className="notification-message">{notification.message}</p>
                        </div>
                        <button
                            className="notification-close"
                            onClick={() => removeNotification(notification.id)}
                        >
                            <X size={16} />
                        </button>
                        <motion.div
                            className="notification-progress"
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{
                                duration: (notification.duration || 5000) / 1000,
                                ease: 'linear',
                            }}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
