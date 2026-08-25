import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

const categorySchema = z.object({
  categoryName: z.string().min(1, 'Category name is required').max(100),
  type: z.enum(['INCOME', 'EXPENSE']),
});

// GET /api/categories
router.get('/', async (_req, res: Response, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ type: 'asc' }, { categoryName: 'asc' }],
    });
    return res.json({ categories });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories (Admin only)
router.post('/', requireRoles('ADMIN'), async (req, res: Response, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    return res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id (Admin only)
router.put('/:id', requireRoles('ADMIN'), async (req, res: Response, next) => {
  try {
    const { id } = req.params;
    const data = categorySchema.parse(req.body);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const category = await prisma.category.update({ where: { id }, data });
    return res.json({ category });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id (Admin only)
router.delete('/:id', requireRoles('ADMIN'), async (req, res: Response, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    const txCount = await prisma.transaction.count({ where: { categoryId: id } });
    if (txCount > 0) {
      return res.status(400).json({
        error: `Cannot delete this category because ${txCount} transaction(s) still use it. Please reassign or delete those transactions first.`,
      });
    }

    await prisma.category.delete({ where: { id } });
    return res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
