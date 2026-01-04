// Cloud Sync Indicator Component
// Shows sync status in the UI

import { motion } from 'framer-motion';
import {
    Cloud,
    CloudOff,
    Check,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useCloudSyncStore } from '../../stores/cloudSyncStore';
import { useAuthStore } from '../../stores/authStore';
import './CloudSyncIndicator.css';

export const CloudSyncIndicator = () => {
    const { user } = useAuthStore();
    const {
        status,
        lastSyncTime,
        pendingChanges,
        error,
        autoSyncEnabled,
        setAutoSync
    } = useCloudSyncStore();

    // Don't show if not logged in
    if (!user) return null;

    const getStatusIcon = () => {
        switch (status) {
            case 'syncing':
                return <Loader2 className="sync-icon spinning" size={16} />;
            case 'synced':
                return <Check className="sync-icon synced" size={16} />;
            case 'error':
                return <AlertCircle className="sync-icon error" size={16} />;
            case 'offline':
                return <CloudOff className="sync-icon offline" size={16} />;
            default:
                return <Cloud className="sync-icon" size={16} />;
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'syncing':
                return 'Sincronizando...';
            case 'synced':
                return lastSyncTime
                    ? `Sincronizado ${formatTime(lastSyncTime)}`
                    : 'Sincronizado';
            case 'error':
                return error || 'Error de sincronización';
            case 'offline':
                return 'Sin conexión';
            default:
                return pendingChanges ? 'Cambios pendientes' : 'Nube';
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'ahora';
        if (minutes < 60) return `hace ${minutes}m`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `hace ${hours}h`;

        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    return (
        <div className={`cloud-sync-indicator ${status}`}>
            <div className="sync-status">
                {getStatusIcon()}
                <span className="sync-text">{getStatusText()}</span>
            </div>

            {pendingChanges && status !== 'syncing' && (
                <motion.div
                    className="pending-dot"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                />
            )}

            {/* Tooltip with more info */}
            <div className="sync-tooltip">
                <div className="tooltip-content">
                    <div className="tooltip-header">
                        <Cloud size={18} />
                        <span>Sincronización en la nube</span>
                    </div>

                    <div className="tooltip-body">
                        <div className="tooltip-row">
                            <span>Estado:</span>
                            <span className={`status-badge ${status}`}>
                                {status === 'synced' ? 'Sincronizado' :
                                    status === 'syncing' ? 'Sincronizando' :
                                        status === 'error' ? 'Error' :
                                            status === 'offline' ? 'Sin conexión' : 'Inactivo'}
                            </span>
                        </div>

                        {lastSyncTime && (
                            <div className="tooltip-row">
                                <span>Última sincronización:</span>
                                <span>{lastSyncTime.toLocaleTimeString('es-ES')}</span>
                            </div>
                        )}

                        <div className="tooltip-row">
                            <span>Auto-sincronización:</span>
                            <button
                                className={`toggle-btn ${autoSyncEnabled ? 'enabled' : ''}`}
                                onClick={() => setAutoSync(!autoSyncEnabled)}
                            >
                                {autoSyncEnabled ? 'Activada' : 'Desactivada'}
                            </button>
                        </div>

                        {error && (
                            <div className="tooltip-error">
                                <AlertCircle size={14} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CloudSyncIndicator;
