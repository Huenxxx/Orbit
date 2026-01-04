// Cloud Page - Cloud Sync Management

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Cloud as CloudIcon,
    CloudOff,
    RefreshCw,
    Check,
    AlertCircle,
    Loader2,
    HardDrive,
    Upload,
    Download,
    Shield,
    Clock,
    Gamepad2,
    Search
} from 'lucide-react';
import { useCloudSyncStore } from '../../stores/cloudSyncStore';
import { useAuthStore } from '../../stores/authStore';
import { useGamesStore, useSettingsStore } from '../../stores';
import { cloudSyncService } from '../../services/cloudSyncService';
import './Cloud.css';

export function CloudPage() {
    const { user, isAvailable: authAvailable } = useAuthStore();
    const { games, matchAllUnmatchedGames, isLoading: isMatchingGames } = useGamesStore();
    const { settings } = useSettingsStore();
    const {
        status,
        lastSyncTime,
        pendingChanges,
        error,
        isInitialized,
        autoSyncEnabled,
        setAutoSync,
        forceSync,
        pullFromCloud,
        clearError
    } = useCloudSyncStore();

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [isMatchingAll, setIsMatchingAll] = useState(false);

    // Game matching stats
    const matchedGames = games.filter(g => g.rawgId);
    const unmatchedGames = games.filter(g => !g.rawgId);

    // Handle match all unmatched games
    const handleMatchAllGames = async () => {
        if (unmatchedGames.length === 0) return;

        setIsMatchingAll(true);
        setSyncMessage(`Identificando ${unmatchedGames.length} juegos...`);

        try {
            await matchAllUnmatchedGames();
            setSyncMessage(`¡Identificación completada!`);
        } catch (err) {
            setSyncMessage('Error al identificar juegos');
        } finally {
            setIsMatchingAll(false);
            setTimeout(() => setSyncMessage(null), 3000);
        }
    };

    // Format last sync time
    const formatLastSync = (date: Date | null) => {
        if (!date) return 'Nunca';

        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return 'Hace un momento';
        if (minutes < 60) return `Hace ${minutes} minutos`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Hace ${hours} horas`;

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Handle force sync
    const handleForceSync = async () => {
        if (!user) return;

        setIsSyncing(true);
        setSyncMessage('Sincronizando...');

        try {
            const success = await forceSync(games, settings);
            if (success) {
                setSyncMessage('¡Sincronización completada!');
            } else {
                setSyncMessage('Error en la sincronización');
            }
        } catch (err) {
            setSyncMessage('Error en la sincronización');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncMessage(null), 3000);
        }
    };

    // Handle restore from cloud
    const handleRestoreFromCloud = async () => {
        if (!user) return;

        setIsSyncing(true);
        setSyncMessage('Descargando datos de la nube...');

        try {
            const { games: cloudGames } = await pullFromCloud();
            if (cloudGames) {
                setSyncMessage(`¡Restaurados ${cloudGames.length} juegos de la nube!`);
            } else {
                setSyncMessage('No hay datos en la nube');
            }
        } catch (err) {
            setSyncMessage('Error al restaurar');
        } finally {
            setIsSyncing(false);
            setTimeout(() => setSyncMessage(null), 3000);
        }
    };

    // If not logged in
    if (!user) {
        return (
            <div className="cloud-page">
                <div className="cloud-header">
                    <div className="cloud-header-icon">
                        <CloudIcon size={32} />
                    </div>
                    <div className="cloud-header-text">
                        <h1>Sincronización en la Nube</h1>
                        <p>Guarda tu biblioteca y configuración en la nube</p>
                    </div>
                </div>

                <div className="cloud-not-logged-in">
                    <CloudOff size={64} />
                    <h2>Inicia sesión para usar la nube</h2>
                    <p>
                        Necesitas iniciar sesión para sincronizar tu biblioteca,
                        configuración y progreso con la nube de Orbit.
                    </p>
                </div>
            </div>
        );
    }

    // If Firebase not available
    if (!authAvailable || !cloudSyncService.isAvailable()) {
        return (
            <div className="cloud-page">
                <div className="cloud-header">
                    <div className="cloud-header-icon">
                        <CloudIcon size={32} />
                    </div>
                    <div className="cloud-header-text">
                        <h1>Sincronización en la Nube</h1>
                        <p>Guarda tu biblioteca y configuración en la nube</p>
                    </div>
                </div>

                <div className="cloud-not-logged-in">
                    <AlertCircle size={64} />
                    <h2>Servicio no disponible</h2>
                    <p>
                        El servicio de sincronización en la nube no está configurado.
                        Contacta al administrador.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="cloud-page">
            {/* Header */}
            <div className="cloud-header">
                <div className="cloud-header-icon">
                    <CloudIcon size={32} />
                </div>
                <div className="cloud-header-text">
                    <h1>Sincronización en la Nube</h1>
                    <p>Guarda tu biblioteca y configuración en la nube</p>
                </div>

                {/* Status Badge */}
                <div className={`cloud-status-badge ${status}`}>
                    {status === 'syncing' && <Loader2 className="spinning" size={16} />}
                    {status === 'synced' && <Check size={16} />}
                    {status === 'error' && <AlertCircle size={16} />}
                    {status === 'offline' && <CloudOff size={16} />}
                    {status === 'idle' && <CloudIcon size={16} />}
                    <span>
                        {status === 'syncing' && 'Sincronizando...'}
                        {status === 'synced' && 'Sincronizado'}
                        {status === 'error' && 'Error'}
                        {status === 'offline' && 'Sin conexión'}
                        {status === 'idle' && 'Listo'}
                    </span>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <motion.div
                    className="cloud-error-banner"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <AlertCircle size={20} />
                    <span>{error}</span>
                    <button onClick={clearError}>Cerrar</button>
                </motion.div>
            )}

            {/* Sync Message */}
            {syncMessage && (
                <motion.div
                    className="cloud-sync-message"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Check size={20} />
                    <span>{syncMessage}</span>
                </motion.div>
            )}

            {/* Stats Cards */}
            <div className="cloud-stats">
                <div className="cloud-stat-card">
                    <div className="stat-icon">
                        <HardDrive size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{games.length}</span>
                        <span className="stat-label">Juegos en biblioteca</span>
                    </div>
                </div>

                <div className="cloud-stat-card">
                    <div className="stat-icon">
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{formatLastSync(lastSyncTime)}</span>
                        <span className="stat-label">Última sincronización</span>
                    </div>
                </div>

                <div className="cloud-stat-card">
                    <div className="stat-icon">
                        <Shield size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{autoSyncEnabled ? 'Activada' : 'Desactivada'}</span>
                        <span className="stat-label">Auto-sincronización</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="cloud-section">
                <h2>Acciones</h2>
                <div className="cloud-actions">
                    <button
                        className="cloud-action-btn primary"
                        onClick={handleForceSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <Loader2 className="spinning" size={20} />
                        ) : (
                            <Upload size={20} />
                        )}
                        <span>Sincronizar Ahora</span>
                        <p>Sube todos tus datos a la nube</p>
                    </button>

                    <button
                        className="cloud-action-btn"
                        onClick={handleRestoreFromCloud}
                        disabled={isSyncing}
                    >
                        <Download size={20} />
                        <span>Restaurar desde la Nube</span>
                        <p>Descarga tus datos guardados</p>
                    </button>
                </div>
            </div>

            {/* Game Matching Section */}
            <div className="cloud-section">
                <h2>Identificación de Juegos</h2>
                <p className="section-desc">
                    Orbit identifica automáticamente tus juegos (incluso repacks) para enriquecerlos con información, imágenes y sincronizarlos correctamente.
                </p>

                <div className="cloud-stats" style={{ marginTop: 'var(--space-4)' }}>
                    <div className="cloud-stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(52, 211, 153, 0.15)' }}>
                            <Check size={24} style={{ color: '#34d399' }} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{matchedGames.length}</span>
                            <span className="stat-label">Juegos identificados</span>
                        </div>
                    </div>

                    <div className="cloud-stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)' }}>
                            <Search size={24} style={{ color: '#fbbf24' }} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{unmatchedGames.length}</span>
                            <span className="stat-label">Sin identificar</span>
                        </div>
                    </div>

                    <div className="cloud-stat-card">
                        <div className="stat-icon">
                            <Gamepad2 size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">
                                {games.length > 0 ? Math.round((matchedGames.length / games.length) * 100) : 0}%
                            </span>
                            <span className="stat-label">Cobertura</span>
                        </div>
                    </div>
                </div>

                {unmatchedGames.length > 0 && (
                    <button
                        className="cloud-action-btn primary"
                        onClick={handleMatchAllGames}
                        disabled={isMatchingAll || isMatchingGames}
                        style={{ marginTop: 'var(--space-4)', width: '100%' }}
                    >
                        {isMatchingAll || isMatchingGames ? (
                            <Loader2 className="spinning" size={20} />
                        ) : (
                            <Search size={20} />
                        )}
                        <span>Identificar {unmatchedGames.length} Juegos</span>
                        <p>Busca automáticamente información de juegos no identificados</p>
                    </button>
                )}

                {unmatchedGames.length === 0 && games.length > 0 && (
                    <div className="all-matched-badge">
                        <Check size={20} />
                        <span>¡Todos los juegos están identificados!</span>
                    </div>
                )}
            </div>

            {/* Settings */}
            <div className="cloud-section">
                <h2>Configuración</h2>
                <div className="cloud-settings">
                    <div className="cloud-setting">
                        <div className="setting-info">
                            <RefreshCw size={20} />
                            <div>
                                <span className="setting-title">Auto-sincronización</span>
                                <span className="setting-desc">
                                    Sincroniza automáticamente cuando realizas cambios
                                </span>
                            </div>
                        </div>
                        <button
                            className={`toggle-switch ${autoSyncEnabled ? 'enabled' : ''}`}
                            onClick={() => setAutoSync(!autoSyncEnabled)}
                        >
                            <span className="toggle-knob" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sync Info */}
            <div className="cloud-section">
                <h2>Información de Sincronización</h2>
                <div className="cloud-info-list">
                    <div className="cloud-info-item">
                        <span className="info-label">Estado del servicio</span>
                        <span className={`info-value status-${status}`}>
                            {status === 'syncing' && 'Sincronizando'}
                            {status === 'synced' && 'Sincronizado'}
                            {status === 'error' && 'Error'}
                            {status === 'offline' && 'Sin conexión'}
                            {status === 'idle' && 'Listo'}
                        </span>
                    </div>
                    <div className="cloud-info-item">
                        <span className="info-label">Cambios pendientes</span>
                        <span className={`info-value ${pendingChanges ? 'pending' : ''}`}>
                            {pendingChanges ? 'Sí' : 'No'}
                        </span>
                    </div>
                    <div className="cloud-info-item">
                        <span className="info-label">Usuario conectado</span>
                        <span className="info-value">{user?.email}</span>
                    </div>
                    <div className="cloud-info-item">
                        <span className="info-label">Inicializado</span>
                        <span className="info-value">{isInitialized ? 'Sí' : 'No'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CloudPage;
