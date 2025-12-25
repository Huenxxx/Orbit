// Friends Store for ORBIT
import { create } from 'zustand';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    orderBy
} from 'firebase/firestore';
import { db } from '../services/firebase';
import type { Friend, FriendRequest } from '../types/social';
import { useNotificationStore } from './notificationStore';

interface FriendsState {
    friends: Friend[];
    friendRequests: FriendRequest[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadFriends: (userId: string) => Promise<void>;
    loadFriendRequests: (userId: string) => Promise<void>;
    sendFriendRequest: (fromUserId: string, fromUsername: string, fromAvatar: string | null, toUsername: string) => Promise<void>;
    acceptFriendRequest: (requestId: string, currentUserId: string) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    removeFriend: (userId: string, friendId: string) => Promise<void>;
    searchUsers: (query: string) => Promise<{ id: string; username: string; avatar: string | null }[]>;
    updateStatus: (userId: string, status: Friend['status'], currentGame?: string) => Promise<void>;
    subscribeToFriends: (userId: string) => () => void;
    clearError: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
    friends: [],
    friendRequests: [],
    isLoading: false,
    error: null,

    loadFriends: async (userId) => {
        if (!db) return;

        set({ isLoading: true, error: null });
        try {
            const friendsRef = collection(db, 'users', userId, 'friends');
            const snapshot = await getDocs(friendsRef);

            const friends: Friend[] = [];
            for (const docSnap of snapshot.docs) {
                const friendData = docSnap.data();
                // Get friend's current status from their user document
                const friendUserDoc = await getDoc(doc(db, 'users', docSnap.id));
                const friendUserData = friendUserDoc.data();

                friends.push({
                    id: docSnap.id,
                    odisea: friendData.odisea || friendUserData?.username || 'Unknown',
                    displayName: friendData.displayName || friendUserData?.displayUsername || friendUserData?.username || 'Unknown',
                    avatar: friendUserData?.avatar || null,
                    status: friendUserData?.status || 'offline',
                    currentGame: friendUserData?.currentGame,
                    lastSeen: friendUserData?.lastSeen?.toMillis?.() || Date.now(),
                    addedAt: friendData.addedAt?.toMillis?.() || Date.now(),
                });
            }

            // Sort: online first, then by name
            friends.sort((a, b) => {
                const statusOrder = { 'in-game': 0, 'online': 1, 'away': 2, 'busy': 3, 'offline': 4 };
                const statusDiff = statusOrder[a.status] - statusOrder[b.status];
                if (statusDiff !== 0) return statusDiff;
                return a.displayName.localeCompare(b.displayName);
            });

            set({ friends, isLoading: false });
        } catch (error: any) {
            console.error('Error loading friends:', error);
            set({ error: error.message, isLoading: false });
        }
    },

    loadFriendRequests: async (userId) => {
        if (!db) return;

        try {
            const requestsRef = collection(db, 'friendRequests');
            const q = query(
                requestsRef,
                where('toUserId', '==', userId),
                where('status', '==', 'pending')
            );
            const snapshot = await getDocs(q);

            const requests: FriendRequest[] = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
                sentAt: docSnap.data().sentAt?.toMillis?.() || Date.now(),
            })) as FriendRequest[];

