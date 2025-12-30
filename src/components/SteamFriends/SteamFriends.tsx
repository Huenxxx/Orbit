import { useEffect, useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { ipc } from '../../services/ipc';
import './SteamFriends.css';

interface SteamFriend {
    steamId: string;
    personaName: string;
    avatarMedium: string;
    personaStateString: string;
    currentGame?: {
        gameId: string;
        gameName: string;
    } | null;
}

interface SteamFriendsProps {
    appId: number;
    steamId: string | undefined;
}

export function SteamFriends({ appId, steamId }: SteamFriendsProps) {
    const [friends, setFriends] = useState<SteamFriend[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFriends = async () => {
            if (!steamId) {
                setLoading(false);
                return;
            }

            try {
                const result = await ipc.invoke<{ success: boolean; friends: SteamFriend[] }>('steam-get-friends', steamId);

                if (result && result.success && result.friends) {
                    // Filter friends who are playing THIS game
                    const playingThisGame = result.friends.filter((friend: SteamFriend) =>
                        friend.currentGame?.gameId === appId.toString()
                    );
                    setFriends(playingThisGame);
                }
            } catch (err) {
                console.error('Error fetching Steam friends:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFriends();

        // Refresh every 2 minutes
        const interval = setInterval(fetchFriends, 120000);
        return () => clearInterval(interval);
    }, [appId, steamId]);

    if (loading) {
        return (
            <div className="steam-friends-loading">
                <Loader2 size={16} className="spinning" />
                <span>Cargando amigos...</span>
            </div>
        );
    }

    if (friends.length === 0) {
        return null; // Don't show anything if no friends are playing
    }

    return (
        <div className="steam-friends-section">
            <div className="section-header">
                <Users size={18} />
                <h3>Amigos jugando</h3>
                <span className="friends-count">{friends.length}</span>
            </div>

            <div className="friends-list-horizontal">
                {friends.map(friend => (
                    <div key={friend.steamId} className="friend-item-mini" title={`${friend.personaName} está jugando`}>
                        <div className="steam-game-avatar-container">
                            <img src={friend.avatarMedium} alt={friend.personaName} className="steam-game-avatar" />
                            <div className="steam-game-status-badge in-game"></div>
                        </div>
                        <span className="friend-name-mini">{friend.personaName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
