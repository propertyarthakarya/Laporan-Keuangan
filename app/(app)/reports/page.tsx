'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import type { ProfitLossReport } from '@/lib/types';
import { TrendingUp, TrendingDown, DollarSign, FileSpreadsheet, FileText, Loader as Loader2, Calendar, ChartPie as PieChart } from 'lucide-react';
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
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const { getProfitLoss } = useAuth();
  const { t } = useLanguage();
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch — queryKey include startDate/endDate, jadi tiap kombinasi periode punya cache sendiri
  const { data: report, isLoading: loading } = useQuery<ProfitLossReport>({
    queryKey: ['profit-loss', startDate, endDate],
    queryFn: () =>
      getProfitLoss({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  function handleExport(format: 'pdf' | 'excel') {
    setExporting(true);
    try {
      if (format === 'excel') {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Summary
        const summaryRows = [
          [t('reports.title')],
          [t('reports.period').replace(':', ''), `${startDate || t('reports.allTime')} ${t('reports.period').includes(':') ? '' : ''}${' to '}${endDate || t('reports.present')}`],
          ['Generated', new Date().toLocaleString()],
          [],
          [t('reports.totalIncome'), report?.totalIncome ?? 0],
          [t('reports.totalExpenses'), report?.totalExpenses ?? 0],
          [t('reports.netProfit'), report?.netProfit ?? 0],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

        // Sheet 2: Income breakdown
        const incomeRows = [
          [t('reports.category'), t('reports.amount'), t('reports.transactions')],
          ...(report?.incomeBreakdown.map((c) => [c.categoryName, c.total, c.count]) ?? []),
          [t('reports.totalIncome'), report?.totalIncome ?? 0, ''],
        ];
        const incomeSheet = XLSX.utils.aoa_to_sheet(incomeRows);
        incomeSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, incomeSheet, 'Income Breakdown');

        // Sheet 3: Expense breakdown
        const expenseRows = [
          [t('reports.category'), t('reports.amount'), t('reports.transactions')],
          ...(report?.expenseBreakdown.map((c) => [c.categoryName, c.total, c.count]) ?? []),
          [t('reports.totalExpenses'), report?.totalExpenses ?? 0, ''],
        ];
        const expenseSheet = XLSX.utils.aoa_to_sheet(expenseRows);
        expenseSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expense Breakdown');

        XLSX.writeFile(wb, 'profit-loss-report.xlsx');
      } else {
        const win = window.open('', '_blank');
        if (!win) return;

        const incomeRows = report?.incomeBreakdown
          .map((c) => `<tr><td>${c.categoryName}</td><td style="text-align:right">${formatCurrency(c.total)}</td><td style="text-align:center">${c.count}</td></tr>`)
          .join('') || '';
        const expenseRows = report?.expenseBreakdown
          .map((c) => `<tr><td>${c.categoryName}</td><td style="text-align:right">${formatCurrency(c.total)}</td><td style="text-align:center">${c.count}</td></tr>`)
          .join('') || '';

        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('reports.title')}</title>
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
<h1>${t('reports.title')}</h1>
<div class="meta">${t('reports.generatedOn')} ${new Date().toLocaleString()} &middot; ${t('reports.period')} ${startDate || t('reports.allTime')} - ${endDate || t('reports.present')}</div>
<div class="summary">
  <div><div class="label">${t('reports.totalIncome')}</div><div class="value">${formatCurrency(report?.totalIncome ?? 0)}</div></div>
  <div><div class="label">${t('reports.totalExpenses')}</div><div class="value">${formatCurrency(report?.totalExpenses ?? 0)}</div></div>
  <div><div class="label">${t('reports.netProfit')}</div><div class="value">${formatCurrency(report?.netProfit ?? 0)}</div></div>
</div>
<div class="section">
  <h2>${t('reports.incomeBreakdown')}</h2>
  <table><thead><tr><th>${t('reports.category')}</th><th style="text-align:right">${t('reports.amount')}</th><th style="text-align:center">${t('reports.transactions')}</th></tr></thead>
  <tbody>${incomeRows}<tr class="total-row"><td>${t('reports.totalIncome')}</td><td style="text-align:right">${formatCurrency(report?.totalIncome ?? 0)}</td><td></td></tr></tbody></table>
</div>
<div class="section">
  <h2>${t('reports.expenseBreakdown')}</h2>
  <table><thead><tr><th>${t('reports.category')}</th><th style="text-align:right">${t('reports.amount')}</th><th style="text-align:center">${t('reports.transactions')}</th></tr></thead>
  <tbody>${expenseRows}<tr class="total-row"><td>${t('reports.totalExpenses')}</td><td style="text-align:right">${formatCurrency(report?.totalExpenses ?? 0)}</td><td></td></tr></tbody></table>
</div>
<div class="no-print" style="margin-top:24px"><button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer">${t('reports.printSaveAsPdf')}</button></div>
</body></html>`);
        win.document.close();
      }
    } finally {
      setExporting(false);
    }
  }

  const summaryCards = report
    ? [
        { label: t('reports.totalIncome'), value: report.totalIncome, icon: TrendingUp, tone: 'positive' as const },
        { label: t('reports.totalExpenses'), value: report.totalExpenses, icon: TrendingDown, tone: 'negative' as const },
        { label: t('reports.netProfit'), value: report.netProfit, icon: DollarSign, tone: 'auto' as const },
      ]
    : [];

  const chartData = report
    ? [
        ...report.incomeBreakdown.map((c) => ({ name: c.categoryName, amount: c.total, type: 'Income' })),
        ...report.expenseBreakdown.map((c) => ({ name: c.categoryName, amount: c.total, type: 'Expense' })),
      ].sort((a, b) => b.amount - a.amount)
    : [];

  // Monochrome: income = darker, expense = lighter
  const barColors = chartData.map((d) => (d.type === 'Income' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'));

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader title={t('reports.title')} description={t('reports.subtitle')}>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={exporting || loading}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {t('reports.exportPdf')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={exporting || loading}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t('reports.exportExcel')}
          </Button>
        </div>
      </PageHeader>

      {/* Period filter */}
      <Card className="mb-5 sm:mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              {t('reports.period')}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
              <div className="w-full sm:w-48">
                <Label className="mb-1.5 block text-xs">{t('reports.fromDate')}</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="w-full sm:w-48">
                <Label className="mb-1.5 block text-xs">{t('reports.toDate')}</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }} className="w-full sm:w-auto">
                {t('reports.clearDates')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 sm:h-28" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      ) : !report ? (
        <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">{t('reports.loadFailed')}</CardContent></Card>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {summaryCards.map((card, i) => {
              const Icon = card.icon;
              const isPositive = card.tone === 'positive' || (card.tone === 'auto' && card.value >= 0);
              const isNegative = card.tone === 'negative' || (card.tone === 'auto' && card.value < 0);
              return (
                <Card key={i} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary sm:h-11 sm:w-11"
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            isPositive && 'text-green-600 dark:text-green-400',
                            isNegative && 'text-red-600 dark:text-red-400',
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-muted-foreground">{card.label}</p>
                        <p
                          className={cn(
                            'truncate text-lg font-bold sm:text-xl',
                            isPositive && 'text-green-600 dark:text-green-400',
                            isNegative && 'text-red-600 dark:text-red-400',
                          )}
                        >
                          {formatCurrency(card.value)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Breakdown by category */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Income breakdown */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                  {t('reports.incomeBreakdown')}
                </CardTitle>
                <CardDescription>{t('reports.revenueByCategory')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {report.incomeBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('reports.noIncomeInPeriod')}</p>
                ) : (
                  <div className="space-y-3">
                    {report.incomeBreakdown.map((c) => {
                      const pct = report.totalIncome > 0 ? (c.total / report.totalIncome) * 100 : 0;
                      return (
                        <div key={c.categoryId}>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{c.categoryName}</span>
                            <span className="flex-shrink-0 text-sm font-semibold">{formatCurrency(c.total)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-foreground transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-9 flex-shrink-0 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{c.count} {t('reports.transactionCount')}</p>
                        </div>
                      );
                    })}
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="font-semibold">{t('reports.totalIncome')}</span>
                      <span className="font-bold">{formatCurrency(report.totalIncome)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense breakdown */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingDown className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                  {t('reports.expenseBreakdown')}
                </CardTitle>
                <CardDescription>{t('reports.costsByCategory')}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {report.expenseBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('reports.noExpensesInPeriod')}</p>
                ) : (
                  <div className="space-y-3">
                    {report.expenseBreakdown.map((c) => {
                      const pct = report.totalExpenses > 0 ? (c.total / report.totalExpenses) * 100 : 0;
                      return (
                        <div key={c.categoryId}>
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{c.categoryName}</span>
                            <span className="flex-shrink-0 text-sm font-semibold">{formatCurrency(c.total)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-muted-foreground transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-9 flex-shrink-0 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{c.count} {t('reports.transactionCount')}</p>
                        </div>
                      );
                    })}
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <span className="font-semibold">{t('reports.totalExpenses')}</span>
                      <span className="font-bold">{formatCurrency(report.totalExpenses)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-4 w-4 flex-shrink-0" />
                  {t('reports.categoryComparison')}
                </CardTitle>
                <CardDescription>{t('reports.amountByCategory')}</CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
                <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)} className="sm:!h-[360px]">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                      tickFormatter={(v) => formatCurrencyCompact(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                      tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      formatter={(value) => formatCurrency(Number(value))}
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