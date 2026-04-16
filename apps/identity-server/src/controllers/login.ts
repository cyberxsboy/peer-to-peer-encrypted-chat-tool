import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import { prisma } from '../services/prisma.js';
import { createToken, verifyToken } from '../services/jwt.js';

const router = Router();

// Validation schema
const loginSchema = z.object({
  login: z.string().min(1, '请输入用户名或邮箱'),
  password: z.string().min(1, '请输入密码'),
});

router.post('/', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: data.login },
          { email: data.login },
        ],
      },
    });

    // Check if user exists and is active
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' },
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: '账户已被锁定，请稍后再试' },
      });
    }

    // Verify password
    const validPassword = await argon2.verify(user.passwordHash, data.password, {
      type: argon2.argon2id,
    });

    if (!validPassword) {
      // Increment failed login count
      const newFailedCount = user.failedLoginCount + 1;
      const shouldLock = newFailedCount >= 5;
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newFailedCount,
          lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });

      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' },
      });
    }

    // Reset failed login count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Get public key hash
    const publicKey = await prisma.publicKey.findUnique({
      where: { userId: user.id },
    });

    // Generate tokens
    const tokens = createToken(user.id, req.ip || 'unknown');

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenJti: tokens.jti,
        expiresAt: new Date(tokens.expiresAt),
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent') || undefined,
      },
    });

    res.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        pubKeyHash: publicKey?.pubKeyHash.toString('base64') || '',
        salt: user.salt.toString('base64'),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
    }
    throw error;
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: '缺少refreshToken' },
      });
    }

    const payload = verifyToken(refreshToken);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: '无效的token' },
      });
    }

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { tokenJti: payload.jti },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: 'SESSION_EXPIRED', message: '会话已过期' },
      });
    }

    // Generate new access token
    const tokens = createToken(payload.userId, req.ip || 'unknown');

    // Update session
    await prisma.session.update({
      where: { tokenJti: payload.jti },
      data: {
        tokenJti: tokens.jti,
        expiresAt: new Date(tokens.expiresAt),
      },
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: 3600,
      },
    });
  } catch (error) {
    throw error;
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      const payload = verifyToken(refreshToken);
      if (payload) {
        await prisma.session.deleteMany({
          where: { tokenJti: payload.jti },
        });
      }
    }

    res.json({
      success: true,
      data: { message: '已登出' },
    });
  } catch (error) {
    throw error;
  }
});

export { router as loginRouter };