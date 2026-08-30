'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import type { ProfitLossReport } from '@/lib/types';
import {
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Loader as Loader2,
  Calendar as CalendarIcon,
  ChartPie as PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Star,
  Sun,
  CalendarDays,
  CalendarRange,
  History,
  Infinity as InfinityIcon,
  Check,
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
  LabelList,
} from 'recharts';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

/* ------------------------------------------------------------------ */
/*  Constants & small helpers                                          */
/* ------------------------------------------------------------------ */

// Kalender & rekap minggu dimulai dari Senin
const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isSameDay(a: Date | null, b: Date | null) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Date.getDay(): 0 = Minggu ... 6 = Sabtu. Fungsi ini mengubahnya jadi
// jarak (dalam hari) ke hari Senin terdekat sebelumnya, sehingga "awal
// minggu" selalu jatuh di hari Senin.
function mondayOffset(date: Date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - mondayOffset(d));
  return d;
}

function formatRangeLabel(start: Date | null, end: Date | null, allTimeLabel: string) {
  if (!start && !end) return allTimeLabel;
  const fmt = (d: Date) => `${d.getDate()} ${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  if (start && end && !isSameDay(start, end)) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return fmt(start);
  return allTimeLabel;
}

// Dipakai di export PDF/Excel: tanggal lengkap + jam:menit:detik, format Indonesia
function formatDateTimeID(d: Date) {
  const day = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${day}, ${time}`;
}

const PRESET_ICONS: Record<string, React.ElementType> = {
  today: Sun,
  week: CalendarDays,
  month: CalendarIcon,
  lastMonth: History,
  year: CalendarRange,
};

// Rentang tanggal siap pakai buat pintasan filter periode
function getPresetRanges(t: ReturnType<typeof useLanguage>['t']) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const startOfWeek = startOfWeekMonday(startOfToday);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const endOfYear = new Date(today.getFullYear(), 11, 31);

  return [
    { id: 'today', label: t('reports.today'), start: startOfToday, end: startOfToday },
    { id: 'week', label: t('reports.thisWeek'), start: startOfWeek, end: startOfToday },
    { id: 'month', label: t('reports.thisMonth'), start: startOfMonth, end: endOfMonth },
    { id: 'lastMonth', label: t('reports.lastMonth'), start: startOfLastMonth, end: endOfLastMonth },
    { id: 'year', label: t('reports.thisYear'), start: startOfYear, end: endOfYear },
  ];
}

/* ------------------------------------------------------------------ */
/*  Small presentational components                                    */
/* ------------------------------------------------------------------ */

// Lucide belum punya simbol Rupiah, jadi cukup teks "Rp" tipis, senada sama ikon lucide lain
function RupiahIcon({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold leading-none', className)} style={{ fontSize: '0.95em' }}>
      Rp
    </span>
  );
}

type CardTone = 'emerald' | 'rose' | 'amber';

const toneStyles: Record<CardTone, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
};

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  trendUp,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: CardTone;
  trendUp: boolean;
  delay: number;
}) {
  const style = toneStyles[tone];
  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="animate-fade-in transition-shadow hover:shadow-md" style={{ animationDelay: `${delay}ms` }}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', style.bg)}>
            <Icon className={cn('h-5 w-5', style.text)} />
          </div>
          <TrendIcon className={cn('h-4 w-4', style.text)} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-mono text-lg font-bold tabular-nums sm:text-xl">{formatCurrency(value)}</p>
      </CardContent>
    </Card>
  );
}

type BreakdownCategory = { categoryId: string; categoryName: string; total: number; count: number };

