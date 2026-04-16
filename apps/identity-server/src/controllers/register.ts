import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import { prisma } from '../services/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import { createToken } from '../services/jwt.js';

const router = Router();

// Validation schema
const registerSchema = z.object({
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '仅支持字母、数字、下划线'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string()
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

router.post('/', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if username exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: { code: 'USERNAME_EXISTS', message: '用户名已被注册' },
      });
    }

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: '邮箱已被注册' },
      });
    }

    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Hash password with argon2id
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      salt: Buffer.from(salt),
      timeCost: 2,
      memoryCost: 65536,
      parallelism: 4,
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        salt: Buffer.from(salt),
      },
    });

    // Generate pubKeyHash (placeholder - will be updated after libp2p init)
    const pubKeyHash = crypto.getRandomValues(new Uint8Array(32));
    await prisma.publicKey.create({
      data: {
        userId: user.id,
        pubKeyEnc: Buffer.alloc(0), // Will be encrypted and stored later
        pubKeyHash: Buffer.from(pubKeyHash),
      },
    });

    // Generate tokens
    const tokens = createToken(user.id, req.ip || 'unknown');

    res.status(201).json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        pubKeyHash: Buffer.from(pubKeyHash).toString('base64'),
        ...tokens,
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

export { router as registerRouter };