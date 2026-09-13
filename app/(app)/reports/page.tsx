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
  PieChart as RePieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
/*  Background — Glassmorphism + Noise Texture                         */
/*  Komponen sama persis dengan Dashboard & Transactions, supaya       */
/*  nuansa visualnya konsisten di seluruh aplikasi.                    */
/* ------------------------------------------------------------------ */

const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function PageBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* 1. Dasar solid — abu sangat muda di light mode, nyaris hitam di dark mode */}
      <div className="absolute inset-0 bg-[#f4f4f6] dark:bg-[#0a0a0c]" />

      {/* 2a. Glow diagonal kiri-atas */}
      <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rotate-[-20deg] bg-blue-200/25 blur-[110px] dark:bg-white/[0.10]" />

      {/* 2b. Glow lembut menyebar di kanan-tengah */}
      <div className="absolute top-1/3 right-[-10%] h-[520px] w-[620px] -translate-y-1/2 rounded-full bg-indigo-200/20 blur-[130px] dark:bg-white/[0.07]" />

      {/* 2c. Glow tengah */}
      <div className="absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-black/[0.04] blur-[120px] dark:bg-white/[0.1]" />

      {/* 3. Noise / grain halus — dipakai di kedua mode, opacity beda jauh */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-multiply dark:opacity-[0.05] dark:mix-blend-overlay"
        style={{ backgroundImage: NOISE_BG, backgroundRepeat: 'repeat' }}
      />
    </div>
  );
}

// Class glass dasar (transparan + blur + border tipis terang) yang dipasang di
// atas class border/shadow tone yang sudah ada di tiap kartu — jadi warnanya
// (ring emerald/rose/amber, dsb) tetap dipertahankan, cuma ditambah lapisan kaca.
const GLASS_CARD =
  'bg-white/60 [backdrop-filter:blur(20px)_saturate(150%)] dark:bg-white/[0.05] dark:border-white/10 dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]';

/* ------------------------------------------------------------------ */
/*  Small presentational components                                    */
/* ------------------------------------------------------------------ */

function RupiahIcon({ className }: { className?: string }) {
  return (
    <span className={cn('font-bold leading-none', className)} style={{ fontSize: '0.95em' }}>
      Rp
    </span>
  );
}

type CardTone = 'emerald' | 'rose' | 'amber';