function CategoryBreakdownCard({
  title,
  description,
  icon: Icon,
  iconClass,
  barClass,
  categories,
  total,
  totalLabel,
  emptyLabel,
  transactionLabel,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  iconClass: string;
  barClass: string;
  categories: BreakdownCategory[];
  total: number;
  totalLabel: string;
  emptyLabel: string;
  transactionLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={cn('h-4 w-4 flex-shrink-0', iconClass)} />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="space-y-3">
            {categories.map((c) => {
              const pct = total > 0 ? (c.total / total) * 100 : 0;
              return (
                <div key={c.categoryId}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.categoryName}</span>
                    <span className="flex-shrink-0 font-mono text-sm font-semibold tabular-nums">{formatCurrency(c.total)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className={cn('h-full rounded-full transition-all duration-500', barClass)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-9 flex-shrink-0 text-right text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.count} {transactionLabel}</p>
                </div>
              );
            })}
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <span className="font-semibold">{totalLabel}</span>
              <span className="font-mono font-bold tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Kalender kustom: minggu dimulai Senin, klik tanggal pertama = awal periode,
// klik tanggal berikutnya = akhir periode. Tanggal dengan transaksi dapat titik penanda.
function PeriodCalendar({
  rangeStart,
  rangeEnd,
  markedDays,
  viewMonth,
  onViewMonthChange,
  onSelectDay,
}: {
  rangeStart: Date | null;
  rangeEnd: Date | null;
  markedDays: Set<number>;
  viewMonth: Date;
  onViewMonthChange: (d: Date) => void;
  onSelectDay: (d: Date) => void;
}) {
  const today = new Date();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const firstDayOffset = mondayOffset(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {MONTH_LABELS[month]} {year}
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onViewMonthChange(new Date(year, month - 1, 1))}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onViewMonthChange(new Date(year, month + 1, 1))}
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-[11px] font-medium text-muted-foreground">
            {w}
          </div>
        ))}

        {cells.map(({ date, inMonth }, i) => {
          const isToday = isSameDay(date, today);
          const isStart = isSameDay(date, rangeStart);
          const isEnd = isSameDay(date, rangeEnd);
          const isSelectedEdge = isStart || isEnd;
          const inRange = !!(rangeStart && rangeEnd && date > rangeStart && date < rangeEnd);
          const hasTransaction = inMonth && markedDays.has(date.getDate());
          const dayOfRow = i % 7;
          const isRowStart = dayOfRow === 0 || (rangeStart && isSameDay(date, rangeStart));
          const isRowEnd = dayOfRow === 6 || (rangeEnd && isSameDay(date, rangeEnd));

          return (
            <button
              key={i}
              onClick={() => onSelectDay(date)}
              className={cn(
                'relative mx-auto flex h-9 w-9 items-center justify-center text-xs transition-colors sm:h-8 sm:w-8',
                !inMonth && 'text-muted-foreground/30',
                inMonth && !isSelectedEdge && !inRange && 'rounded-full text-foreground hover:bg-secondary',
                inRange && cn(
                  'bg-blue-50 text-foreground dark:bg-blue-950/40',
                  isRowStart && 'rounded-l-full',
                  isRowEnd && 'rounded-r-full',
                ),
                isSelectedEdge && 'rounded-full bg-blue-600 text-white hover:bg-blue-600',
                isToday && !isSelectedEdge && 'ring-1 ring-inset ring-blue-500',
              )}
            >
              {date.getDate()}
              {hasTransaction && (
                <span className={cn('absolute bottom-0.5 h-1 w-1 rounded-full', isSelectedEdge ? 'bg-white' : 'bg-blue-500')} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const auth = useAuth();
  const { getProfitLoss } = auth;
  // TODO: sesuaikan kalau fungsi pengambilan transaksi di project kamu namanya/parameternya beda
  const getTransactions = (auth as unknown as { getTransactions?: (p: { startDate: string; endDate: string }) => Promise<any[]> }).getTransactions;

  const { t } = useLanguage();
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  const startDate = rangeStart ? toISODate(rangeStart) : '';
  const endDate = rangeEnd ? toISODate(rangeEnd) : rangeStart ? toISODate(rangeStart) : '';

  const { data: report, isLoading: loading } = useQuery<ProfitLossReport>({
    queryKey: ['profit-loss', startDate, endDate],
    queryFn: () =>
      getProfitLoss({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const monthStartISO = toISODate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
  const monthEndISO = toISODate(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));

  const { data: monthTransactions = [] } = useQuery({
    queryKey: ['transactions-calendar', monthStartISO, monthEndISO],
    queryFn: () => getTransactions!({ startDate: monthStartISO, endDate: monthEndISO }),
    enabled: typeof getTransactions === 'function',
  });

  const markedDays = useMemo(() => {
    const set = new Set<number>();
    (monthTransactions as any[]).forEach((tx) => {
      const raw = tx?.date ?? tx?.transactionDate ?? tx?.createdAt;
      if (!raw) return;
      const d = new Date(raw);
      if (d.getFullYear() === viewMonth.getFullYear() && d.getMonth() === viewMonth.getMonth()) {
        set.add(d.getDate());
      }
    });
    return set;
  }, [monthTransactions, viewMonth]);

  const presets = useMemo(() => getPresetRanges(t), [t]);
  const isAllTime = !rangeStart && !rangeEnd;

  const selectedDaysCount = rangeStart
    ? Math.round(((rangeEnd ?? rangeStart).getTime() - rangeStart.getTime()) / 86_400_000) + 1
    : null;

  const periodTransactionCount = report
    ? [...report.incomeBreakdown, ...report.expenseBreakdown].reduce((sum, c) => sum + c.count, 0)
    : 0;

  const topCategory = report
    ? [...report.incomeBreakdown, ...report.expenseBreakdown].reduce<BreakdownCategory | null>(
        (top, c) => (!top || c.total > top.total ? c : top),
        null,
      )
    : null;

  // Label periode yang enak dibaca buat export: "Bulan ini (1 Agu 2026 - 31 Agu 2026)"
  // atau "Semua waktu" / "Kustom (...)" kalau rentangnya dipilih manual dari kalender.
  const activePresetLabel = presets.find((p) => isActivePreset(p))?.label;
  const rangeText = formatRangeLabel(rangeStart, rangeEnd, t('reports.allTime'));
  const exportPeriodLabel = isAllTime
    ? t('reports.allTime')
    : activePresetLabel
      ? `${activePresetLabel} (${rangeText})`
      : `${t('reports.custom')} (${rangeText})`;

  function isActivePreset(preset: { start: Date; end: Date }) {
    return isSameDay(rangeStart, preset.start) && isSameDay(rangeEnd, preset.end);
  }

  function applyPreset(preset: { start: Date; end: Date }) {
    setRangeStart(preset.start);
    setRangeEnd(preset.end);
    setViewMonth(preset.start);
  }

  function handleSelectDay(date: Date) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date < rangeStart) {
      setRangeEnd(rangeStart);
      setRangeStart(date);
    } else {
      setRangeEnd(date);
    }
  }

  function handleClearRange() {
    setRangeStart(null);
    setRangeEnd(null);
  }

  async function handleExport(format: 'pdf' | 'excel') {
    setExporting(format);
    try {
      if (format === 'excel') {
        exportExcel();
      } else {
        exportPdf();
      }
    } finally {
      setExporting(null);
    }
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      [t('reports.title')],
      [t('reports.period').replace(':', ''), exportPeriodLabel],
      [t('reports.generatedOn'), formatDateTimeID(new Date())],
      [],
      [t('reports.totalIncome'), report?.totalIncome ?? 0],
      [t('reports.totalExpenses'), report?.totalExpenses ?? 0],
      [t('reports.netProfit'), report?.netProfit ?? 0],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    const incomeRows = [
      [t('reports.category'), t('reports.amount'), t('reports.transactions')],
      ...(report?.incomeBreakdown.map((c) => [c.categoryName, c.total, c.count]) ?? []),
      [t('reports.totalIncome'), report?.totalIncome ?? 0, ''],
    ];
    const incomeSheet = XLSX.utils.aoa_to_sheet(incomeRows);
    incomeSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, incomeSheet, 'Income Breakdown');

    const expenseRows = [
      [t('reports.category'), t('reports.amount'), t('reports.transactions')],
      ...(report?.expenseBreakdown.map((c) => [c.categoryName, c.total, c.count]) ?? []),
      [t('reports.totalExpenses'), report?.totalExpenses ?? 0, ''],
    ];
    const expenseSheet = XLSX.utils.aoa_to_sheet(expenseRows);
    expenseSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expense Breakdown');

    XLSX.writeFile(wb, 'profit-loss-report.xlsx');
  }

  function exportPdf() {
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
  .meta{color:#666;margin-bottom:24px;font-size:13px;line-height:1.6}
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
<div class="meta">${t('reports.generatedOn')} ${formatDateTimeID(new Date())}<br/>${t('reports.period')} ${exportPeriodLabel}</div>
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

  const summaryCards = report
    ? [
        { label: t('reports.totalIncome'), value: report.totalIncome, icon: TrendingUp, tone: 'emerald' as CardTone, trendUp: true },
        { label: t('reports.totalExpenses'), value: report.totalExpenses, icon: TrendingDown, tone: 'rose' as CardTone, trendUp: false },
        { label: t('reports.netProfit'), value: report.netProfit, icon: RupiahIcon, tone: 'amber' as CardTone, trendUp: report.netProfit >= 0 },
      ]
    : [];

  const chartData = report
    ? [
        ...report.incomeBreakdown.map((c) => ({ name: c.categoryName, amount: c.total, type: 'Income' as const })),
        ...report.expenseBreakdown.map((c) => ({ name: c.categoryName, amount: c.total, type: 'Expense' as const })),
      ].sort((a, b) => b.amount - a.amount)
    : [];

  const barFill = (type: 'Income' | 'Expense') => (type === 'Income' ? 'url(#incomeGradient)' : 'url(#expenseGradient)');
  const isExporting = exporting !== null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader title={t('reports.title')} description={t('reports.subtitle')}>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting || loading}>
            {exporting === 'pdf' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {t('reports.exportPdf')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={isExporting || loading}>
            {exporting === 'excel' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            {t('reports.exportExcel')}
          </Button>
        </div>
      </PageHeader>

      {/* Filter periode — pintasan cepat + kalender, rapi di mobile & desktop */}
      <Card className="mb-5 sm:mb-6">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarIcon className="h-4 w-4 flex-shrink-0" />
            {t('reports.period')}
            <span className="ml-auto truncate text-xs font-normal text-foreground">{formatRangeLabel(rangeStart, rangeEnd, t('reports.allTime'))}</span>
          </div>

          <div className="flex flex-col gap-5 lg:mx-auto lg:max-w-4xl lg:flex-row lg:items-start">
            {/* Pintasan periode: scroll horizontal di mobile, kolom di desktop */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:w-40 lg:flex-shrink-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {presets.map((p) => {
                const Icon = PRESET_ICONS[p.id] ?? CalendarIcon;
                const active = isActivePreset(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className={cn(
                      'flex flex-shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors lg:w-full lg:whitespace-normal lg:rounded-lg lg:text-left',
                      active
                        ? 'border-blue-600 bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        : 'border-border text-foreground hover:bg-secondary',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')} />
                    <span className="flex-1">{p.label}</span>
                    {active && <Check className="hidden h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400 lg:block" />}
                  </button>
                );
              })}
              <button
                onClick={handleClearRange}
                className={cn(
                  'flex flex-shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors lg:w-full lg:whitespace-normal lg:rounded-lg lg:text-left',
                  isAllTime
                    ? 'border-blue-600 bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'border-border text-muted-foreground hover:bg-secondary',
                )}
              >
                <InfinityIcon className={cn('h-4 w-4 flex-shrink-0', isAllTime ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground')} />
                <span className="flex-1">{t('reports.allTime')}</span>
                {isAllTime && <Check className="hidden h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400 lg:block" />}
              </button>
            </div>

            <div className="hidden w-px self-stretch bg-border lg:block" />
            <div className="h-px w-full bg-border lg:hidden" />

            {/* Kalender */}
            <div className="mx-auto w-full max-w-xs lg:mx-0 lg:w-[288px] lg:flex-shrink-0">
              <PeriodCalendar
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                markedDays={markedDays}
                viewMonth={viewMonth}
                onViewMonthChange={setViewMonth}
                onSelectDay={handleSelectDay}
              />
            </div>

            <div className="hidden w-px self-stretch bg-border lg:block" />
            <div className="h-px w-full bg-border lg:hidden" />

            {/* Ringkasan periode & legenda kalender */}
            <div className="w-full lg:min-w-0 lg:flex-1">
              <p className="mb-3 text-sm font-semibold">{t('reports.periodSummary')}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                    <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t('reports.daysSelected')}</p>
                    <p className="font-mono text-sm font-semibold tabular-nums">{selectedDaysCount ?? '—'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40">
                    <Receipt className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t('reports.transactionsRecorded')}</p>
                    <p className="font-mono text-sm font-semibold tabular-nums">{loading ? '…' : periodTransactionCount}</p>
                  </div>
                </div>

                {topCategory && (
                  <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                      <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('reports.topCategory')}</p>
                      <p className="truncate text-sm font-semibold">{topCategory.categoryName}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                {t('reports.calendarLegend')}
              </div>
            </div>
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
            {summaryCards.map((card, i) => (
              <SummaryCard
                key={card.label}
                label={card.label}
                value={card.value}
                icon={card.icon}
                tone={card.tone}
                trendUp={card.trendUp}
                delay={i * 50}
              />
            ))}
          </div>

          {/* Breakdown by category */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <CategoryBreakdownCard
              title={t('reports.incomeBreakdown')}
              description={t('reports.revenueByCategory')}
              icon={TrendingUp}
              iconClass="text-emerald-600 dark:text-emerald-400"
              barClass="bg-emerald-500"
              categories={report.incomeBreakdown}
              total={report.totalIncome}
              totalLabel={t('reports.totalIncome')}
              emptyLabel={t('reports.noIncomeInPeriod')}
              transactionLabel={t('reports.transactionCount')}
            />
            <CategoryBreakdownCard
              title={t('reports.expenseBreakdown')}
              description={t('reports.costsByCategory')}
              icon={TrendingDown}
              iconClass="text-rose-600 dark:text-rose-400"
              barClass="bg-rose-500"
              categories={report.expenseBreakdown}
              total={report.totalExpenses}
              totalLabel={t('reports.totalExpenses')}
              emptyLabel={t('reports.noExpensesInPeriod')}
              transactionLabel={t('reports.transactionCount')}
            />
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
                <div className="flex items-center gap-4 pt-1">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('transactions.income')}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> {t('transactions.expense')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
                <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 38)} className="sm:!h-[360px]">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(160 84% 33%)" />
                        <stop offset="100%" stopColor="hsl(160 84% 45%)" />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(347 77% 44%)" />
                        <stop offset="100%" stopColor="hsl(347 77% 56%)" />
                      </linearGradient>
                    </defs>
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
                      cursor={{ fill: 'hsl(var(--secondary))' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} animationDuration={600} animationEasing="ease-out">
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={barFill(d.type)} />
                      ))}
                      <LabelList
                        dataKey="amount"
                        position="right"
                        formatter={(v: any) => formatCurrencyCompact(Number(v) || 0)}
                        style={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
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