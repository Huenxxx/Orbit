import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Play,
    Heart,
    Clock,
    MoreVertical,
    Star,
    Trash2,
    Edit,
    ExternalLink
} from 'lucide-react';
import type { Game } from '../../types';
import { useGamesStore, useUIStore } from '../../stores';
import { useNotificationStore } from '../../stores/notificationStore';
import './GameCard.css';

interface GameCardProps {
    game: Game;
    variant?: 'grid' | 'list' | 'compact';
    onSelect?: (game: Game) => void;
}

export function GameCard({ game, variant = 'grid', onSelect }: GameCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const { toggleFavorite, launchGame, deleteGame, setSelectedGame } = useGamesStore();
    const { openModal } = useUIStore();
    const { showGameStarted, showError } = useNotificationStore();

    const formatPlaytime = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const result = await launchGame(game.id);
        if (result.success) {
            showGameStarted(game.title, game.coverImage);
        } else {
            showError('Error al iniciar', result.error || 'No se pudo iniciar el juego');
            console.error('Failed to launch game:', result.error);
        }
    };

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFavorite(game.id);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        if (confirm(`¿Eliminar "${game.title}" de tu biblioteca?`)) {
            await deleteGame(game.id);
        }
    };

    const getPlatformColor = (platform: string) => {
        const colors: Record<string, string> = {
            steam: '#1b2838',
            epic: '#2a2a2a',
            gog: '#86328a',
            origin: '#f56c2d',
            uplay: '#0070ff',
            minecraft: '#62b47a',
            custom: '#6366f1'
        };
        return colors[platform] || colors.custom;
    };

    if (variant === 'list') {
        return (
            <motion.div
                className="game-card-list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ x: 4 }}
                onClick={() => onSelect?.(game)}
            >
                <div
                    className="game-list-cover"
                    style={{ backgroundImage: game.coverImage ? `url(${game.coverImage})` : undefined }}
                >
                    {!game.coverImage && <span>{game.title[0]}</span>}
                </div>

                <div className="game-list-info">
                    <h4 className="game-list-title">{game.title}</h4>
                    <div className="game-list-meta">
                        <span className="game-platform-badge" style={{ background: getPlatformColor(game.platform) }}>
                            {game.platform}
                        </span>
                        {game.genres.slice(0, 2).map(genre => (
                            <span key={genre} className="game-genre-tag">{genre}</span>
                        ))}
                    </div>
                </div>

                <div className="game-list-stats">
                    <div className="stat">
                        <Clock size={14} />
                        <span>{formatPlaytime(game.playtime)}</span>
                    </div>
                    {game.rating && (
                        <div className="stat">
                            <Star size={14} />
                            <span>{game.rating.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <div className="game-list-actions">
                    <button
                        className={`btn-icon-small ${game.isFavorite ? 'active' : ''}`}
                        onClick={handleFavorite}
                    >
                        <Heart size={16} fill={game.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button className="btn-play-small" onClick={handlePlay}>
                        <Play size={16} fill="currentColor" />
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`game-card ${variant}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -8 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowMenu(false); }}
            onClick={() => onSelect?.(game)}
        >
            {/* Cover Image */}
            <div className="game-cover">
                {game.coverImage ? (
                    <img src={game.coverImage} alt={game.title} />
                ) : (
                    <div className="game-cover-placeholder">
                        <span>{game.title[0]}</span>
                    </div>
                )}

                {/* Overlay on hover */}
                <motion.div
                    className="game-cover-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0 }}
                >
                    <button className="btn-play" onClick={handlePlay}>
                        <Play size={24} fill="currentColor" />
                        <span>Jugar</span>
                    </button>
                </motion.div>

                {/* Platform Badge */}
                <div
                    className="game-platform"
                    style={{ background: getPlatformColor(game.platform) }}
                >
                    {game.platform}
                </div>

                {/* Favorite Button */}
                <button
                    className={`game-favorite ${game.isFavorite ? 'active' : ''}`}
                    onClick={handleFavorite}
                >
                    <Heart size={18} fill={game.isFavorite ? 'currentColor' : 'none'} />
                </button>

                {/* Menu Button */}
                <button
                    className="game-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                >
                    <MoreVertical size={18} />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                    <motion.div
                        className="game-menu"
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                    >
                        <button onClick={() => { setShowMenu(false); setSelectedGame(game); openModal('edit-game'); }}>
                            <Edit size={14} /> Editar
                        </button>
                        <button>
                            <ExternalLink size={14} /> Ver detalles
                        </button>
                        <button className="danger" onClick={handleDelete}>
                            <Trash2 size={14} /> Eliminar
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Game Info */}
            <div className="game-info">
                <h3 className="game-title">{game.title}</h3>

                <div className="game-meta">
                    <span className="game-developer">{game.developer}</span>
                    <div className="game-stats">
                        <span className="stat">
                            <Clock size={12} />
                            {formatPlaytime(game.playtime)}
                        </span>
                        {game.rating && (
                            <span className="stat">
                                <Star size={12} />
                                {game.rating.toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tags */}
                {game.tags.length > 0 && (
                    <div className="game-tags">
                        {game.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="game-tag">{tag}</span>
                        ))}
                        {game.tags.length > 2 && (
                            <span className="game-tag more">+{game.tags.length - 2}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Progress bar for completion */}
            {game.status === 'playing' && (
                <div className="game-progress">
                    <div className="progress-bar" style={{ width: '45%' }}></div>
                </div>
            )}
        </motion.div>
    );
}
