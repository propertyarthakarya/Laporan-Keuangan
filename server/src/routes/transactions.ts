import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const transactionSchema = z.object({
  date: z.string().or(z.date()),
  categoryId: z.string().uuid('Invalid category'),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().positive('Amount must be greater than zero'),
  transactionType: z.enum(['INCOME', 'EXPENSE']),
  uniqueCode: z.string().max(100).optional().nullable(),
});

// GET /api/transactions — supports filtering by date range and category
router.get('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { startDate, endDate, categoryId, transactionType } = req.query;

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId as string;
    if (transactionType) where.transactionType = transactionType as string;

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);
      where.date = dateFilter;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, categoryName: true, type: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    return res.json({
      transactions: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions (Admin & Staff)
router.post('/', requireRoles('ADMIN', 'STAFF'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const data = transactionSchema.parse(req.body);

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist.' });
    }
    if (category.type !== data.transactionType) {
      return res.status(400).json({
        error: `This category is for ${category.type.toLowerCase()} transactions, but you selected ${data.transactionType.toLowerCase()}.`,
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        date: new Date(data.date),
        categoryId: data.categoryId,
        description: data.description || null,
        amount: data.amount,
        transactionType: data.transactionType,
        uniqueCode: data.uniqueCode || null,
        createdById: req.user!.id,
      },
      include: {
        category: { select: { id: true, categoryName: true, type: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({ transaction: { ...transaction, amount: Number(transaction.amount) } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/transactions/:id (Admin & Staff)
router.put('/:id', requireRoles('ADMIN', 'STAFF'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const data = transactionSchema.parse(req.body);

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist.' });
    }
    if (category.type !== data.transactionType) {
      return res.status(400).json({
        error: `Category type mismatch: "${category.categoryName}" is for ${category.type.toLowerCase()}, not ${data.transactionType.toLowerCase()}.`,
      });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        date: new Date(data.date),
        categoryId: data.categoryId,
        description: data.description || null,
        amount: data.amount,
        transactionType: data.transactionType,
        uniqueCode: data.uniqueCode || null,
      },
      include: {
        category: { select: { id: true, categoryName: true, type: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return res.json({ transaction: { ...transaction, amount: Number(transaction.amount) } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id (Admin & Staff)
router.delete('/:id', requireRoles('ADMIN', 'STAFF'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    await prisma.transaction.delete({ where: { id } });
    return res.json({ message: 'Transaction deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;