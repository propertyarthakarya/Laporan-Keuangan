import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { signToken, TOKEN_COOKIE } from '../middleware/auth';

const router = Router();

const setupSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

router.get('/', async (_req, res: Response, next) => {
  try {
    const databaseInfo = await prisma.$queryRawUnsafe(`
      SELECT
        current_database() AS database_name,
        current_schema() AS schema_name,
        inet_server_addr() AS server_ip
    `);

    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    return res.json({
      databaseInfo,
      tables,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/setup-admin -> daftarkan admin pertama, lalu auto-login
router.post('/', async (req, res: Response, next) => {
  try {
    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (adminExists) {
      return res.status(403).json({ error: 'Admin sudah terdaftar. Setup tidak bisa diulang.' });
    }

    const { name, email, password } = setupSchema.parse(req.body);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), password: hashedPassword, role: 'ADMIN' },
    });

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: 'Admin berhasil dibuat.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

export default router;