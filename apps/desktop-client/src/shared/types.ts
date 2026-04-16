// Shared types for SecureP2P Chat

// Message types
export enum MessageType {
  TEXT = 0,
  FILE = 1,
  VOICE = 2,
  LINK_PREVIEW = 3,
  INVITE = 4,
  RECEIPT = 5,
  BURN_NOTICE = 6,
}

// Chat message interface
export interface ChatMessage {
  msgId: string;
  from: string;
  to: string;
  type: MessageType;
  content: string;
  timestamp: number;
  replyTo?: string;
  burnAfterSec?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

// Contact interface
export interface Contact {
  peerId: string;
  nickname?: string;
  trusted: boolean;
  addedAt: number;
  lastSeen?: number;
  publicKey?: Uint8Array;
}

// Group member role
export enum MemberRole {
  OWNER = 0,
  ADMIN = 1,
  MEMBER = 2,
}

// Group member
export interface GroupMember {
  peerId: string;
  role: MemberRole;
  joinedAt: number;
  nickname?: string;
}

// Group interface
export interface Group {
  groupId: string;
  name: string;
  ownerId: string;
  members: GroupMember[];
  createdAt: number;
  settings: GroupSettings;
}

// Group settings
export interface GroupSettings {
  allowMemberInvite: boolean;
  allowMemberRemove: boolean;
  maxMembers: number;
}

// Invite blob
export interface InviteBlob {
  version: number;
  groupId: string;
  groupName: string;
  inviterId: string;
  encryptedGroupKey: {
    nonce: Uint8Array;
    ciphertext: Uint8Array;
  };
  passwordHash?: string;
  signature: Uint8Array;
  expiresAt: number;
}

// Link preview
export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
}

// Voice message
export interface VoiceMessage {
  duration: number;
  waveform: number[];
  transcript?: string;
}

// Encrypted payload
export interface EncryptedPayload {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
  tag: Uint8Array;
}

// API response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  message: string;
}