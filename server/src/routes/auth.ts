import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { signToken, TOKEN_COOKIE, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { recordLoginActivity } from '../lib/loginActivity';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login
router.post('/login', async (req, res: Response, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Email tidak terdaftar sama sekali — tetap dicatat (userId null)
      // supaya percobaan brute-force dengan email acak tetap kelihatan.
      recordLoginActivity({ req, emailAttempted: email, status: 'FAILED', userId: null }).catch(() => {});
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // Email valid tapi password salah — userId tetap dicatat supaya
      // bisa dideteksi kalau akun tertentu sedang dibrute-force.
      recordLoginActivity({ req, emailAttempted: email, status: 'FAILED', userId: user.id }).catch(() => {});
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Fire-and-forget: tidak menunda response login, dan tidak pernah
    // melempar error keluar (lihat implementasinya).
    recordLoginActivity({ req, emailAttempted: email, status: 'SUCCESS', userId: user.id }).catch(() => {});

    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res: Response) => {
  res.clearCookie(TOKEN_COOKIE);
  return res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

export default router;