const toneStyles: Record<CardTone, { bg: string; text: string; ring: string; bar: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/10',
    bar: 'from-emerald-500 to-emerald-400',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500/10',
    bar: 'from-rose-500 to-rose-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/10',
    bar: 'from-amber-500 to-amber-400',
  },
};

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  trendUp,
  barPercent,
  badgePercent,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: CardTone;
  trendUp: boolean;
  barPercent: number;
  badgePercent: number | null;
  delay: number;
}) {
  const style = toneStyles[tone];
  const TrendIcon = trendUp ? ArrowUpRight : ArrowDownRight;
  return (
    <Card
      className={cn(
        'animate-fade-in overflow-hidden border-border/60 ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md',
        style.ring,
        GLASS_CARD,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', style.bg)}>
            <Icon className={cn('h-5 w-5', style.text)} />
          </div>
          {badgePercent !== null && (
            <span className={cn('flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium', style.bg, style.text)}>
              <TrendIcon className="h-3 w-3" />
              {Math.round(badgePercent)}%
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-mono text-lg font-bold tabular-nums tracking-tight sm:text-2xl">{formatCurrency(value)}</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full rounded-full bg-gradient-to-r', style.bar)}
            style={{ width: `${Math.min(100, Math.max(0, barPercent))}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type BreakdownCategory = {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  parentId: string | null;
  parentName: string | null;
};

function groupBreakdownCategories(categories: BreakdownCategory[]) {
  const groups = new Map<
    string,
    {
      parentId: string;
      parentName: string;
      items: BreakdownCategory[];
      total: number;
      count: number;
    }
  >();

  for (const category of categories) {
    const parentId = category.parentId ?? category.categoryId;
    const parentName = category.parentName ?? category.categoryName;

    const existing = groups.get(parentId);

    if (existing) {
      existing.items.push(category);
      existing.total += category.total;
      existing.count += category.count;
    } else {
      groups.set(parentId, {
        parentId,
        parentName,
        items: [category],
        total: category.total,
        count: category.count,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

// Ringkas jadi maksimal `limit` slice per parent kategori + sisanya digabung "Lainnya",
// supaya donut tetap enak dibaca walau kategori & subkategorinya banyak.
function buildDonutSlices(categories: BreakdownCategory[], limit: number, othersLabel: string) {
  const grouped = groupBreakdownCategories(categories);
  const top = grouped.slice(0, limit).map((g) => ({ name: g.parentName, value: g.total }));
  const rest = grouped.slice(limit).reduce((sum, g) => sum + g.total, 0);
  if (rest > 0) top.push({ name: othersLabel, value: rest });
  return top;
}

const INCOME_DONUT_COLORS = ['#047857', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1d5db'];
const EXPENSE_DONUT_COLORS = ['#be123c', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#d1d5db'];

function CategoryDonutChart({
  title,
  total,
  totalLabel,
  slices,
  colors,
  emptyLabel,
}: {
  title: string;
  total: number;
  totalLabel: string;
  slices: { name: string; value: number }[];
  colors: string[];
  emptyLabel: string;
}) {
  if (slices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <RePieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={slices.length > 1 ? 2 : 0}
              strokeWidth={0}
              animationDuration={500}
            >
              {slices.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
          </RePieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-muted-foreground">{totalLabel}</span>
          <span className="font-mono text-sm font-bold tabular-nums">{formatCurrencyCompact(total)}</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {slices.map((slice, i) => (
          <div key={slice.name} className="flex min-w-0 items-center gap-1.5 text-xs">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{slice.name}</span>
            <span className="flex-shrink-0 font-mono tabular-nums text-foreground">
              {total > 0 ? ((slice.value / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBreakdownCard({
  title,
  description,
  icon: Icon,
  iconClass,
  chipClass,
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
  chipClass: string;
  barClass: string;
  categories: BreakdownCategory[];
  total: number;
  totalLabel: string;
  emptyLabel: string;
  transactionLabel: string;
}) {
  const groupedCategories = groupBreakdownCategories(categories);

  return (
    <Card className={cn('border-border/60', GLASS_CARD)}>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl', chipClass)}>
            <Icon className={cn('h-4 w-4', iconClass)} />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-0.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedCategories.map((group) => {
              const parentCategory = group.items.find((item) => item.categoryId === group.parentId);
              const childCategories = group.items.filter((item) => item.parentId === group.parentId);
              const hasChildren = childCategories.length > 0;
              const directParentTotal = parentCategory && !parentCategory.parentId ? parentCategory.total : 0;

              return (
                <div key={group.parentId} className="rounded-xl border border-border/60 bg-secondary/20 p-3.5 transition-colors hover:bg-secondary/40">
                  {/* Parent */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{group.parentName}</span>
                    <span className="flex-shrink-0 font-mono text-sm font-semibold tabular-nums">
                      {formatCurrency(group.total)}
                    </span>
                  </div>

                  {!hasChildren && (
                    <div className="mt-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn('h-full rounded-full', barClass)}
                            style={{
                              width: `${total > 0 ? Math.min(100, (group.total / total) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <span className="w-9 flex-shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {total > 0 ? ((group.total / total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {group.count} {transactionLabel}
                      </p>
                    </div>
                  )}

                  {/* Subcategories */}
                  {hasChildren && (
                    <div className="mt-2.5 space-y-2.5 border-l-2 border-border pl-3">
                      {directParentTotal > 0 && parentCategory && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted-foreground">{parentCategory.categoryName}</span>
                          <span className="flex-shrink-0 font-mono text-xs font-medium tabular-nums">
                            {formatCurrency(directParentTotal)}
                          </span>
                        </div>
                      )}

                      {childCategories
                        .sort((a, b) => b.total - a.total)
                        .map((item) => (
                          <div key={item.categoryId}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs text-muted-foreground">{item.categoryName}</span>
                              <span className="flex-shrink-0 font-mono text-xs font-medium tabular-nums">
                                {formatCurrency(item.total)}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className={cn('h-full rounded-full', barClass)}
                                  style={{
                                    width: `${
                                      group.total > 0 ? Math.min(100, (item.total / group.total) * 100) : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="w-9 flex-shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                                {group.total > 0 ? ((item.total / group.total) * 100).toFixed(0) : 0}%
                              </span>
                            </div>

                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {item.count} {transactionLabel}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Total */}
            <div className="mt-1 flex items-center justify-between rounded-xl bg-secondary/60 px-3.5 py-3">
              <span className="text-sm font-semibold">{totalLabel}</span>
              <span className="font-mono text-sm font-bold tabular-nums">{formatCurrency(total)}</span>
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
            className="h-7 w-7 rounded-full"
            onClick={() => onViewMonthChange(new Date(year, month - 1, 1))}
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-full"
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
                isSelectedEdge && 'rounded-full bg-blue-600 font-semibold text-white hover:bg-blue-600',
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

  function isActivePreset(preset: { start: Date; end: Date }) {
    return isSameDay(rangeStart, preset.start) && isSameDay(rangeEnd, preset.end);
  }

  const activePresetLabel = presets.find((p) => isActivePreset(p))?.label;
  const rangeText = formatRangeLabel(rangeStart, rangeEnd, t('reports.allTime'));
  const exportPeriodLabel = isAllTime
    ? t('reports.allTime')
    : activePresetLabel
      ? `${activePresetLabel} (${rangeText})`
      : `${t('reports.custom')} (${rangeText})`;

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
    const generatedAt = formatDateTimeID(new Date());

    function buildBreakdownRows(categories: BreakdownCategory[], totalLabel: string, total: number) {
      const groups = new Map<string, { parent: BreakdownCategory; children: BreakdownCategory[]; total: number; count: number }>();

      for (const category of categories) {
        const groupId = category.parentId ?? category.categoryId;
        const existing = groups.get(groupId);
        if (!existing) {
          groups.set(groupId, { parent: category, children: [], total: 0, count: 0 });
        }
        const group = groups.get(groupId)!;
        group.total += category.total;
        group.count += category.count;
        if (category.parentId) {
          group.children.push(category);
        } else {
          group.parent = category;
        }
      }

      const rows: (string | number)[][] = [];
      for (const group of Array.from(groups.values()).sort((a, b) => b.total - a.total)) {
        rows.push([group.parent.categoryName, '', group.total, group.count]);
        for (const child of [...group.children].sort((a, b) => b.total - a.total)) {
          rows.push(['', `↳ ${child.categoryName}`, child.total, child.count]);
        }
        rows.push(['', '', '', '']);
      }
      if (rows.length > 0) {
        rows.pop();
      }
      rows.push([totalLabel, '', total, categories.reduce((sum, category) => sum + category.count, 0)]);
      return rows;
    }

    const summaryRows: (string | number)[][] = [
      [t('reports.title')],
      [t('reports.period').replace(':', ''), exportPeriodLabel],
      [t('reports.generatedOn'), generatedAt],
      [],
      [t('reports.totalIncome'), report?.totalIncome ?? 0],
      [t('reports.totalExpenses'), report?.totalExpenses ?? 0],
      [t('reports.netProfit'), report?.netProfit ?? 0],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 24 }, { wch: 38 }];
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    for (const cellRef of ['B5', 'B6', 'B7']) {
      if (summarySheet[cellRef]) {
        summarySheet[cellRef].z = '#,##0';
      }
    }
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    function createBreakdownSheet(categories: BreakdownCategory[], sheetName: string, title: string, totalLabel: string, total: number) {
      const rows: (string | number)[][] = [
        [title],
        [t('reports.period').replace(':', ''), exportPeriodLabel],
        [],
        [t('reports.category'), 'Subcategory', t('reports.amount'), t('reports.transactions')],
        ...buildBreakdownRows(categories, totalLabel, total),
      ];

      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet['!cols'] = [{ wch: 32 }, { wch: 32 }, { wch: 20 }, { wch: 18 }];
      sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

      for (let row = 4; row < rows.length; row++) {
        const amountCell = sheet[`C${row + 1}`];
        if (amountCell) {
          amountCell.z = '#,##0';
        }
      }

      if (rows.length > 4) {
        sheet['!autofilter'] = { ref: `A4:D${rows.length}` };
      }

      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    }

    createBreakdownSheet(report?.incomeBreakdown ?? [], 'Income Breakdown', t('reports.incomeBreakdown'), t('reports.totalIncome'), report?.totalIncome ?? 0);
    createBreakdownSheet(report?.expenseBreakdown ?? [], 'Expense Breakdown', t('reports.expenseBreakdown'), t('reports.totalExpenses'), report?.totalExpenses ?? 0);

    XLSX.writeFile(wb, 'profit-loss-report.xlsx');
  }

  function exportPdf() {
    const win = window.open('', '_blank');
    if (!win) return;

    function escapeHtml(value: string) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function buildBreakdownRows(categories: BreakdownCategory[]) {
      const groups = new Map<string, { parent: BreakdownCategory; children: BreakdownCategory[]; total: number; count: number }>();

      for (const category of categories) {
        const groupId = category.parentId ?? category.categoryId;
        const existing = groups.get(groupId);
        if (!existing) {
          groups.set(groupId, { parent: category, children: [], total: 0, count: 0 });
        }
        const group = groups.get(groupId)!;
        group.total += category.total;
        group.count += category.count;
        if (category.parentId) {
          group.children.push(category);
        } else {
          group.parent = category;
        }
      }

      return Array.from(groups.values())
        .sort((a, b) => b.total - a.total)
        .map((group) => {
          const parentName = group.parent.categoryName;
          const parentRow = `
            <tr class="parent-row">
              <td class="parent-cell">${escapeHtml(parentName)}</td>
              <td class="subcategory-cell"></td>
              <td class="amount-cell">${formatCurrency(group.total)}</td>
              <td class="count-cell">${group.count}</td>
            </tr>
          `;

          const childRows = [...group.children]
            .sort((a, b) => b.total - a.total)
            .map(
              (child) => `
                <tr class="child-row">
                  <td class="parent-cell">${escapeHtml(group.parent.categoryName)}</td>
                  <td class="subcategory-cell"><span class="tree-line">└</span>${escapeHtml(child.categoryName)}</td>
                  <td class="amount-cell">${formatCurrency(child.total)}</td>
                  <td class="count-cell">${child.count}</td>
                </tr>
              `,
            )
            .join('');

          return parentRow + childRows;
        })
        .join('');
    }

    const incomeRows = buildBreakdownRows(report?.incomeBreakdown ?? []);
    const expenseRows = buildBreakdownRows(report?.expenseBreakdown ?? []);
    const incomeTransactionCount = report?.incomeBreakdown.reduce((sum, item) => sum + item.count, 0) ?? 0;
    const expenseTransactionCount = report?.expenseBreakdown.reduce((sum, item) => sum + item.count, 0) ?? 0;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t('reports.title'))}</title>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4; margin: 18mm 14mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; background: #ffffff; margin: 0; font-size: 12px; line-height: 1.45; }
            .report { width: 100%; }
            .header { margin-bottom: 24px; }
            .title { margin: 0; font-size: 25px; line-height: 1.2; font-weight: 700; color: #111827; }
            .subtitle { margin-top: 5px; color: #6b7280; font-size: 12px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
            .meta-box { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
            .meta-label { display: block; font-size: 10px; color: #6b7280; margin-bottom: 2px; }
            .meta-value { font-size: 12px; font-weight: 600; color: #111827; }
            .summary { margin-bottom: 28px; }
            .summary-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #111827; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .summary-card { padding: 13px 14px; border: 1px solid #e5e7eb; border-radius: 9px; background: #ffffff; }
            .summary-card.income { border-top: 3px solid #10b981; }
            .summary-card.expense { border-top: 3px solid #f43f5e; }
            .summary-card.profit { border-top: 3px solid #f59e0b; }
            .summary-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
            .summary-value { margin-top: 5px; font-size: 18px; font-weight: 700; color: #111827; }
            .section { margin-bottom: 26px; page-break-inside: avoid; }
            .section-title { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: #111827; }
            .section-description { margin-bottom: 10px; color: #6b7280; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { display: table-header-group; }
            th { padding: 9px 8px; text-align: left; font-size: 10px; font-weight: 700; color: #374151; background: #f3f4f6; border-top: 1px solid #d1d5db; border-bottom: 2px solid #d1d5db; }
            td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
            .parent-row { background: #f9fafb; font-weight: 700; }
            .parent-row td { border-bottom: 1px solid #d1d5db; }
            .child-row { background: #ffffff; }
            .child-row td { color: #4b5563; }
            .parent-cell { width: 30%; }
            .subcategory-cell { width: 35%; }
            .amount-cell { width: 22%; text-align: right; white-space: nowrap; font-family: 'Courier New', monospace; font-weight: 600; }
            .count-cell { width: 13%; text-align: center; }
            .tree-line { display: inline-block; width: 18px; color: #9ca3af; font-weight: 700; }
            .total-row { background: #f3f4f6; font-weight: 700; }
            .total-row td { border-top: 2px solid #d1d5db; border-bottom: 0; }
            .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 10px; }
            .no-print { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
            .print-button { padding: 10px 18px; border: 0; border-radius: 7px; background: #111827; color: white; cursor: pointer; font-size: 13px; }
            @media print {
              .no-print { display: none; }
              .section { page-break-inside: avoid; }
              .parent-row, .child-row { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="report">
            <div class="header">
              <h1 class="title">${escapeHtml(t('reports.title'))}</h1>
              <div class="subtitle">${escapeHtml(t('reports.subtitle'))}</div>
              <div class="meta">
                <div class="meta-box">
                  <span class="meta-label">${escapeHtml(t('reports.period'))}</span>
                  <span class="meta-value">${escapeHtml(exportPeriodLabel)}</span>
                </div>
                <div class="meta-box">
                  <span class="meta-label">${escapeHtml(t('reports.generatedOn'))}</span>
                  <span class="meta-value">${escapeHtml(formatDateTimeID(new Date()))}</span>
                </div>
              </div>
            </div>

            <div class="summary">
              <h2 class="summary-title">${escapeHtml(t('reports.title'))}</h2>
              <div class="summary-grid">
                <div class="summary-card income">
                  <div class="summary-label">${escapeHtml(t('reports.totalIncome'))}</div>
                  <div class="summary-value">${formatCurrency(report?.totalIncome ?? 0)}</div>
                </div>
                <div class="summary-card expense">
                  <div class="summary-label">${escapeHtml(t('reports.totalExpenses'))}</div>
                  <div class="summary-value">${formatCurrency(report?.totalExpenses ?? 0)}</div>
                </div>
                <div class="summary-card profit">
                  <div class="summary-label">${escapeHtml(t('reports.netProfit'))}</div>
                  <div class="summary-value">${formatCurrency(report?.netProfit ?? 0)}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">${escapeHtml(t('reports.incomeBreakdown'))}</h2>
              <div class="section-description">${escapeHtml(t('reports.revenueByCategory'))}</div>
              <table>
                <thead>
                  <tr>
                    <th>Parent Category</th>
                    <th>Subcategory</th>
                    <th style="text-align:right">${escapeHtml(t('reports.amount'))}</th>
                    <th style="text-align:center">${escapeHtml(t('reports.transactions'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${incomeRows}
                  <tr class="total-row">
                    <td colspan="2">${escapeHtml(t('reports.totalIncome'))}</td>
                    <td class="amount-cell">${formatCurrency(report?.totalIncome ?? 0)}</td>
                    <td class="count-cell">${incomeTransactionCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2 class="section-title">${escapeHtml(t('reports.expenseBreakdown'))}</h2>
              <div class="section-description">${escapeHtml(t('reports.costsByCategory'))}</div>
              <table>
                <thead>
                  <tr>
                    <th>Parent Category</th>
                    <th>Subcategory</th>
                    <th style="text-align:right">${escapeHtml(t('reports.amount'))}</th>
                    <th style="text-align:center">${escapeHtml(t('reports.transactions'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenseRows}
                  <tr class="total-row">
                    <td colspan="2">${escapeHtml(t('reports.totalExpenses'))}</td>
                    <td class="amount-cell">${formatCurrency(report?.totalExpenses ?? 0)}</td>
                    <td class="count-cell">${expenseTransactionCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="footer">${escapeHtml(t('reports.generatedOn'))} ${escapeHtml(formatDateTimeID(new Date()))}</div>

            <div class="no-print">
              <button class="print-button" onclick="window.print()">${escapeHtml(t('reports.printSaveAsPdf'))}</button>
            </div>
          </div>
        </body>
      </html>
    `);

    win.document.close();
  }

  // Rasio pengeluaran terhadap pemasukan — tidak terdefinisi kalau belum ada pemasukan sama sekali,
  // jadi badge disembunyikan (bukan dipaksa jadi 0% atau 100% yang bisa menyesatkan).
  const expenseRatio = report && report.totalIncome > 0 ? (report.totalExpenses / report.totalIncome) * 100 : null;
  const expenseBarPercent = report
    ? expenseRatio !== null
      ? expenseRatio
      : report.totalExpenses > 0
        ? 100 // tidak ada pemasukan tapi ada pengeluaran → bar penuh (semua aktivitas keluar), tanpa klaim %
        : 0
    : 0;

  // Margin bersih — sama, hanya terdefinisi kalau ada pemasukan. Bar tidak dipaksa minimum 4%
  // lagi supaya margin negatif (rugi) tampil sebagai bar kosong, bukan kelihatan masih untung dikit.
  const netMargin = report && report.totalIncome > 0 ? (report.netProfit / report.totalIncome) * 100 : null;

  const summaryCards = report
    ? [
        {
          label: t('reports.totalIncome'),
          value: report.totalIncome,
          icon: TrendingUp,
          tone: 'emerald' as CardTone,
          trendUp: true,
          barPercent: 100,
          badgePercent: null, // baseline, bukan hasil rasio apa pun — tidak perlu angka %
        },
        {
          label: t('reports.totalExpenses'),
          value: report.totalExpenses,
          icon: TrendingDown,
          tone: 'rose' as CardTone,
          trendUp: false,
          barPercent: expenseBarPercent,
          badgePercent: expenseRatio,
        },
        {
          label: t('reports.netProfit'),
          value: report.netProfit,
          icon: RupiahIcon,
          tone: 'amber' as CardTone,
          trendUp: report.netProfit >= 0,
          barPercent: netMargin !== null ? Math.max(0, netMargin) : 0,
          badgePercent: netMargin,
        },
      ]
    : [];

  // "Lainnya" hardcode (senada dengan label kalender/bulan lain di halaman ini yang juga hardcode ID)
  const incomeSlices = report ? buildDonutSlices(report.incomeBreakdown, 5, 'Lainnya') : [];
  const expenseSlices = report ? buildDonutSlices(report.expenseBreakdown, 5, 'Lainnya') : [];
  const isExporting = exporting !== null;

  return (
    <div className="relative isolate p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Ambient background — glassmorphism + noise, sama seperti halaman Dashboard & Transactions */}
      <PageBackground />

      <PageHeader title={t('reports.title')} description={t('reports.subtitle')}>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting || loading} className="gap-1.5">
            {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {t('reports.exportPdf')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')} disabled={isExporting || loading} className="gap-1.5">
            {exporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {t('reports.exportExcel')}
          </Button>
        </div>
      </PageHeader>

      {/* Filter periode — pintasan cepat + kalender, rapi di mobile & desktop */}
      <Card className={cn('mb-5 border-border/60 sm:mb-6', GLASS_CARD)}>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
              <CalendarIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            {t('reports.period')}
            <span className="ml-auto truncate rounded-full bg-secondary px-2.5 py-1 text-xs font-normal text-foreground">
              {formatRangeLabel(rangeStart, rangeEnd, t('reports.allTime'))}
            </span>
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
                      'flex flex-shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-all lg:w-full lg:whitespace-normal lg:rounded-lg lg:text-left',
                      active
                        ? 'border-blue-600 bg-blue-600 font-medium text-white shadow-sm'
                        : 'border-border text-foreground hover:border-blue-200 hover:bg-secondary',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-white' : 'text-muted-foreground')} />
                    <span className="flex-1">{p.label}</span>
                    {active && <Check className="hidden h-4 w-4 flex-shrink-0 text-white lg:block" />}
                  </button>
                );
              })}
              <button
                onClick={handleClearRange}
                className={cn(
                  'flex flex-shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-all lg:w-full lg:whitespace-normal lg:rounded-lg lg:text-left',
                  isAllTime
                    ? 'border-blue-600 bg-blue-600 font-medium text-white shadow-sm'
                    : 'border-border text-muted-foreground hover:border-blue-200 hover:bg-secondary',
                )}
              >
                <InfinityIcon className={cn('h-4 w-4 flex-shrink-0', isAllTime ? 'text-white' : 'text-muted-foreground')} />
                <span className="flex-1">{t('reports.allTime')}</span>
                {isAllTime && <Check className="hidden h-4 w-4 flex-shrink-0 text-white lg:block" />}
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
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl sm:h-32" />)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : !report ? (
        <Card className={cn('border-border/60', GLASS_CARD)}>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <PieChart className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t('reports.loadFailed')}</p>
          </CardContent>
        </Card>
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
                barPercent={card.barPercent}
                badgePercent={card.badgePercent}
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
              chipClass="bg-emerald-50 dark:bg-emerald-950/40"
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
              chipClass="bg-rose-50 dark:bg-rose-950/40"
              barClass="bg-rose-500"
              categories={report.expenseBreakdown}
              total={report.totalExpenses}
              totalLabel={t('reports.totalExpenses')}
              emptyLabel={t('reports.noExpensesInPeriod')}
              transactionLabel={t('reports.transactionCount')}
            />
          </div>

          {/* Donut charts: proporsi kategori, terpisah income vs expense supaya tetap ringkas
              walau jumlah kategori & subkategorinya banyak */}
          {(incomeSlices.length > 0 || expenseSlices.length > 0) && (
            <Card className={cn('border-border/60', GLASS_CARD)}>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-4 w-4 flex-shrink-0" />
                  {t('reports.categoryComparison')}
                </CardTitle>
                <CardDescription>{t('reports.amountByCategory')}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-6 p-4 pt-0 sm:grid-cols-2 sm:gap-8 sm:p-6 sm:pt-0">
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {t('transactions.income')}
                  </p>
                  <CategoryDonutChart
                    title={t('reports.incomeBreakdown')}
                    total={report?.totalIncome ?? 0}
                    totalLabel={t('reports.totalIncome')}
                    slices={incomeSlices}
                    colors={INCOME_DONUT_COLORS}
                    emptyLabel={t('reports.noIncomeInPeriod')}
                  />
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {t('transactions.expense')}
                  </p>
                  <CategoryDonutChart
                    title={t('reports.expenseBreakdown')}
                    total={report?.totalExpenses ?? 0}
                    totalLabel={t('reports.totalExpenses')}
                    slices={expenseSlices}
                    colors={EXPENSE_DONUT_COLORS}
                    emptyLabel={t('reports.noExpensesInPeriod')}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}