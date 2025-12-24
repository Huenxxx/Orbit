import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Star,
    Lock,
    Unlock,
    Search,
    Award,
    Sparkles,
    Crown,
    Medal,
    Gamepad2,
    X
} from 'lucide-react';
import { useGamesStore } from '../../stores';
import './Achievements.css';

// Mock achievements for demonstration
interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    gameId: string;
    gameName: string;
    unlockedAt?: string;
    isUnlocked: boolean;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    points: number;
}

const rarityConfig = {
    common: { label: 'Común', color: '#94a3b8', icon: Medal },
    uncommon: { label: 'Poco común', color: '#22c55e', icon: Award },
    rare: { label: 'Raro', color: '#3b82f6', icon: Star },
    epic: { label: 'Épico', color: '#a855f7', icon: Trophy },
    legendary: { label: 'Legendario', color: '#f59e0b', icon: Crown },
};

export function Achievements() {
    const { games, loadGames } = useGamesStore();
    const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGame, setSelectedGame] = useState<string>('all');

    useEffect(() => {
        loadGames();
    }, []);

    // Generate mock achievements based on games
    const achievements = useMemo(() => {
        const mockAchievements: Achievement[] = [];

        games.forEach(game => {
            // First game achievement
            mockAchievements.push({
                id: `${game.id}-first-launch`,
                name: 'Primer lanzamiento',
                description: `Lanzar ${game.title} por primera vez`,
                icon: '🚀',
                gameId: game.id,
                gameName: game.title,
                unlockedAt: game.lastPlayed || undefined,
                isUnlocked: !!game.lastPlayed,
                rarity: 'common',
                points: 10
            });

            // Time played achievements
            if (game.playtime >= 60) {
                mockAchievements.push({
                    id: `${game.id}-hour-player`,
                    name: 'Jugador dedicado',
                    description: `Jugar 1 hora de ${game.title}`,
                    icon: '⏱️',
                    gameId: game.id,
                    gameName: game.title,
                    unlockedAt: game.lastPlayed || undefined,
                    isUnlocked: true,
                    rarity: 'uncommon',
                    points: 25
                });
            }

            if (game.playtime >= 600) {
                mockAchievements.push({
                    id: `${game.id}-veteran`,
                    name: 'Veterano',
                    description: `Jugar 10 horas de ${game.title}`,
                    icon: '🎮',
                    gameId: game.id,
                    gameName: game.title,
                    unlockedAt: game.lastPlayed || undefined,
                    isUnlocked: true,
                    rarity: 'rare',
                    points: 50
                });
            }

            // Completion achievement
            if (game.status === 'completed') {
                mockAchievements.push({
                    id: `${game.id}-completed`,
                    name: 'Completado',
                    description: `Completar ${game.title}`,
                    icon: '🏆',
                    gameId: game.id,
                    gameName: game.title,
                    unlockedAt: game.lastPlayed || undefined,
                    isUnlocked: true,
                    rarity: 'epic',
                    points: 100
                });
            }

            // Favorite achievement
            if (game.isFavorite) {
                mockAchievements.push({
                    id: `${game.id}-favorite`,
                    name: 'Favorito',
                    description: `Marcar ${game.title} como favorito`,
                    icon: '⭐',
                    gameId: game.id,
                    gameName: game.title,
                    isUnlocked: true,
                    rarity: 'common',
                    points: 5
                });
            }

            // Locked achievements (for demonstration)
            mockAchievements.push({
                id: `${game.id}-perfectionist`,
                name: 'Perfeccionista',
                description: `Conseguir el 100% en ${game.title}`,
                icon: '💎',
                gameId: game.id,
                gameName: game.title,
                isUnlocked: false,
                rarity: 'legendary',
                points: 200
            });
        });

        // Global achievements
        if (games.length >= 5) {
            mockAchievements.push({
                id: 'collector-5',
                name: 'Coleccionista',
                description: 'Tener 5 juegos en tu biblioteca',
                icon: '📚',
                gameId: 'global',
                gameName: 'ORBIT',
                isUnlocked: true,
                rarity: 'uncommon',
                points: 30
            });
        }

        if (games.length >= 10) {
            mockAchievements.push({
                id: 'collector-10',
                name: 'Gran coleccionista',
                description: 'Tener 10 juegos en tu biblioteca',
                icon: '📖',
                gameId: 'global',
                gameName: 'ORBIT',
                isUnlocked: true,
                rarity: 'rare',
                points: 60
            });
        }

        return mockAchievements;
    }, [games]);

    // Filter achievements
    const filteredAchievements = useMemo(() => {
        return achievements.filter(achievement => {
            // Filter by unlock status
            if (filter === 'unlocked' && !achievement.isUnlocked) return false;
            if (filter === 'locked' && achievement.isUnlocked) return false;

            // Filter by game
            if (selectedGame !== 'all' && achievement.gameId !== selectedGame) return false;

            // Filter by search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    achievement.name.toLowerCase().includes(query) ||
                    achievement.description.toLowerCase().includes(query) ||
                    achievement.gameName.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [achievements, filter, selectedGame, searchQuery]);

    // Stats
    const totalPoints = achievements.filter(a => a.isUnlocked).reduce((sum, a) => sum + a.points, 0);
    const unlockedCount = achievements.filter(a => a.isUnlocked).length;
    const totalCount = achievements.length;

    return (
        <div className="achievements-page">
            {/* Header */}
            <header className="achievements-header">
                <div className="header-content">
                    <div className="header-title">
                        <Trophy size={28} />
                        <div>
                            <h1>Logros</h1>
                            <p>Desbloquea logros jugando tus juegos favoritos</p>
                        </div>
                    </div>
                    <div className="header-stats">
                        <div className="stat-badge">
                            <Sparkles size={18} />
                            <span className="stat-value">{totalPoints}</span>
                            <span className="stat-label">Puntos</span>
                        </div>
                        <div className="stat-badge">
                            <Unlock size={18} />
                            <span className="stat-value">{unlockedCount}/{totalCount}</span>
                            <span className="stat-label">Desbloqueados</span>
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="progress-text">
                        {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}% completado
                    </span>
                </div>
            </header>

            {/* Toolbar */}
            <div className="achievements-toolbar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar logros..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="filter-group">
                    <select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        className="game-filter"
                    >
                        <option value="all">Todos los juegos</option>
                        <option value="global">ORBIT</option>
                        {games.map(game => (
                            <option key={game.id} value={game.id}>{game.title}</option>
                        ))}
                    </select>

                    <div className="filter-buttons">
                        <button
                            className={filter === 'all' ? 'active' : ''}
                            onClick={() => setFilter('all')}
                        >
                            Todos
                        </button>
                        <button
                            className={filter === 'unlocked' ? 'active' : ''}
                            onClick={() => setFilter('unlocked')}
                        >
                            <Unlock size={14} /> Desbloqueados
                        </button>
                        <button
                            className={filter === 'locked' ? 'active' : ''}
                            onClick={() => setFilter('locked')}
                        >
                            <Lock size={14} /> Bloqueados
                        </button>
                    </div>
                </div>
            </div>

            {/* Achievements Grid */}
            <div className="achievements-content">
                {filteredAchievements.length > 0 ? (
                    <motion.div className="achievements-grid" layout>
                        <AnimatePresence mode="popLayout">
                            {filteredAchievements.map((achievement, index) => {
                                const RarityIcon = rarityConfig[achievement.rarity].icon;
                                return (
                                    <motion.div
                                        key={achievement.id}
                                        className={`achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: index * 0.02 }}
                                    >
                                        <div className={`achievement-icon rarity-${achievement.rarity}`}>
                                            <span className="icon-emoji">{achievement.icon}</span>
                                            {!achievement.isUnlocked && (
                                                <div className="lock-overlay">
                                                    <Lock size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="achievement-info">
                                            <h3>{achievement.name}</h3>
                                            <p>{achievement.description}</p>
                                            <div className="achievement-meta">
                                                <span className="game-badge">
                                                    <Gamepad2 size={12} />
                                                    {achievement.gameName}
                                                </span>
                                                <span
                                                    className="rarity-badge"
                                                    style={{ color: rarityConfig[achievement.rarity].color }}
                                                >
                                                    <RarityIcon size={12} />
                                                    {rarityConfig[achievement.rarity].label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="achievement-points">
                                            <span className="points-value">{achievement.points}</span>
                                            <span className="points-label">pts</span>
                                        </div>
                                        {achievement.isUnlocked && achievement.unlockedAt && (
                                            <div className="unlock-date">
                                                {new Date(achievement.unlockedAt).toLocaleDateString('es', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="empty-state">
                        <Trophy size={64} />
                        <h3>
                            {games.length === 0
                                ? 'Agrega juegos para desbloquear logros'
                                : 'Sin logros encontrados'
                            }
                        </h3>
                        <p>
                            {games.length === 0
                                ? 'Los logros se desbloquean automáticamente al jugar tus juegos'
                                : 'Intenta cambiar los filtros de búsqueda'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
