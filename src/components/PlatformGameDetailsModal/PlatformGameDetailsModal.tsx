import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Play,
    Clock,
    FolderOpen,
    Gamepad2,
    ExternalLink
} from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
import './PlatformGameDetailsModal.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

export interface PlatformGame {
    id: string;
    name: string;
    platform: 'steam' | 'epic' | 'gog' | 'ea' | 'ubisoft';
    imageUrl?: string;
    playtime?: number; // in minutes
    installPath?: string;
    executable?: string;
    appId?: number; // For Steam games
}

interface PlatformGameDetailsModalProps {
    game: PlatformGame;
    isOpen: boolean;
    onClose: () => void;
    onPlay: () => void;
}

export function PlatformGameDetailsModal({
    game,
    isOpen,
    onClose,
    onPlay
}: PlatformGameDetailsModalProps) {

    const formatPlaytime = (minutes: number) => {
        if (minutes < 60) return `${minutes} minutos`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours} horas`;
    };

    const getPlatformColor = (platform: string) => {
        const colors: Record<string, { bg: string; accent: string }> = {
            steam: { bg: 'linear-gradient(135deg, #1b2838, #2a475e)', accent: '#66c0f4' },
            epic: { bg: 'linear-gradient(135deg, #121212, #2a2a2a)', accent: '#ffffff' },
            gog: { bg: 'linear-gradient(135deg, #5c2d91, #86328a)', accent: '#ffffff' },
            ea: { bg: 'linear-gradient(135deg, #ff4747, #e94040)', accent: '#ffffff' },
            ubisoft: { bg: 'linear-gradient(135deg, #0070ff, #003dad)', accent: '#ffffff' }
        };
        return colors[platform] || colors.steam;
    };

    const getPlatformLabel = (platform: string) => {
        const labels: Record<string, string> = {
            steam: 'Steam',
            epic: 'Epic Games',
            gog: 'GOG Galaxy',
            ea: 'EA App',
            ubisoft: 'Ubisoft Connect'
        };
        return labels[platform] || platform;
    };

    const handlePlay = () => {
        onPlay();
        onClose();
    };

    const openDirectory = async () => {
        if (!game.installPath) return;

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                await ipcRenderer.invoke('open-game-directory', game.installPath);
            }
        } catch (error) {
            console.error('Error opening directory:', error);
        }
    };

    const openStorePage = async () => {
        if (game.platform !== 'steam' || !game.appId) return;

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                await ipcRenderer.invoke('steam-open-store', game.appId);
            }
        } catch (error) {
            console.error('Error opening store:', error);
        }
    };

    const platformStyle = getPlatformColor(game.platform);

    return (
        <ModalPortal>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="platform-details-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    >
                        {/* Modal */}
                        <motion.div
                            className="platform-details-modal"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button className="modal-close" onClick={onClose}>
                                <X size={20} />
                            </button>

                            {/* Hero Image */}
                            <div className="modal-hero">
                                <div
                                    className="hero-background"
                                    style={{
                                        backgroundImage: game.imageUrl ? `url(${game.imageUrl})` : undefined
                                    }}
                                />
                                <div className="hero-overlay" style={{ background: `linear-gradient(to bottom, transparent, var(--color-space))` }} />

                                {!game.imageUrl && (
                                    <div className="hero-placeholder">
                                        <Gamepad2 size={64} />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="modal-content">
                                <div className="game-header">
                                    <span
                                        className="platform-badge"
                                        style={{ background: platformStyle.bg, color: platformStyle.accent }}
                                    >
                                        {getPlatformLabel(game.platform)}
                                    </span>
                                    <h1 className="game-title">{game.name}</h1>

                                    {game.playtime !== undefined && game.playtime > 0 && (
                                        <div className="playtime-info">
                                            <Clock size={16} />
                                            <span>{formatPlaytime(game.playtime)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="modal-actions">
                                    <button
                                        className="btn-play-large"
                                        onClick={handlePlay}
                                        style={{ background: platformStyle.bg }}
                                    >
                                        <Play size={20} fill="currentColor" />
                                        JUGAR
                                    </button>

                                    <div className="secondary-actions">
                                        {game.installPath && (
                                            <button
                                                className="btn-action"
                                                onClick={openDirectory}
                                                title="Abrir directorio"
                                            >
                                                <FolderOpen size={18} />
                                            </button>
                                        )}
                                        {game.platform === 'steam' && game.appId && (
                                            <button
                                                className="btn-action"
                                                onClick={openStorePage}
                                                title="Ver en Steam Store"
                                            >
                                                <ExternalLink size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="game-info-section">
                                    <p className="info-text">
                                        Este juego está instalado a través de <strong style={{ color: platformStyle.accent }}>{getPlatformLabel(game.platform)}</strong>.
                                    </p>
                                    {game.installPath && (
                                        <p className="install-path">
                                            <FolderOpen size={14} />
                                            {game.installPath}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ModalPortal>
    );
}
