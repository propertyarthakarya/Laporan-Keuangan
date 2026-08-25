'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import type { ProfitLossReport } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Loader2,
  Calendar,
  PieChart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const { getProfitLoss } = useAuth();
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getProfitLoss({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReport(r);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [getProfitLoss, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  function handleExport(format: 'pdf' | 'excel') {
    setExporting(true);
    try {
      if (format === 'excel') {
        // Generate CSV client-side
        const rows: string[][] = [];
        rows.push(['Profit & Loss Report']);
        rows.push(['Period', `${startDate || 'All time'} to ${endDate || 'present'}`]);
        rows.push(['Generated', new Date().toLocaleString()]);
        rows.push([]);
        rows.push(['INCOME BREAKDOWN']);
        rows.push(['Category', 'Amount', 'Transaction Count']);
        report?.incomeBreakdown.forEach((c) => rows.push([c.categoryName, c.total.toFixed(2), String(c.count)]));
        rows.push(['Total Income', (report?.totalIncome ?? 0).toFixed(2), '']);
        rows.push([]);
        rows.push(['EXPENSE BREAKDOWN']);
        rows.push(['Category', 'Amount', 'Transaction Count']);
        report?.expenseBreakdown.forEach((c) => rows.push([c.categoryName, c.total.toFixed(2), String(c.count)]));
        rows.push(['Total Expenses', (report?.totalExpenses ?? 0).toFixed(2), '']);
        rows.push([]);
        rows.push(['NET PROFIT', (report?.netProfit ?? 0).toFixed(2)]);

        const csv = rows
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'profit-loss-report.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Generate a print-friendly HTML page for PDF
        const win = window.open('', '_blank');
        if (!win) return;

        const incomeRows = report?.incomeBreakdown
          .map((c) => `<tr><td>${c.categoryName}</td><td style="text-align:right">${formatCurrency(c.total)}</td><td style="text-align:center">${c.count}</td></tr>`)
          .join('') || '';
        const expenseRows = report?.expenseBreakdown
          .map((c) => `<tr><td>${c.categoryName}</td><td style="text-align:right">${formatCurrency(c.total)}</td><td style="text-align:center">${c.count}</td></tr>`)
          .join('') || '';

        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Profit &amp; Loss Report</title>
<style>
  body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a}
  h1{font-size:24px;margin-bottom:4px}
  .meta{color:#666;margin-bottom:24px;font-size:13px}
  .section{margin-bottom:24px}
  h2{font-size:16px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e5e5e5}
  .summary{display:flex;gap:24px;margin-bottom:24px}
  .summary div{padding:12px 20px;background:#f5f5f5;border-radius:8px}
  .summary .label{font-size:11px;color:#666;text-transform:uppercase}
  .summary .value{font-size:20px;font-weight:bold;margin-top:4px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
  th{text-align:left;padding:8px;border-bottom:2px solid #ddd;background:#fafafa}
  td{padding:8px;border-bottom:1px solid #eee}
  .total-row{font-weight:bold;background:#f9f9f9}
  @media print{.no-print{display:none}}
</style></head><body>
<h1>Profit &amp; Loss Report</h1>
<div class="meta">Generated on ${new Date().toLocaleString()} &middot; Period: ${startDate || 'All time'} to ${endDate || 'present'}</div>
<div class="summary">
  <div><div class="label">Total Income</div><div class="value" style="color:#15803d">${formatCurrency(report?.totalIncome ?? 0)}</div></div>
  <div><div class="label">Total Expenses</div><div class="value" style="color:#b91c1c">${formatCurrency(report?.totalExpenses ?? 0)}</div></div>
  <div><div class="label">Net Profit</div><div class="value" style="color:${(report?.netProfit ?? 0) >= 0 ? '#15803d' : '#b91c1c'}">${formatCurrency(report?.netProfit ?? 0)}</div></div>
</div>
<div class="section">
  <h2>Income Breakdown</h2>
  <table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:center">Transactions</th></tr></thead>
  <tbody>${incomeRows}<tr class="total-row"><td>Total Income</td><td style="text-align:right">${formatCurrency(report?.totalIncome ?? 0)}</td><td></td></tr></tbody></table>
</div>
<div class="section">
  <h2>Expense Breakdown</h2>
  <table><thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:center">Transactions</th></tr></thead>
  <tbody>${expenseRows}<tr class="total-row"><td>Total Expenses</td><td style="text-align:right">${formatCurrency(report?.totalExpenses ?? 0)}</td><td></td></tr></tbody></table>
</div>
<div class="no-print" style="margin-top:24px"><button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`);
        win.document.close();
      }
    } finally {
      setExporting(false);
    }
  }

  const summaryCards = report
    ? [
        { label: 'Total Income', value: report.totalIncome, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
        { label: 'Total Expenses', value: report.totalExpenses, icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
        { label: 'Net Profit', value: report.netProfit, icon: DollarSign, color: report.netProfit >= 0 ? 'text-success' : 'text-destructive', bg: report.netProfit >= 0 ? 'bg-success/10' : 'bg-destructive/10' },
      ]
    : [];

  const chartData = report
    ? [
        ...report.incomeBreakdown.map((c) => ({ name: c.categoryName, amount: c.total, type: 'Income' })),
        ...report.expenseBreakdown.map((c) => ({ name: c.categoryName, amount: c.total, type: 'Expense' })),
      ].sort((a, b) => b.amount - a.amount)
    : [];

  const barColors = chartData.map((d) => (d.type === 'Income' ? 'hsl(var(--success))' : 'hsl(var(--destructive))'));

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <PageHeader title="Profit & Loss Report" description="Financial performance breakdown by category">
        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={exporting || loading}>
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={exporting || loading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </PageHeader>

      {/* Period filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Period:
            </div>
            <div className="w-full sm:w-48">
              <Label className="mb-1.5 block text-xs">From date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="w-full sm:w-48">
              <Label className="mb-1.5 block text-xs">To date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
                Clear dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : !report ? (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">Failed to load report.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {summaryCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <Card key={i} className="overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', card.bg)}>
                        <Icon className={cn('h-5 w-5', card.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                        <p className={cn('text-xl font-bold', card.color)}>{formatCurrency(card.value)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Breakdown by category */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Income breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Income Breakdown
                </CardTitle>
                <CardDescription>Revenue by category</CardDescription>
              </CardHeader>
              <CardContent>
                {report.incomeBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No income in this period</p>
                ) : (
                  <div className="space-y-3">
                    {report.incomeBreakdown.map((c) => {
                      const pct = report.totalIncome > 0 ? (c.total / report.totalIncome) * 100 : 0;
                      return (
                        <div key={c.categoryId}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-sm font-medium">{c.categoryName}</span>
                            <span className="text-sm font-semibold text-success">{formatCurrency(c.total)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-success transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{c.count} transaction(s)</p>
                        </div>
                      );
                    })}
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="font-semibold">Total Income</span>
                      <span className="font-bold text-success">{formatCurrency(report.totalIncome)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Expense Breakdown
                </CardTitle>
                <CardDescription>Costs by category</CardDescription>
              </CardHeader>
              <CardContent>
                {report.expenseBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No expenses in this period</p>
                ) : (
                  <div className="space-y-3">
                    {report.expenseBreakdown.map((c) => {
                      const pct = report.totalExpenses > 0 ? (c.total / report.totalExpenses) * 100 : 0;
                      return (
                        <div key={c.categoryId}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-sm font-medium">{c.categoryName}</span>
                            <span className="text-sm font-semibold text-destructive">{formatCurrency(c.total)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-destructive transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{c.count} transaction(s)</p>
                        </div>
                      );
                    })}
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="font-semibold">Total Expenses</span>
                      <span className="font-bold text-destructive">{formatCurrency(report.totalExpenses)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-4 w-4 text-primary" />
                  Category Comparison
                </CardTitle>
                <CardDescription>Amount by category (income vs expense)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                      tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={barColors[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
