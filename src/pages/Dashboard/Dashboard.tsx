import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Clock,
    Trophy,
    Gamepad2,
    ArrowRight,
    Sparkles,
    Calendar,
    Target
} from 'lucide-react';
import { useGamesStore, useProfileStore, useUIStore } from '../../stores';
import { GameCard } from '../../components/GameCard/GameCard';
import './Dashboard.css';

export function Dashboard() {
    const { games, loadGames, isLoading } = useGamesStore();
    const { profile, loadProfile } = useProfileStore();
    const { setCurrentPage } = useUIStore();

    useEffect(() => {
        loadGames();
        loadProfile();
    }, []);

    // Derived data
    const recentGames = useMemo(() => {
        return [...games]
            .filter(g => g.lastPlayed)
            .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
            .slice(0, 6);
    }, [games]);

    const favoriteGames = useMemo(() => {
        return games.filter(g => g.isFavorite).slice(0, 4);
    }, [games]);

    const totalPlaytime = useMemo(() => {
        return games.reduce((acc, g) => acc + g.playtime, 0);
    }, [games]);

    const formatTotalPlaytime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    };

    const stats = [
        {
            label: 'Juegos en biblioteca',
            value: games.length,
            icon: <Gamepad2 size={20} />,
            color: 'primary'
        },
        {
            label: 'Tiempo total jugado',
            value: formatTotalPlaytime(totalPlaytime),
            icon: <Clock size={20} />,
            color: 'secondary'
        },
        {
            label: 'Logros desbloqueados',
            value: profile?.stats?.achievementsUnlocked || 0,
            icon: <Trophy size={20} />,
            color: 'accent'
        },
        {
            label: 'Juegos completados',
            value: games.filter(g => g.status === 'completed').length,
            icon: <Target size={20} />,
            color: 'success'
        },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="dashboard"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.header className="dashboard-header" variants={itemVariants}>
                <div className="header-content">
                    <h1>
                        Bienvenido de vuelta, <span className="text-gradient">{profile?.username || 'Jugador'}</span>
                    </h1>
                    <p>Tu centro de mando para todos tus juegos</p>
                </div>
                <div className="header-decoration">
                    <div className="orbit-decoration">
                        <div className="planet planet-1"></div>
                        <div className="planet planet-2"></div>
                        <div className="planet planet-3"></div>
                    </div>
                </div>
            </motion.header>

            {/* Stats Grid */}
            <motion.section className="stats-section" variants={itemVariants}>
                <div className="stats-grid">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            className={`stat-card stat-${stat.color}`}
                            whileHover={{ scale: 1.02, y: -4 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                        >
                            <div className="stat-icon">{stat.icon}</div>
                            <div className="stat-content">
                                <span className="stat-value">{stat.value}</span>
                                <span className="stat-label">{stat.label}</span>
                            </div>
                            <div className="stat-glow"></div>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            {/* Recent Games */}
            <motion.section className="section" variants={itemVariants}>
                <div className="section-header">
                    <div className="section-title">
                        <Clock size={20} />
                        <h2>Jugados recientemente</h2>
                    </div>
                    <button className="btn-link" onClick={() => setCurrentPage('library')}>
                        Ver biblioteca <ArrowRight size={16} />
                    </button>
                </div>

                {recentGames.length > 0 ? (
                    <div className="games-grid">
                        {recentGames.map((game, index) => (
                            <motion.div
                                key={game.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <GameCard game={game} />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <Gamepad2 size={48} />
                        <h3>Sin juegos recientes</h3>
                        <p>Agrega juegos a tu biblioteca para empezar a trackear tu actividad</p>
                        <button className="btn btn-primary" onClick={() => setCurrentPage('library')}>
                            <Sparkles size={16} /> Explorar biblioteca
                        </button>
                    </div>
                )}
            </motion.section>

            {/* Favorites */}
            {favoriteGames.length > 0 && (
                <motion.section className="section" variants={itemVariants}>
                    <div className="section-header">
                        <div className="section-title">
                            <Sparkles size={20} />
                            <h2>Tus favoritos</h2>
                        </div>
                    </div>

                    <div className="games-row">
                        {favoriteGames.map((game, index) => (
                            <motion.div
                                key={game.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="favorite-card"
                            >
                                <GameCard game={game} />
                            </motion.div>
                        ))}
                    </div>
                </motion.section>
            )}

            {/* Quick Actions */}
            <motion.section className="quick-actions" variants={itemVariants}>
                <h3>Acciones rápidas</h3>
                <div className="actions-grid">
                    <motion.button
                        className="action-card"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentPage('library')}
                    >
                        <div className="action-icon">
                            <Gamepad2 size={24} />
                        </div>
                        <span>Agregar juego</span>
                    </motion.button>

                    <motion.button
                        className="action-card"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentPage('catalog')}
                    >
                        <div className="action-icon">
                            <TrendingUp size={24} />
                        </div>
                        <span>Explorar catálogo</span>
                    </motion.button>

                    <motion.button
                        className="action-card"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentPage('achievements')}
                    >
                        <div className="action-icon">
                            <Trophy size={24} />
                        </div>
                        <span>Ver logros</span>
                    </motion.button>

                    <motion.button
                        className="action-card"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setCurrentPage('profile')}
                    >
                        <div className="action-icon">
                            <Calendar size={24} />
                        </div>
                        <span>Historial</span>
                    </motion.button>
                </div>
            </motion.section>
        </motion.div>
    );
}
