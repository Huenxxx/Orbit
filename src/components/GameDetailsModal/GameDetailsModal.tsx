import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Play,
    Heart,
    Clock,
    Star,
    Calendar,
    HardDrive,
    Tag,
    Building,
    FolderOpen,
    Edit,
    Trash2,
    Gamepad2
} from 'lucide-react';
import type { Game } from '../../types';
import { useGamesStore, useUIStore } from '../../stores';
import { useNotificationStore } from '../../stores/notificationStore';
import { ModalPortal } from '../ModalPortal';
import './GameDetailsModal.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

interface GameDetailsModalProps {
    game: Game;
    isOpen: boolean;
    onClose: () => void;
}

export function GameDetailsModal({ game, isOpen, onClose }: GameDetailsModalProps) {
    const { toggleFavorite, launchGame, deleteGame, setSelectedGame } = useGamesStore();
    const { openModal } = useUIStore();
    const { showGameStarted, showError, showSuccess } = useNotificationStore();

    const formatPlaytime = (minutes: number) => {
        if (minutes < 60) return `${minutes} minutos`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours} horas`;
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'Desconocida';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            'not_started': 'Sin empezar',
            'playing': 'Jugando',
            'completed': 'Completado',
            'on_hold': 'En pausa',
            'dropped': 'Abandonado'
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'not_started': '#6b7280',
            'playing': '#3b82f6',
            'completed': '#10b981',
            'on_hold': '#f59e0b',
            'dropped': '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    const handlePlay = async () => {
        const result = await launchGame(game.id);
        if (result.success) {
            showGameStarted(game.title, game.coverImage);
            onClose();
        } else {
            showError('Error al iniciar', result.error || 'No se pudo iniciar el juego');
        }
    };

    const handleFavorite = () => {
        toggleFavorite(game.id);
    };

    const handleEdit = () => {
        setSelectedGame(game);
        openModal('edit-game');
        onClose();
    };

    const handleDelete = async () => {
        if (confirm(`¿Eliminar "${game.title}" de tu biblioteca?`)) {
            await deleteGame(game.id);
            onClose();
        }
    };

    const openDirectory = async () => {
        if (!game.executablePath) {
            showError('Sin directorio', 'Este juego no tiene una ruta de ejecutable configurada');
            return;
        }

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                const dir = game.executablePath.substring(0, game.executablePath.lastIndexOf('\\'));
                await ipcRenderer.invoke('open-game-directory', dir);
                showSuccess('Directorio abierto', 'Se ha abierto el directorio del juego');
            }
        } catch (error) {
            showError('Error', 'No se pudo abrir el directorio');
        }
    };

    const getPlatformColor = (platform: string) => {
        const colors: Record<string, string> = {
            steam: '#1b2838',
            epic: '#2a2a2a',
            gog: '#86328a',
            ea: '#ff4747',
            ubisoft: '#0070ff',
            origin: '#f56c2d',
            uplay: '#0070ff',
            minecraft: '#62b47a',
            custom: '#6366f1'
        };
        return colors[platform] || colors.custom;
    };

    return (
        <ModalPortal>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="game-details-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    >
                        {/* Modal */}
                        <motion.div
                            className="game-details-modal"
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

                            {/* Hero Section with Background */}
                            <div className="modal-hero">
                                <div
                                    className="hero-background"
                                    style={{
                                        backgroundImage: game.backgroundImage || game.coverImage
                                            ? `url(${game.backgroundImage || game.coverImage})`
                                            : undefined
                                    }}
                                />
                                <div className="hero-overlay" />

                                <div className="hero-content">
                                    <div className="game-cover-large">
                                        {game.coverImage ? (
                                            <img src={game.coverImage} alt={game.title} />
                                        ) : (
                                            <div className="cover-placeholder">
                                                <Gamepad2 size={48} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="game-header-info">
                                        <div className="game-badges">
                                            <span
                                                className="platform-badge"
                                                style={{ background: getPlatformColor(game.platform) }}
                                            >
                                                {game.platform}
                                            </span>
                                            <span
                                                className="status-badge"
                                                style={{ background: getStatusColor(game.status) }}
                                            >
                                                {getStatusLabel(game.status)}
                                            </span>
                                        </div>

                                        <h1 className="game-title">{game.title}</h1>

                                        <div className="game-developer">
                                            <Building size={14} />
                                            <span>{game.developer}</span>
                                            {game.publisher && game.publisher !== game.developer && (
                                                <span className="publisher">• {game.publisher}</span>
                                            )}
                                        </div>

                                        <div className="quick-stats">
                                            <div className="stat">
                                                <Clock size={16} />
                                                <span>{formatPlaytime(game.playtime)}</span>
                                            </div>
                                            {game.rating && (
                                                <div className="stat">
                                                    <Star size={16} fill="#fbbf24" />
                                                    <span>{game.rating.toFixed(1)}</span>
                                                </div>
                                            )}
                                            {game.lastPlayed && (
                                                <div className="stat">
                                                    <Calendar size={16} />
                                                    <span>Último: {formatDate(game.lastPlayed)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Bar */}
                            <div className="modal-actions">
                                <button
                                    className="btn-play-large"
                                    onClick={handlePlay}
                                    disabled={!game.executablePath}
                                >
                                    <Play size={20} fill="currentColor" />
                                    JUGAR
                                </button>

                                <div className="secondary-actions">
                                    <button
                                        className={`btn-action ${game.isFavorite ? 'active' : ''}`}
                                        onClick={handleFavorite}
                                        title={game.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                                    >
                                        <Heart size={18} fill={game.isFavorite ? 'currentColor' : 'none'} />
                                    </button>
                                    <button
                                        className="btn-action"
                                        onClick={openDirectory}
                                        title="Abrir directorio"
                                        disabled={!game.executablePath}
                                    >
                                        <FolderOpen size={18} />
                                    </button>
                                    <button
                                        className="btn-action"
                                        onClick={handleEdit}
                                        title="Editar juego"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        className="btn-action danger"
                                        onClick={handleDelete}
                                        title="Eliminar de biblioteca"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="modal-content">
                                {/* Description */}
                                {game.description && (
                                    <section className="content-section">
                                        <h3>Descripción</h3>
                                        <p className="description-text">{game.description}</p>
                                    </section>
                                )}

                                {/* Game Details Grid */}
                                <section className="content-section">
                                    <h3>Detalles</h3>
                                    <div className="details-grid">
                                        {game.genres.length > 0 && (
                                            <div className="detail-item">
                                                <Tag size={16} />
                                                <div className="detail-content">
                                                    <span className="detail-label">Géneros</span>
                                                    <span className="detail-value">{game.genres.join(', ')}</span>
                                                </div>
                                            </div>
                                        )}

                                        {game.releaseDate && (
                                            <div className="detail-item">
                                                <Calendar size={16} />
                                                <div className="detail-content">
                                                    <span className="detail-label">Fecha de lanzamiento</span>
                                                    <span className="detail-value">{formatDate(game.releaseDate)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="detail-item">
                                            <Calendar size={16} />
                                            <div className="detail-content">
                                                <span className="detail-label">Añadido a biblioteca</span>
                                                <span className="detail-value">{formatDate(game.dateAdded)}</span>
                                            </div>
                                        </div>

                                        {game.size && (
                                            <div className="detail-item">
                                                <HardDrive size={16} />
                                                <div className="detail-content">
                                                    <span className="detail-label">Tamaño</span>
                                                    <span className="detail-value">{game.size}</span>
                                                </div>
                                            </div>
                                        )}

                                        {game.metacriticScore && (
                                            <div className="detail-item">
                                                <Star size={16} />
                                                <div className="detail-content">
                                                    <span className="detail-label">Metacritic</span>
                                                    <span className="detail-value metacritic">{game.metacriticScore}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Tags */}
                                {game.tags.length > 0 && (
                                    <section className="content-section">
                                        <h3>Etiquetas</h3>
                                        <div className="tags-container">
                                            {game.tags.map(tag => (
                                                <span key={tag} className="game-tag">{tag}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </ModalPortal>
    );
}
