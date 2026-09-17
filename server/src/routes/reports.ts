import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/reports/profit-loss?startDate=&endDate=&accountId=
// Returns the full profit & loss breakdown by category.
// accountId kosong / tidak dikirim => semua akun (gabungan).
router.get('/profit-loss', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { startDate, endDate, accountId } = req.query;

    const where: Record<string, unknown> = {};
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) dateFilter.lte = new Date(endDate as string);
      where.date = dateFilter;
    }
    if (accountId) {
      where.accountId = accountId as string;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
      category: {
        select: {
          id: true,
          categoryName: true,
          type: true,
          parentId: true,
          parent: {
            select: {
              id: true,
              categoryName: true,
              type: true,
            },
          },
        },
      },
    },
      orderBy: { date: 'asc' },
    });

    // Group by category
    const incomeByCategory: Record<
  string,
  {
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
    parentId: string | null;
    parentName: string | null;
  }
> = {};

const expenseByCategory: Record<
  string,
  {
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
    parentId: string | null;
    parentName: string | null;
  }
> = {};

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      const amt = Number(t.amount);
      const cat = t.category;
      const map = t.transactionType === 'INCOME' ? incomeByCategory : expenseByCategory;

        if (!map[cat.id]) {
          map[cat.id] = {
            categoryId: cat.id,
            categoryName: cat.categoryName,
            total: 0,
            count: 0,
            parentId: cat.parent?.id ?? null,
            parentName: cat.parent?.categoryName ?? null,
          };
        }
              map[cat.id].total += amt;
      map[cat.id].count += 1;

      if (t.transactionType === 'INCOME') totalIncome += amt;
      else totalExpenses += amt;
    }

    const netProfit = totalIncome - totalExpenses;

    return res.json({
      period: { startDate: startDate || null, endDate: endDate || null },
      accountId: accountId || null,
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