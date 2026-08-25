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

// GET /api/reports/export?format=pdf|excel&startDate=&endDate=
// Generates a downloadable file. PDF export uses a simple HTML-to-PDF layout
// that the client can print; Excel export generates a CSV (opens in Excel).
router.get('/export', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const format = (req.query.format as string) || 'excel';
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
        category: { select: { categoryName: true, type: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    if (format === 'excel') {
      // CSV format — opens directly in Excel
      const header = ['Date', 'Category', 'Type', 'Description', 'Amount', 'Entered By'];
      const rows = transactions.map((t) => [
        new Date(t.date).toLocaleDateString(),
        t.category.categoryName,
        t.transactionType,
        t.description || '',
        Number(t.amount).toFixed(2),
        t.createdBy.name,
      ]);

      const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="profit-loss-report.csv"`);
      return res.send(csv);
    }

    // PDF format — return a print-friendly HTML page the browser can save as PDF
    const incomeTotal = transactions
      .filter((t) => t.transactionType === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenseTotal = transactions
      .filter((t) => t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const net = incomeTotal - expenseTotal;

    const rowHtml = transactions
      .map(
        (t) => `<tr>
          <td>${new Date(t.date).toLocaleDateString()}</td>
          <td>${t.category.categoryName}</td>
          <td>${t.transactionType}</td>
          <td>${t.description || ''}</td>
          <td style="text-align:right">${Number(t.amount).toFixed(2)}</td>
          <td>${t.createdBy.name}</td>
        </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Profit &amp; Loss Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #666; margin-bottom: 24px; font-size: 13px; }
  .summary { display: flex; gap: 32px; margin-bottom: 24px; }
  .summary div { padding: 12px 20px; background: #f5f5f5; border-radius: 8px; }
  .summary .label { font-size: 12px; color: #666; text-transform: uppercase; }
  .summary .value { font-size: 20px; font-weight: bold; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; background: #fafafa; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  @media print { .no-print { display: none; } }
</style></head>
<body>
  <h1>Profit &amp; Loss Report</h1>
  <div class="meta">Generated on ${new Date().toLocaleString()}${
      startDate || endDate ? ` &middot; Period: ${startDate || '—'} to ${endDate || '—'}` : ''
    }</div>
  <div class="summary">
    <div><div class="label">Total Income</div><div class="value" style="color:#15803d">$${incomeTotal.toFixed(2)}</div></div>
    <div><div class="label">Total Expenses</div><div class="value" style="color:#b91c1c">$${expenseTotal.toFixed(2)}</div></div>
    <div><div class="label">Net Profit</div><div class="value" style="color:${net >= 0 ? '#15803d' : '#b91c1c'}">$${net.toFixed(2)}</div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Category</th><th>Type</th><th>Description</th><th style="text-align:right">Amount</th><th>Entered By</th></tr></thead>
    <tbody>${rowHtml}</tbody>
  </table>
  <div class="no-print" style="margin-top:24px"><button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    next(err);
  }
});

export default router;
