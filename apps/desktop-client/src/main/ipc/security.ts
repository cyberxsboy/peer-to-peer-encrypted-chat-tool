import * as crypto from 'crypto';
import log from 'electron-log';

// Memory zeroization utilities
export function zeroize(buffer: Buffer): void {
  if (buffer && buffer.length > 0) {
    buffer.fill(0);
  }
}

export function zeroizeArray(array: Uint8Array): void {
  if (array && array.length > 0) {
    array.fill(0);
  }
}

// Secure random generation
export function secureRandom(bytes: number): Buffer {
  return crypto.randomBytes(bytes);
}

// Constant-time comparison (prevent timing attacks)
export function secureCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Hash function (SHA-256)
export function hash(data: string | Buffer): Buffer {
  return crypto.createHash('sha256').update(data).digest();
}

// Key derivation (PBKDF2)
export function deriveKey(
  password: string,
  salt: Buffer,
  iterations: number = 100000,
  keyLength: number = 32
): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
}

// Argon2id implementation (using libsodium-wrappers style)
// Note: In production, use the actual argon2 library
export interface Argon2Params {
  timeCost?: number;
  memoryCost?: number;
  parallelism?: number;
}

export async function argon2Hash(
  password: string,
  params: Argon2Params = {}
): Promise<{ hash: Buffer; salt: Buffer }> {
  const {
    timeCost = 2,
    memoryCost = 65536,
    parallelism = 4,
  } = params;
  
  const salt = crypto.randomBytes(16);
  
  // Simplified argon2-like hash using scrypt as alternative
  // In production, use actual argon2 library
  const key = crypto.scryptSync(
    password,
    salt,
    32,
    {
      N: 16384,
      r: 8,
      p: parallelism,
    }
  );
  
  return { hash: key, salt };
}

export async function argon2Verify(
  password: string,
  hash: Buffer,
  salt: Buffer
): Promise<boolean> {
  const key = crypto.scryptSync(password, salt, 32, {
    N: 16384,
    r: 8,
    p: 4,
  });
  
  return secureCompare(key, hash);
}

// Rate limiting (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || record.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }
  
  if (record.count >= maxAttempts) {
    return false;
  }
  
  record.count++;
  return true;
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

// Session management with expiration
interface SessionData {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
}

const sessions = new Map<string, SessionData>();
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_MAX_IDLE = 30 * 60 * 1000; // 30 minutes idle

export function createSession(userId: string): string {
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  
  sessions.set(sessionId, {
    id: sessionId,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_EXPIRY,
    lastActivity: now,
  });
  
  return sessionId;
}

export function validateSession(sessionId: string): SessionData | null {
  const session = sessions.get(sessionId);
  const now = Date.now();
  
  if (!session) return null;
  
  // Check expiration
  if (session.expiresAt < now) {
    sessions.delete(sessionId);
    return null;
  }
  
  // Check idle timeout
  if (session.lastActivity + SESSION_MAX_IDLE < now) {
    sessions.delete(sessionId);
    return null;
  }
  
  // Update last activity
  session.lastActivity = now;
  
  return session;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

// Audit logging (for security events)
interface AuditEvent {
  timestamp: number;
  type: string;
  userId?: string;
  ipAddress?: string;
  details: any;
}

const auditLog: AuditEvent[] = [];
const MAX_AUDIT_LOG = 1000;

export function auditLogEvent(event: Omit<AuditEvent, 'timestamp'>): void {
  const fullEvent: AuditEvent = {
    ...event,
    timestamp: Date.now(),
  };
  
  auditLog.push(fullEvent);
  
  // Keep log size manageable
  if (auditLog.length > MAX_AUDIT_LOG) {
    auditLog.shift();
  }
  
  // Also log to file
  log.info('AUDIT:', JSON.stringify(fullEvent));
}

export function getAuditLog(limit: number = 100): AuditEvent[] {
  return auditLog.slice(-limit);
}

// IPC handler for security operations
export function setupSecurityIpc(ipcMain: any): void {
  // Generate secure random
  ipcMain.handle('security:generateRandom', async (_, length: number) => {
    try {
      const random = crypto.randomBytes(length);
      return { success: true, data: random.toString('base64') };
    } catch (error: any) {
      return { error: error.message };
    }
  });

  // Hash data
  ipcMain.handle('security:hash', async (_, data: string) => {
    try {
      const hashResult = hash(data);
      return { success: true, data: hashResult.toString('base64') };
    } catch (error: any) {
      return { error: error.message };
    }
  });

  // Verify hash
  ipcMain.handle('security:verifyHash', async (_, data: string, hashStr: string) => {
    try {
      const hashResult = hash(data);
      const matches = secureCompare(hashResult, Buffer.from(hashStr, 'base64'));
      return { success: true, matches };
    } catch (error: any) {
      return { error: error.message };
    }
  });

  // Derive key
  ipcMain.handle('security:deriveKey', async (_, password: string, saltStr: string) => {
    try {
      const salt = Buffer.from(saltStr, 'base64');
      const key = deriveKey(password, salt);
      return { success: true, data: key.toString('base64') };
    } catch (error: any) {
      return { error: error.message };
    }
  });

  // Rate limit check
  ipcMain.handle('security:checkRateLimit', async (_, identifier: string, maxAttempts?: number) => {
    const allowed = checkRateLimit(identifier, maxAttempts);
    return { success: true, allowed };
  });

  // Reset rate limit
  ipcMain.handle('security:resetRateLimit', async (_, identifier: string) => {
    resetRateLimit(identifier);
    return { success: true };
  });

  // Session create
  ipcMain.handle('security:createSession', async (_, userId: string) => {
    try {
      const sessionId = createSession(userId);
      return { success: true, data: sessionId };
    } catch (error: any) {
      return { error: error.message };
    }
  });

  // Session validate
  ipcMain.handle('security:validateSession', async (_, sessionId: string) => {
    const session = validateSession(sessionId);
    if (session) {
      return { success: true, data: { userId: session.userId } };
    }
    return { success: false, error: 'Invalid session' };
  });

  // Session destroy
  ipcMain.handle('security:destroySession', async (_, sessionId: string) => {
    destroySession(sessionId);
    return { success: true };
  });

  // Audit log
  ipcMain.handle('security:auditLog', async (_, type: string, details: any, userId?: string, ipAddress?: string) => {
    auditLogEvent({ type, userId, ipAddress, details });
    return { success: true };
  });

  log.info('Security IPC handlers registered');
}

export default {
  zeroize,
  zeroizeArray,
  secureRandom,
  secureCompare,
  hash,
  deriveKey,
  argon2Hash,
  argon2Verify,
  checkRateLimit,
  resetRateLimit,
  createSession,
  validateSession,
  destroySession,
  auditLogEvent,
  getAuditLog,
  setupSecurityIpc,
};