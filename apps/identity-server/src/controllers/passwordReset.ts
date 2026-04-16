import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../services/prisma.js';

const router = Router();

// Request password reset
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_EMAIL', message: '请输入邮箱' },
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        data: { message: '如果邮箱存在，已发送重置链接' },
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // In production, send email with reset link
    // For demo, log the token
    console.log(`Password reset token for ${email}: ${token.toString('base64')}`);

    res.json({
      success: true,
      data: { message: '如果邮箱存在，已发送重置链接' },
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '服务器错误' },
    });
  }
});

// Confirm password reset
router.post('/confirm', async (req, res) => {
  try {
    const resetSchema = z.object({
      token: z.string().min(1, '请提供重置令牌'),
      newPassword: z.string()
        .min(8, '密码至少8位')
        .refine(
          (pwd) => {
            const hasUpper = /[A-Z]/.test(pwd);
            const hasLower = /[a-z]/.test(pwd);
            const hasNumber = /[0-9]/.test(pwd);
            return [hasUpper, hasLower, hasNumber].filter(Boolean).length >= 2;
          },
          { message: '需包含大小写字母和数字中的至少两类' }
        ),
    });

    const data = resetSchema.parse(req.body);

    // Find reset record
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token: Buffer.from(data.token, 'base64'),
        usedAt: null,
      },
      include: {
        user: true,
      },
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: '无效的重置令牌' },
      });
    }

    // Check expiry
    if (resetRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: '重置令牌已过期' },
      });
    }

    // Generate new salt and hash password using argon2
    const newSalt = crypto.randomBytes(16);
    const passwordHash = await argon2.hash(data.newPassword, {
      type: argon2.argon2id,
      salt: newSalt,
      timeCost: 2,
      memoryCost: 65536,
      parallelism: 4,
    });

    // Update user password
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: {
        passwordHash,
        salt: newSalt,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Mark token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: {
        usedAt: new Date(),
      },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId: resetRecord.userId },
    });

    res.json({
      success: true,
      data: { message: '密码重置成功，请使用新密码登录' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0].message,
        },
      });
    }
    console.error('Password reset confirm error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '服务器错误' },
    });
  }
});

export { router as passwordResetRouter };