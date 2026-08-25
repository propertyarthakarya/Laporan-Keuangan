import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/dashboard/summary
// Returns total income, total expenses, cash balance, and current profit/loss.
router.get('/summary', async (_req, res: Response, next) => {
  try {
    const transactions = await prisma.transaction.findMany({
      select: { amount: true, transactionType: true },
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.transactionType === 'INCOME') totalIncome += amt;
      else totalExpenses += amt;
    }

    const cashBalance = totalIncome - totalExpenses;
    const profitLoss = cashBalance;

    return res.json({
      totalIncome,
      totalExpenses,
      cashBalance,
      profitLoss,
      transactionCount: transactions.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/charts?range=daily|weekly|monthly
// Returns aggregated income/expense data grouped by the requested range.
router.get('/charts', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const range = (req.query.range as string) || 'daily';

    const transactions = await prisma.transaction.findMany({
      select: { date: true, amount: true, transactionType: true },
      orderBy: { date: 'asc' },
    });

    const buckets: Record<string, { label: string; income: number; expense: number; sortKey: string }> = {};

    for (const t of transactions) {
      const d = new Date(t.date);
      let key: string;
      let label: string;
      let sortKey: string;

      if (range === 'monthly') {
        const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        key = `${d.getFullYear()}-${d.getMonth()}`;
        label = monthName;
        sortKey = key;
      } else if (range === 'weekly') {
        // Get the Monday of the week
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d);
        weekStart.setDate(diff);
        key = weekStart.toISOString().slice(0, 10);
        label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        sortKey = key;
      } else {
        // daily
        key = d.toISOString().slice(0, 10);
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        sortKey = key;
      }

      if (!buckets[key]) {
        buckets[key] = { label, income: 0, expense: 0, sortKey };
      }

      const amt = Number(t.amount);
      if (t.transactionType === 'INCOME') buckets[key].income += amt;
      else buckets[key].expense += amt;
    }

    const data = Object.values(buckets)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((b) => ({ label: b.label, income: b.income, expense: b.expense }));

    return res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
