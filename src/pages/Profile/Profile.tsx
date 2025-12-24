import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    User,
    Edit2,
    Camera,
    Gamepad2,
    Clock,
    Trophy,
    Target,
    Calendar,
    TrendingUp,
    Star,
    Award,
    Save,
    X,
    Loader2
} from 'lucide-react';
import { useProfileStore, useGamesStore } from '../../stores';
import { useAuthStore } from '../../stores/authStore';
import './Profile.css';

export function Profile() {
    const { profile, loadProfile, updateProfile } = useProfileStore();
    const { games, loadGames } = useGamesStore();
    const { user, userData } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState({
        username: '',
        bio: ''
    });

    useEffect(() => {
        loadProfile();
        loadGames();
    }, []);

    // Use Firebase user data if available, otherwise use local profile
    const displayName = user?.displayName || userData?.username || profile?.username || 'Jugador';
    const displayAvatar = user?.photoURL || userData?.avatar || profile?.avatar || null;
    const displayEmail = user?.email || '';

    useEffect(() => {
        setEditData({
            username: displayName,
            bio: profile?.bio || ''
        });
    }, [profile, user, userData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                username: editData.username,
                bio: editData.bio
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const totalPlaytime = games.reduce((acc, g) => acc + g.playtime, 0);
    const completedGames = games.filter(g => g.status === 'completed').length;
    const favoriteGenre = getMostCommonGenre(games);

    function getMostCommonGenre(games: any[]): string {
        const genreCount: Record<string, number> = {};
        games.forEach(game => {
            if (game.genres) {
                game.genres.forEach((genre: string) => {
                    genreCount[genre] = (genreCount[genre] || 0) + 1;
                });
            }
        });
        const sorted = Object.entries(genreCount).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || 'N/A';
    }

    const formatPlaytime = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    };

    const recentActivity = games
        .filter(g => g.lastPlayed)
        .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
        .slice(0, 5);

    const stats = [
        { icon: <Gamepad2 size={20} />, label: 'Juegos', value: games.length, color: 'primary' },
        { icon: <Clock size={20} />, label: 'Tiempo jugado', value: formatPlaytime(totalPlaytime), color: 'secondary' },
        { icon: <Target size={20} />, label: 'Completados', value: completedGames, color: 'accent' },
        { icon: <Trophy size={20} />, label: 'Logros', value: profile?.stats?.achievementsUnlocked || 0, color: 'success' },
    ];

    return (
        <motion.div
            className="profile-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Profile Header */}
            <motion.div
                className="profile-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="profile-cover">
                    <div className="cover-gradient"></div>
                </div>

                <div className="profile-info">
                    <div className="avatar-container">
                        <div className="avatar">
                            {displayAvatar ? (
                                <img src={displayAvatar} alt="Avatar" />
                            ) : (
                                <User size={48} />
                            )}
                        </div>
                        <button className="avatar-edit" title="Cambiar avatar">
                            <Camera size={14} />
                        </button>
                        <div className={`status-indicator ${profile?.status || 'online'}`}></div>
                    </div>

                    <div className="profile-details">
                        {isEditing ? (
                            <div className="edit-form">
                                <input
                                    type="text"
                                    className="input edit-username"
                                    value={editData.username}
                                    onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))}
                                    placeholder="Tu nombre"
                                />
                                <textarea
                                    className="input edit-bio"
                                    value={editData.bio}
                                    onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                                    placeholder="Una breve bio..."
                                    rows={2}
                                />
                                <div className="edit-actions">
                                    <button className="btn btn-ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                                        <X size={16} /> Cancelar
                                    </button>
                                    <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
                                        {isSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1>{displayName}</h1>
                                {displayEmail && <p className="email">{displayEmail}</p>}
                                <p className="bio">{profile?.bio || 'Sin bio configurada'}</p>
                                <div className="profile-meta">
                                    <span className="member-since">
                                        <Calendar size={14} />
                                        Miembro desde {new Date(profile?.createdAt || Date.now()).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {!isEditing && (
                        <button className="btn btn-secondary edit-profile-btn" onClick={() => setIsEditing(true)}>
                            <Edit2 size={16} />
                            Editar perfil
                        </button>
                    )}
                </div>
            </motion.div>

            <div className="profile-content">
                {/* Stats Grid */}
                <motion.section
                    className="stats-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h2>Estadísticas</h2>
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                className={`stat-card stat-${stat.color}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 + index * 0.05 }}
                            >
                                <div className="stat-icon">{stat.icon}</div>
                                <div className="stat-content">
                                    <span className="stat-value">{stat.value}</span>
                                    <span className="stat-label">{stat.label}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                <div className="profile-columns">
                    {/* Recent Activity */}
                    <motion.section
                        className="activity-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2>
                            <TrendingUp size={18} />
                            Actividad reciente
                        </h2>

                        {recentActivity.length > 0 ? (
                            <div className="activity-list">
                                {recentActivity.map((game, index) => (
                                    <motion.div
                                        key={game.id}
                                        className="activity-item"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 + index * 0.05 }}
                                    >
                                        <div
                                            className="activity-cover"
                                            style={{ backgroundImage: game.coverImage ? `url(${game.coverImage})` : undefined }}
                                        >
                                            {!game.coverImage && <Gamepad2 size={16} />}
                                        </div>
                                        <div className="activity-info">
                                            <span className="activity-title">{game.title}</span>
                                            <span className="activity-time">
                                                {new Date(game.lastPlayed!).toLocaleDateString('es', {
                                                    day: 'numeric',
                                                    month: 'short'
                                                })}
                                                {' · '}
                                                {formatPlaytime(game.playtime)}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-activity">
                                <Clock size={32} />
                                <p>Sin actividad reciente</p>
                            </div>
                        )}
                    </motion.section>

                    {/* Highlights */}
                    <motion.section
                        className="highlights-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <h2>
                            <Award size={18} />
                            Destacados
                        </h2>

                        <div className="highlights-grid">
                            <div className="highlight-card">
                                <Star size={24} />
                                <span className="highlight-label">Género favorito</span>
                                <span className="highlight-value">{favoriteGenre}</span>
                            </div>

                            <div className="highlight-card">
                                <TrendingUp size={24} />
                                <span className="highlight-label">Promedio sesión</span>
                                <span className="highlight-value">
                                    {games.length > 0
                                        ? formatPlaytime(Math.round(totalPlaytime / games.length))
                                        : 'N/A'
                                    }
                                </span>
                            </div>
                        </div>
                    </motion.section>
                </div>
            </div>
        </motion.div>
    );
}
