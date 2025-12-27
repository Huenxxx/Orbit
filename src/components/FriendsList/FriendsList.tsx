import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserPlus,
    Search,
    X,
    Check,
    Clock,
    Gamepad2,
    MoreVertical,
    UserMinus,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Loader2
} from 'lucide-react';
import { useFriendsStore } from '../../stores/friendsStore';
import { useAuthStore } from '../../stores/authStore';
import type { Friend } from '../../types/social';
import { useLinkedAccountsStore } from '../../stores/linkedAccountsStore';
import './FriendsList.css';

// Steam icon SVG component
const SteamIcon = ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.628 3.875 10.35 9.101 11.647l2.063-2.063a8.002 8.002 0 0 1-4.164-4.164l-2.063 2.063A11.944 11.944 0 0 1 0 12C0 5.373 5.373 0 12 0zm0 2.182c-5.422 0-9.818 4.396-9.818 9.818 0 2.164.7 4.164 1.885 5.79l3.344-3.344a3.27 3.27 0 0 1 2.952-4.355c.182-.009.364.006.545.042l1.974-2.84a5.09 5.09 0 0 1 5.09 5.09v.364l2.814-1.974a3.273 3.273 0 0 1 4.396 2.952c.009.182-.006.364-.042.545l3.344 3.344a9.772 9.772 0 0 0 1.885-5.79c0-5.422-4.396-9.818-9.818-9.818z" />
        <circle cx="8.5" cy="14.5" r="2.5" />
        <circle cx="16" cy="9" r="2" />
    </svg>
);

