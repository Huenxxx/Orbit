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
import './FriendsList.css';

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

    const onlineFriends = friends.filter((f) => f.status !== 'offline');
    const offlineFriends = friends.filter((f) => f.status === 'offline');

    return (
        <div className="friends-list">
            {/* Header */}
            <div className="friends-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="friends-header-left">
                    <Users size={18} />
                    <span>Amigos</span>
                    {onlineFriends.length > 0 && (
                        <span className="friends-online-count">{onlineFriends.length}</span>
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

            {/* Friends List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        className="friends-content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {isLoading && friends.length === 0 ? (
                            <div className="friends-loading">
                                <Loader2 size={20} className="spinner" />
                            </div>
                        ) : friends.length === 0 ? (
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
                                {/* Online Friends */}
                                {onlineFriends.length > 0 && (
                                    <div className="friends-section">
                                        <div className="friends-section-header">
                                            En línea — {onlineFriends.length}
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

                                {/* Offline Friends */}
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