            set({ friendRequests: requests });
        } catch (error: any) {
            console.error('Error loading friend requests:', error);
        }
    },

    sendFriendRequest: async (fromUserId, fromUsername, fromAvatar, toUsername) => {
        if (!db) throw new Error('Firebase no configurado');

        set({ isLoading: true, error: null });
        try {
            // Find user by username
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', toUsername.toLowerCase()));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                throw new Error('Usuario no encontrado');
            }

            const targetUser = snapshot.docs[0];
            const targetUserId = targetUser.id;

            if (targetUserId === fromUserId) {
                throw new Error('No puedes enviarte una solicitud a ti mismo');
            }

            // Check if already friends
            const existingFriend = await getDoc(doc(db, 'users', fromUserId, 'friends', targetUserId));
            if (existingFriend.exists()) {
                throw new Error('Ya sois amigos');
            }

            // Check if request already exists
            const existingRequestsRef = collection(db, 'friendRequests');
            const existingRequestQuery = query(
                existingRequestsRef,
                where('fromUserId', '==', fromUserId),
                where('toUserId', '==', targetUserId),
                where('status', '==', 'pending')
            );
            const existingRequestSnapshot = await getDocs(existingRequestQuery);

            if (!existingRequestSnapshot.empty) {
                throw new Error('Ya has enviado una solicitud a este usuario');
            }

            // Create friend request
            const requestRef = doc(collection(db, 'friendRequests'));
            await setDoc(requestRef, {
                fromUserId,
                fromUsername,
                fromAvatar,
                toUserId: targetUserId,
                status: 'pending',
                sentAt: serverTimestamp(),
            });

            set({ isLoading: false });
            useNotificationStore.getState().showSuccess('Solicitud enviada', `Solicitud enviada a ${toUsername}`);
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    acceptFriendRequest: async (requestId, currentUserId) => {
        if (!db) return;

        set({ isLoading: true, error: null });
        try {
            const requestRef = doc(db, 'friendRequests', requestId);
            const requestSnap = await getDoc(requestRef);

            if (!requestSnap.exists()) {
                throw new Error('Solicitud no encontrada');
            }

            const requestData = requestSnap.data();

            // Add to both users' friends lists
            const fromUserRef = doc(db, 'users', requestData.fromUserId, 'friends', currentUserId);
            const toUserRef = doc(db, 'users', currentUserId, 'friends', requestData.fromUserId);

            // Get current user's data
            const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
            const currentUserData = currentUserDoc.data();

            await setDoc(fromUserRef, {
                odisea: currentUserData?.username || '',
                displayName: currentUserData?.displayUsername || currentUserData?.username || '',
                addedAt: serverTimestamp(),
            });

            await setDoc(toUserRef, {
                odisea: requestData.fromUsername,
                displayName: requestData.fromUsername,
                addedAt: serverTimestamp(),
            });

            // Update request status
            await updateDoc(requestRef, { status: 'accepted' });

            // Reload friends and requests
            await get().loadFriends(currentUserId);
            await get().loadFriendRequests(currentUserId);

            set({ isLoading: false });
            useNotificationStore.getState().showSuccess('¡Amigo añadido!', `Ahora eres amigo de ${requestData.fromUsername}`);
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    rejectFriendRequest: async (requestId) => {
        if (!db) return;

        try {
            const requestRef = doc(db, 'friendRequests', requestId);
            await updateDoc(requestRef, { status: 'rejected' });

            set((state) => ({
                friendRequests: state.friendRequests.filter((r) => r.id !== requestId),
            }));
        } catch (error: any) {
            console.error('Error rejecting friend request:', error);
        }
    },

    removeFriend: async (userId, friendId) => {
        if (!db) return;

        try {
            // Remove from both users' friends lists
            await deleteDoc(doc(db, 'users', userId, 'friends', friendId));
            await deleteDoc(doc(db, 'users', friendId, 'friends', userId));

            set((state) => ({
                friends: state.friends.filter((f) => f.id !== friendId),
            }));

            useNotificationStore.getState().showInfo('Amigo eliminado', 'El usuario ha sido eliminado de tu lista de amigos');
        } catch (error: any) {
            console.error('Error removing friend:', error);
        }
    },

    searchUsers: async (searchQuery) => {
        if (!db || !searchQuery.trim()) return [];

        try {
            const usersRef = collection(db, 'users');
            // Search by username prefix
            const q = query(
                usersRef,
                where('username', '>=', searchQuery.toLowerCase()),
                where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
                orderBy('username')
            );
            const snapshot = await getDocs(q);

            return snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                username: docSnap.data().displayUsername || docSnap.data().username,
                avatar: docSnap.data().avatar,
            })).slice(0, 10); // Limit to 10 results
        } catch (error: any) {
            console.error('Error searching users:', error);
            return [];
        }
    },

    updateStatus: async (userId, status, currentGame) => {
        if (!db) return;

        try {
            const userRef = doc(db, 'users', userId);
            const updateData: any = {
                status,
                lastSeen: serverTimestamp(),
            };

            if (currentGame !== undefined) {
                updateData.currentGame = currentGame;
            }

            await updateDoc(userRef, updateData);
        } catch (error: any) {
            console.error('Error updating status:', error);
        }
    },

    subscribeToFriends: (userId) => {
        if (!db) return () => { };

        const friendsRef = collection(db, 'users', userId, 'friends');

        const unsubscribe = onSnapshot(friendsRef, async () => {
            // Reload friends when there's a change
            await get().loadFriends(userId);
        });

        return unsubscribe;
    },

    clearError: () => set({ error: null }),
}));
