import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../stores/store';

interface Friend {
  peerId: string;
  nickname?: string;
  trusted: boolean;
  publicKey?: string;
  addedAt: number;
  lastSeen?: number;
}

interface FriendRequest {
  peerId: string;
  publicKey?: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export function useSocial() {
  const userId = useSelector((state: RootState) => state.auth.userId);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [temporaryChats, setTemporaryChats] = useState<Map<string, { allowed: boolean; expiresAt: number }>>(new Map());

  // Load friends from storage
  useEffect(() => {
    const stored = localStorage.getItem('securep2p_friends');
    if (stored) {
      try {
        setFriends(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load friends:', e);
      }
    }
    
    const incoming = localStorage.getItem('securep2p_incoming');
    if (incoming) {
      try {
        setIncomingRequests(JSON.parse(incoming));
      } catch (e) {
        console.error('Failed to load incoming requests:', e);
      }
    }
    
    const outgoing = localStorage.getItem('securep2p_outgoing');
    if (outgoing) {
      try {
        setOutgoingRequests(JSON.parse(outgoing));
      } catch (e) {
        console.error('Failed to load outgoing requests:', e);
      }
    }
    
    const temp = localStorage.getItem('securep2p_temp_chats');
    if (temp) {
      try {
        setTemporaryChats(new Map(JSON.parse(temp)));
      } catch (e) {
        console.error('Failed to load temporary chats:', e);
      }
    }
  }, []);

  // Save to storage
  const saveData = useCallback(() => {
    localStorage.setItem('securep2p_friends', JSON.stringify(friends));
    localStorage.setItem('securep2p_incoming', JSON.stringify(incomingRequests));
    localStorage.setItem('securep2p_outgoing', JSON.stringify(outgoingRequests));
    localStorage.setItem('securep2p_temp_chats', JSON.stringify(Array.from(temporaryChats.entries())));
  }, [friends, incomingRequests, outgoingRequests, temporaryChats]);

  // Add friend
  const addFriend = useCallback((
    peerId: string,
    nickname?: string,
    publicKey?: string
  ): void => {
    const friend: Friend = {
      peerId,
      nickname,
      trusted: true,
      publicKey,
      addedAt: Date.now(),
    };
    
    setFriends(prev => {
      const filtered = prev.filter(f => f.peerId !== peerId);
      return [...filtered, friend];
    });
    
    // Remove from requests
    setIncomingRequests(prev => prev.filter(r => r.peerId !== peerId));
    setOutgoingRequests(prev => prev.filter(r => r.peerId !== peerId));
  }, []);

  // Remove friend
  const removeFriend = useCallback((peerId: string): void => {
    setFriends(prev => prev.filter(f => f.peerId !== peerId));
  }, []);

  // Send friend request
  const sendFriendRequest = useCallback((
    peerId: string,
    publicKey?: string
  ): void => {
    const request: FriendRequest = {
      peerId,
      publicKey,
      createdAt: Date.now(),
      status: 'pending',
    };
    
    setOutgoingRequests(prev => {
      const filtered = prev.filter(r => r.peerId !== peerId);
      return [...filtered, request];
    });
  }, []);

  // Accept friend request
  const acceptFriendRequest = useCallback((peerId: string): void => {
    const request = incomingRequests.find(r => r.peerId === peerId);
    if (request) {
      addFriend(peerId, undefined, request.publicKey);
      setIncomingRequests(prev => 
        prev.map(r => r.peerId === peerId ? { ...r, status: 'accepted' } : r)
      );
    }
  }, [incomingRequests, addFriend]);

  // Reject friend request
  const rejectFriendRequest = useCallback((peerId: string): void => {
    setIncomingRequests(prev => 
      prev.map(r => r.peerId === peerId ? { ...r, status: 'rejected' } : r)
    );
  }, []);

  // Check if can chat (friend or has temporary permission)
  const canChat = useCallback((peerId: string): boolean => {
    // Must be logged in
    if (!userId) return false;
    
    // Check if friend
    const isFriend = friends.some(f => f.peerId === peerId && f.trusted);
    if (isFriend) return true;
    
    // Check temporary chat permission
    const tempChat = temporaryChats.get(peerId);
    if (tempChat && tempChat.allowed && tempChat.expiresAt > Date.now()) {
      return true;
    }
    
    return false;
  }, [userId, friends, temporaryChats]);

  // Allow temporary chat (from stranger's response)
  const allowTemporaryChat = useCallback((peerId: string, durationMs: number = 24 * 60 * 60 * 1000): void => {
    setTemporaryChats(prev => {
      const newMap = new Map(prev);
      newMap.set(peerId, {
        allowed: true,
        expiresAt: Date.now() + durationMs,
      });
      return newMap;
    });
  }, []);

  // Check if peer is friend
  const isFriend = useCallback((peerId: string): boolean => {
    return friends.some(f => f.peerId === peerId && f.trusted);
  }, [friends]);

  // Get short peer ID (for strangers to see)
  const getShortPeerId = useCallback((peerId: string): string => {
    return peerId.substring(0, 8) + '...';
  }, []);

  // Save whenever data changes
  useEffect(() => {
    if (friends.length > 0 || incomingRequests.length > 0 || outgoingRequests.length > 0 || temporaryChats.size > 0) {
      saveData();
    }
  }, [friends, incomingRequests, outgoingRequests, temporaryChats, saveData]);

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    addFriend,
    removeFriend,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    canChat,
    allowTemporaryChat,
    isFriend,
    getShortPeerId,
  };
}