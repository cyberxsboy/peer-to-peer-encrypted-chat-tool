import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/jwt.js';
import { prisma } from '../services/prisma.js';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '缺少认证令牌' },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: '无效的令牌' },
      });
    }

    // Check if session is valid
    const session = await prisma.session.findUnique({
      where: { tokenJti: payload.jti },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: '会话已过期' },
      });
    }

    // Attach userId to request
    (req as any).userId = payload.userId;
    next();
  } catch (error) {
    next(error);
  }
}