export function FriendsList() {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string; username: string; avatar: string | null }[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [friendMenuOpen, setFriendMenuOpen] = useState<string | null>(null);

    const { user, userData } = useAuthStore();
    const {
        friends,
        friendRequests,
        isLoading,
        error,
        loadFriends,
        loadFriendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
        searchUsers,
        subscribeToFriends,
        clearError
    } = useFriendsStore();

    const { steamAccount, steamFriends, isLoadingFriends: isLoadingSteamFriends, getSteamFriends } = useLinkedAccountsStore();

    // Load friends on mount
    useEffect(() => {
        if (user?.uid) {
            loadFriends(user.uid);
            loadFriendRequests(user.uid);

            // Subscribe to real-time updates
            const unsubscribe = subscribeToFriends(user.uid);
            return () => unsubscribe();
        }
    }, [user?.uid, loadFriends, loadFriendRequests, subscribeToFriends]);

    // Load steam friends when connected
    useEffect(() => {
        if (steamAccount) {
            getSteamFriends();
            // Optional: Set up an interval for refreshing steam friends
            const interval = setInterval(() => getSteamFriends(), 180000); // 3 minutes
            return () => clearInterval(interval);
        }
    }, [steamAccount, getSteamFriends]);

    // Search users with debounce
    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.length >= 2) {
            setIsSearching(true);
            const results = await searchUsers(query);
            // Filter out current user and existing friends
            const filteredResults = results.filter(
                (r) => r.id !== user?.uid && !friends.some((f) => f.id === r.id)
            );
            setSearchResults(filteredResults);
            setIsSearching(false);
        } else {
            setSearchResults([]);
        }
    }, [searchUsers, user?.uid, friends]);

    const handleSendRequest = async (username: string) => {
        if (!user?.uid || !userData) return;

        try {
            await sendFriendRequest(
                user.uid,
                userData.displayUsername || userData.username,
                userData.avatar,
                username
            );
            setSearchQuery('');
            setSearchResults([]);
            setShowAddFriend(false);
        } catch (err) {
            // Error is handled by the store
        }
    };

    const handleAcceptRequest = async (requestId: string) => {
        if (!user?.uid) return;
        await acceptFriendRequest(requestId, user.uid);
    };

    const handleRemoveFriend = async (friendId: string) => {
        if (!user?.uid) return;
        await removeFriend(user.uid, friendId);
        setFriendMenuOpen(null);
    };

    const getStatusColor = (status: Friend['status']) => {
        switch (status) {
            case 'online': return 'var(--color-success)';
            case 'in-game': return 'var(--color-primary-light)';
            case 'away': return '#fbbf24';
            case 'busy': return '#f87171';
            default: return 'var(--text-muted)';
        }
    };

    const getStatusText = (friend: Friend) => {
        switch (friend.status) {
            case 'in-game': return `Jugando a ${friend.currentGame || 'un juego'}`;
            case 'online': return 'En línea';
            case 'away': return 'Ausente';
            case 'busy': return 'Ocupado';
            default: return 'Desconectado';
        }
    };

    const getSteamStatusColor = (state: string, inGame: boolean) => {
        if (inGame) return '#57cbde';
        switch (state) {
            case 'online': return '#66c0f4';
            case 'away':
            case 'snooze': return '#fbbf24';
            case 'busy': return '#f87171';
            default: return '#898989';
        }
    };

    const onlineFriends = friends.filter((f) => f.status !== 'offline');
    const offlineFriends = friends.filter((f) => f.status === 'offline');

    // Split steam friends by status
    const onlineSteamFriends = steamFriends.filter(f => f.personaStateString !== 'offline');
    const offlineSteamFriends = steamFriends.filter(f => f.personaStateString === 'offline');

    const hasAnyFriends = friends.length > 0 || steamFriends.length > 0;
    const totalOnlineCount = onlineFriends.length + onlineSteamFriends.length;

    return (
        <div className="friends-list">
            {/* Header */}
            <div className="friends-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="friends-header-left">
                    <Users size={18} />
                    <span>Amigos</span>
                    {totalOnlineCount > 0 && (
                        <span className="friends-online-count">{totalOnlineCount}</span>
                    )}
                </div>
                <div className="friends-header-actions">
                    <button
                        className="friends-action-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowAddFriend(!showAddFriend);
                        }}
                        title="Añadir amigo"
                    >
                        <UserPlus size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {/* Friend Requests */}
            <AnimatePresence>
                {isExpanded && friendRequests.length > 0 && (
                    <motion.div
                        className="friend-requests"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="friend-requests-header">
                            <Clock size={14} />
                            <span>Solicitudes pendientes ({friendRequests.length})</span>
                        </div>
                        {friendRequests.map((request) => (
                            <div key={request.id} className="friend-request-item">
                                <div className="friend-avatar">
                                    {request.fromAvatar ? (
                                        <img src={request.fromAvatar} alt={request.fromUsername} />
                                    ) : (
                                        <div className="friend-avatar-placeholder">
                                            {request.fromUsername[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="friend-info">
                                    <span className="friend-name">{request.fromUsername}</span>
                                    <span className="friend-status">Quiere ser tu amigo</span>
                                </div>
                                <div className="friend-request-actions">
                                    <button
                                        className="request-btn accept"
                                        onClick={() => handleAcceptRequest(request.id)}
                                        title="Aceptar"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        className="request-btn reject"
                                        onClick={() => rejectFriendRequest(request.id)}
                                        title="Rechazar"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Friend Panel */}
            <AnimatePresence>
                {showAddFriend && (
                    <motion.div
                        className="add-friend-panel"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="add-friend-input-wrapper">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar usuario..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                autoFocus
                            />
                            {isSearching && <Loader2 size={16} className="spinner" />}
                        </div>

                        {error && (
                            <div className="add-friend-error">
                                {error}
                                <button onClick={clearError}><X size={14} /></button>
                            </div>
                        )}

                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map((result) => (
                                    <div key={result.id} className="search-result-item">
                                        <div className="friend-avatar small">
                                            {result.avatar ? (
                                                <img src={result.avatar} alt={result.username} />
                                            ) : (
                                                <div className="friend-avatar-placeholder">
                                                    {result.username[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="search-result-name">{result.username}</span>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => handleSendRequest(result.username)}
                                            disabled={isLoading}
                                        >
                                            <UserPlus size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                            <p className="no-results">No se encontraron usuarios</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Friends Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="friends-content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {(isLoading || isLoadingSteamFriends) && friends.length === 0 && steamFriends.length === 0 ? (
                            <div className="friends-loading">
                                <Loader2 size={20} className="spinner" />
                            </div>
                        ) : !hasAnyFriends ? (
                            <div className="friends-empty">
                                <Users size={24} />
                                <p>No tienes amigos aún</p>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => setShowAddFriend(true)}
                                >
                                    <UserPlus size={14} />
                                    Añadir amigo
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Orbit Online Friends */}
                                {onlineFriends.length > 0 && (
                                    <div className="friends-section">
                                        <div className="friends-section-header">
                                            Orbit — {onlineFriends.length}
                                        </div>
                                        {onlineFriends.map((friend) => (
                                            <FriendItem
                                                key={friend.id}
                                                friend={friend}
                                                menuOpen={friendMenuOpen === friend.id}
                                                onMenuToggle={() => setFriendMenuOpen(
                                                    friendMenuOpen === friend.id ? null : friend.id
                                                )}
                                                onRemove={() => handleRemoveFriend(friend.id)}
                                                getStatusColor={getStatusColor}
                                                getStatusText={getStatusText}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Steam Online Friends */}
                                {onlineSteamFriends.length > 0 && (
                                    <div className="friends-section">
                                        <div className="friends-section-header">
                                            Steam — {onlineSteamFriends.length}
                                        </div>
                                        {onlineSteamFriends.map((friend) => (
                                            <div key={friend.steamId} className={`friend-item steam-sidebar ${friend.currentGame ? 'in-game' : ''}`}>
                                                <div className="friend-avatar-sidebar">
                                                    <img src={friend.avatarFull} alt={friend.personaName} className="steam-avatar-img" />
                                                    <div
                                                        className="friend-status-indicator"
                                                        style={{ backgroundColor: getSteamStatusColor(friend.personaStateString, !!friend.currentGame) }}
                                                    />
                                                    <div className="steam-badge-sidebar">
                                                        <SteamIcon size={10} />
                                                    </div>
                                                </div>
                                                <div className="friend-info">
                                                    <span className="friend-name">{friend.personaName}</span>
                                                    <span className="friend-status">
                                                        {friend.currentGame ? (
                                                            <>
                                                                <Gamepad2 size={12} />
                                                                Jugando a {friend.currentGame.gameName}
                                                            </>
                                                        ) : (
                                                            friend.personaStateString === 'online' ? 'En línea' :
                                                                friend.personaStateString === 'away' ? 'Ausente' :
                                                                    friend.personaStateString === 'busy' ? 'Ocupado' : 'Conectado'
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Orbit Offline Friends */}
                                {offlineFriends.length > 0 && (
                                    <div className="friends-section">
                                        <div className="friends-section-header">
                                            Desconectados — {offlineFriends.length}
                                        </div>
                                        {offlineFriends.map((friend) => (
                                            <FriendItem
                                                key={friend.id}
                                                friend={friend}
                                                menuOpen={friendMenuOpen === friend.id}
                                                onMenuToggle={() => setFriendMenuOpen(
                                                    friendMenuOpen === friend.id ? null : friend.id
                                                )}
                                                onRemove={() => handleRemoveFriend(friend.id)}
                                                getStatusColor={getStatusColor}
                                                getStatusText={getStatusText}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Steam Offline Friends */}
                                {offlineSteamFriends.length > 0 && (
                                    <div className="friends-section">
                                        <div className="friends-section-header">
                                            Steam Desconectados — {offlineSteamFriends.length}
                                        </div>
                                        {offlineSteamFriends.map((friend) => (
                                            <div key={friend.steamId} className="friend-item steam-sidebar offline">
                                                <div className="friend-avatar-sidebar">
                                                    <img src={friend.avatarFull} alt={friend.personaName} className="steam-avatar-img" />
                                                    <div className="friend-status-indicator" style={{ backgroundColor: '#898989' }} />
                                                    <div className="steam-badge-sidebar">
                                                        <SteamIcon size={10} />
                                                    </div>
                                                </div>
                                                <div className="friend-info">
                                                    <span className="friend-name">{friend.personaName}</span>
                                                    <span className="friend-status">Desconectado</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Friend Item Component
interface FriendItemProps {
    friend: Friend;
    menuOpen: boolean;
    onMenuToggle: () => void;
    onRemove: () => void;
    getStatusColor: (status: Friend['status']) => string;
    getStatusText: (friend: Friend) => string;
}

function FriendItem({ friend, menuOpen, onMenuToggle, onRemove, getStatusColor, getStatusText }: FriendItemProps) {
    return (
        <div className={`friend-item ${friend.status}`}>
            <div className="friend-avatar">
                {friend.avatar ? (
                    <img src={friend.avatar} alt={friend.displayName} />
                ) : (
                    <div className="friend-avatar-placeholder">
                        {friend.displayName[0].toUpperCase()}
                    </div>
                )}
                <div
                    className="friend-status-indicator"
                    style={{ backgroundColor: getStatusColor(friend.status) }}
                />
            </div>
            <div className="friend-info">
                <span className="friend-name">{friend.displayName}</span>
                <span className="friend-status">
                    {friend.status === 'in-game' && <Gamepad2 size={12} />}
                    {getStatusText(friend)}
                </span>
            </div>
            <div className="friend-actions">
                <button
                    className="friend-menu-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMenuToggle();
                    }}
                >
                    <MoreVertical size={16} />
                </button>
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div
                            className="friend-menu"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <button className="friend-menu-item">
                                <MessageSquare size={14} />
                                Enviar mensaje
                            </button>
                            <button className="friend-menu-item danger" onClick={onRemove}>
                                <UserMinus size={14} />
                                Eliminar amigo
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
