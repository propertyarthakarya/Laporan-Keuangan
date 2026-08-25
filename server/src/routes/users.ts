import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'STAFF', 'MANAGEMENT']),
});

// GET /api/users (Admin only)
router.get('/', requireRoles('ADMIN'), async (_req, res: Response, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ users });
  } catch (err) {
    next(err);
  }
});

// POST /api/users (Admin only)
router.post('/', requireRoles('ADMIN'), async (req, res: Response, next) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id (Admin only)
router.delete('/:id', requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const txCount = await prisma.transaction.count({ where: { createdById: id } });
    if (txCount > 0) {
      return res.status(400).json({
        error: `Cannot delete this user because they have entered ${txCount} transaction(s). Please reassign those transactions or remove them first.`,
      });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/activity-log (Admin only)
// Returns a list of all transactions with who entered them and when,
// serving as the activity log.
router.get('/activity-log', requireRoles('ADMIN'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const transactions = await prisma.transaction.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { categoryName: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    const log = transactions.map((t) => ({
      transactionId: t.id,
      date: t.date,
      categoryName: t.category.categoryName,
      description: t.description,
      amount: Number(t.amount),
      transactionType: t.transactionType,
      enteredBy: t.createdBy.name,
      enteredByEmail: t.createdBy.email,
      enteredAt: t.createdAt,
    }));

    return res.json({ activity: log });
  } catch (err) {
    next(err);
  }
});

export default router;
