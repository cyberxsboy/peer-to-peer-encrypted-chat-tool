import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 3600; // 7 days

interface TokenPayload {
  userId: string;
  jti: string;
  iat: number;
  exp: number;
}

export function createToken(userId: string, ipAddress: string) {
  const jti = uuidv4();
  
  const accessToken = jwt.sign(
    { userId, jti, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { userId, jti, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return {
    accessToken,
    refreshToken,
    jti,
    expiresAt: Date.now() + REFRESH_TOKEN_EXPIRY * 1000,
  };
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.decode(token) as TokenPayload;
    return payload;
  } catch {
    return null;
  }
}