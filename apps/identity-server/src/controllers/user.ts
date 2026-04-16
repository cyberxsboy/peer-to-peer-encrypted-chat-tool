import { Router } from 'express';
import { prisma } from '../services/prisma.js';

const router = Router();

// Get user public key
router.get('/:identifier/pubkey', async (req, res) => {
  try {
    const { identifier } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
      select: {
        id: true,
        publicKey: {
          select: {
            pubKeyEnc: true,
            pubKeyHash: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' },
      });
    }

    res.json({
      success: true,
      data: {
        pubKeyEnc: user.publicKey?.pubKeyEnc.toString('base64') || '',
        pubKeyHash: user.publicKey?.pubKeyHash.toString('base64') || '',
      },
    });
  } catch (error) {
    throw error;
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const userId = (req as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        publicKey: {
          select: {
            pubKeyHash: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' },
      });
    }

    res.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        pubKeyHash: user.publicKey?.pubKeyHash.toString('base64') || '',
      },
    });
  } catch (error) {
    throw error;
  }
});

// Update public key
router.put('/pubkey', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { pubKeyEnc, pubKeyHash } = req.body;

    if (!pubKeyEnc || !pubKeyHash) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DATA', message: '缺少公钥数据' },
      });
    }

    await prisma.publicKey.upsert({
      where: { userId },
      update: {
        pubKeyEnc: Buffer.from(pubKeyEnc, 'base64'),
        pubKeyHash: Buffer.from(pubKeyHash, 'base64'),
        updatedAt: new Date(),
      },
      create: {
        userId,
        pubKeyEnc: Buffer.from(pubKeyEnc, 'base64'),
        pubKeyHash: Buffer.from(pubKeyHash, 'base64'),
      },
    });

    res.json({
      success: true,
      data: { message: '公钥已更新' },
    });
  } catch (error) {
    throw error;
  }
});

export { router as userRouter };