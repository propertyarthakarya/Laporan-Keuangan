import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/reports/profit-loss?startDate=&endDate=
// Returns the full profit & loss breakdown by category.
router.get('/profit-loss', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};
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
      },
      orderBy: { date: 'asc' },
    });

    // Group by category
    const incomeByCategory: Record<string, { categoryId: string; categoryName: string; total: number; count: number }> = {};
    const expenseByCategory: Record<string, { categoryId: string; categoryName: string; total: number; count: number }> = {};

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      const amt = Number(t.amount);
      const cat = t.category;
      const map = t.transactionType === 'INCOME' ? incomeByCategory : expenseByCategory;

      if (!map[cat.id]) {
        map[cat.id] = { categoryId: cat.id, categoryName: cat.categoryName, total: 0, count: 0 };
      }
      map[cat.id].total += amt;
      map[cat.id].count += 1;

      if (t.transactionType === 'INCOME') totalIncome += amt;
      else totalExpenses += amt;
    }

    const netProfit = totalIncome - totalExpenses;

    return res.json({
      period: { startDate: startDate || null, endDate: endDate || null },
      totalIncome,
      totalExpenses,
      netProfit,
      incomeBreakdown: Object.values(incomeByCategory).sort((a, b) => b.total - a.total),
      expenseBreakdown: Object.values(expenseByCategory).sort((a, b) => b.total - a.total),
      transactionCount: transactions.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;