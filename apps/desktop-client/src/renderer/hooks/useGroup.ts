import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { useLibp2p } from './useApi';

interface Group {
  groupId: string;
  name: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: number;
  groupKey?: string;
  settings: GroupSettings;
}

interface GroupMember {
  peerId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  nickname?: string;
}

interface GroupSettings {
  allowMemberInvite: boolean;
  allowMemberRemove: boolean;
  maxMembers: number;
}

interface InviteBlob {
  version: number;
  groupId: string;
  groupName: string;
  inviterId: string;
  encryptedGroupKey: {
    nonce: string;
    ciphertext: string;
  };
  passwordHash?: string;
  signature: string;
  expiresAt: number;
}

export function useGroup() {
  const { sendMessage, dialPeer } = useLibp2p();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate group key
  const generateGroupKey = useCallback((): string => {
    return crypto.randomBytes(32).toString('base64');
  }, []);

  // Encrypt group key
  const encryptGroupKey = useCallback((groupKey: string, password?: string): { nonce: string; ciphertext: string } => {
    const key = password 
      ? crypto.scryptSync(password, 'salt', 32)
      : crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    const ciphertext = Buffer.concat([
      cipher.update(groupKey, 'utf8'),
      cipher.final(),
    ]).toString('base64');
    
    return {
      nonce: nonce.toString('base64'),
      ciphertext,
    };
  }, []);

  // Decrypt group key
  const decryptGroupKey = useCallback((encrypted: { nonce: string; ciphertext: string }, password?: string): string | null => {
    try {
      const key = password
        ? crypto.scryptSync(password, 'salt', 32)
        : crypto.randomBytes(32);
      
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(encrypted.nonce, 'base64')
      );
      
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
      
      return decrypted;
    } catch {
      return null;
    }
  }, []);

  // Create group
  const createGroup = useCallback(async (
    name: string,
    ownerPeerId: string,
    password?: string
  ): Promise<Group> => {
    const groupId = uuidv4();
    const groupKey = generateGroupKey();
    
    const encryptedGroupKey = encryptGroupKey(groupKey, password);
    
    const group: Group = {
      groupId,
      name,
      ownerId: ownerPeerId,
      members: [{
        peerId: ownerPeerId,
        role: 'owner',
        joinedAt: Date.now(),
      }],
      createdAt: Date.now(),
      groupKey,
      settings: {
        allowMemberInvite: true,
        allowMemberRemove: true,
        maxMembers: 100,
      },
    };

    setGroups(prev => [...prev, group]);
    return group;
  }, [generateGroupKey, encryptGroupKey]);

  // Create invite blob
  const createInvite = useCallback((
    group: Group,
    inviterPeerId: string,
    password?: string
  ): InviteBlob => {
    const encryptedGroupKey = encryptGroupKey(group.groupKey || '', password);
    
    // Generate signature (simplified - in production use proper Ed25519)
    const signature = crypto.createHash('sha256')
      .update(`${group.groupId}${inviterPeerId}${Date.now()}`)
      .digest('base64');

    return {
      version: 1,
      groupId: group.groupId,
      groupName: group.name,
      inviterId: inviterPeerId,
      encryptedGroupKey,
      passwordHash: password ? crypto.createHash('sha256').update(password).digest('hex') : undefined,
      signature,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }, [encryptGroupKey]);

  // Join group from invite
  const joinGroup = useCallback((
    invite: InviteBlob,
    peerId: string,
    password?: string
  ): Group | null => {
    // Check expiry
    if (invite.expiresAt < Date.now()) {
      setError('邀请已过期');
      return null;
    }

    // Check password if required
    if (invite.passwordHash && password) {
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      if (passwordHash !== invite.passwordHash) {
        setError('密码错误');
        return null;
      }
    }

    // Decrypt group key
    const groupKey = decryptGroupKey(invite.encryptedGroupKey, password);
    if (!groupKey) {
      setError('无法解密群组密钥');
      return null;
    }

    // Create group
    const group: Group = {
      groupId: invite.groupId,
      name: invite.groupName,
      ownerId: invite.inviterId,
      members: [{
        peerId: peerId,
        role: 'member',
        joinedAt: Date.now(),
      }],
      createdAt: Date.now(),
      groupKey,
      settings: {
        allowMemberInvite: true,
        allowMemberRemove: true,
        maxMembers: 100,
      },
    };

    setGroups(prev => [...prev, group]);
    return group;
  }, [decryptGroupKey]);

  // Send group message (simplified - in production use proper encryption)
  const sendGroupMessage = useCallback(async (
    group: Group,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // For now, send to each member (in production use proper group protocol)
      for (const member of group.members) {
        if (member.peerId !== group.ownerId) {
          await sendMessage(member.peerId, message);
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [sendMessage]);

  // Remove member (owner only)
  const removeMember = useCallback((
    groupId: string,
    memberPeerId: string,
    operatorPeerId: string
  ): boolean => {
    const group = groups.find(g => g.groupId === groupId);
    if (!group) return false;

    // Only owner can remove members
    if (group.ownerId !== operatorPeerId) return false;

    setGroups(prev => prev.map(g => {
      if (g.groupId === groupId) {
        return {
          ...g,
          members: g.members.filter(m => m.peerId !== memberPeerId),
        };
      }
      return g;
    }));

    return true;
  }, [groups]);

  // Leave group
  const leaveGroup = useCallback((
    groupId: string,
    peerId: string
  ): boolean => {
    const group = groups.find(g => g.groupId === groupId);
    if (!group) return false;

    // Owner cannot leave, must disband
    if (group.ownerId === peerId) {
      setGroups(prev => prev.filter(g => g.groupId !== groupId));
      return true;
    }

    setGroups(prev => prev.map(g => {
      if (g.groupId === groupId) {
        return {
          ...g,
          members: g.members.filter(m => m.peerId !== peerId),
        };
      }
      return g;
    }));

    return true;
  }, [groups]);

  return {
    groups,
    loading,
    error,
    createGroup,
    createInvite,
    joinGroup,
    sendGroupMessage,
    removeMember,
    leaveGroup,
  };
}