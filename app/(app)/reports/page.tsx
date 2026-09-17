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
  Wallet,
} from 'lucide-react';
import {
  PieChart as RePieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { AccountAvatar } from '@/lib/account-logos';
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

// Format tanggal ringkas (dd MMM yyyy) — dipakai khusus di bagian lampiran
// bukti transaksi pada export PDF/Excel.
function formatDateID(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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

// Ringkas breakdown kategori jadi maksimal `limit` baris teratas + sisanya
// digabung "+N lainnya", supaya kartu per-bank tetap ringkas walau kategorinya banyak.
function topCategoryLines(categories: BreakdownCategory[], limit: number) {
  const grouped = groupBreakdownCategories(categories);
  const top = grouped.slice(0, limit);
  const restCount = grouped.length - top.length;
  return { top, restCount };
}

function BankDetailCard({ account, report }: { account: ReportAccount; report: ProfitLossReport }) {
  const { top: topIncome, restCount: restIncome } = topCategoryLines(report.incomeBreakdown, 4);
  const { top: topExpense, restCount: restExpense } = topCategoryLines(report.expenseBreakdown, 4);

  return (
    <Card className={cn('border-border/60', GLASS_CARD)}>
      <CardHeader className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AccountAvatar
              accountName={account.accountName}
              boxClassName="h-9 w-9"
              iconClassName="h-4 w-4"
              iconBg="bg-sky-100 dark:bg-sky-950/40"
              iconText="text-sky-600 dark:text-sky-400"
            />
            <div className="min-w-0">
              <CardTitle className="truncate text-sm">{account.accountName}</CardTitle>
              <CardDescription className="text-xs">
                Laba bersih: <span className={cn('font-mono font-semibold', report.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>{formatCurrency(report.netProfit)}</span>
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-5 sm:pt-0">
        {/* Pemasukan dari bank ini */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Pemasukan
            </p>
            <span className="font-mono text-xs font-semibold tabular-nums">{formatCurrency(report.totalIncome)}</span>
          </div>
          {topIncome.length === 0 ? (
            <p className="text-xs text-muted-foreground">Tidak ada pemasukan</p>
          ) : (
            <div className="space-y-1.5">
              {topIncome.map((g) => (
                <div key={g.parentId} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{g.parentName}</span>
                  <span className="flex-shrink-0 font-mono tabular-nums">{formatCurrency(g.total)}</span>
                </div>
              ))}
              {restIncome > 0 && <p className="text-[11px] text-muted-foreground">+{restIncome} kategori lainnya</p>}
            </div>
          )}
        </div>

        {/* Pengeluaran dari bank ini */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-3.5 w-3.5" />
              Pengeluaran
            </p>
            <span className="font-mono text-xs font-semibold tabular-nums">{formatCurrency(report.totalExpenses)}</span>
          </div>
          {topExpense.length === 0 ? (
            <p className="text-xs text-muted-foreground">Tidak ada pengeluaran</p>
          ) : (
            <div className="space-y-1.5">
              {topExpense.map((g) => (
                <div key={g.parentId} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{g.parentName}</span>
                  <span className="flex-shrink-0 font-mono tabular-nums">{formatCurrency(g.total)}</span>
                </div>
              ))}
              {restExpense > 0 && <p className="text-[11px] text-muted-foreground">+{restExpense} kategori lainnya</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

type ReportAccount = { id: string; accountName: string };

// Laporan lengkap (termasuk breakdown kategori) untuk satu akun/bank — dipakai
// baik untuk tampilan "Rincian per Bank" di layar maupun untuk export.
type AccountDetail = {
  account: ReportAccount;
  report: ProfitLossReport;
};

// Transaksi yang punya bukti (attachmentUrl) pada periode terpilih — dipakai
// khusus untuk bagian "Lampiran Bukti Transaksi" di export PDF (dan sebagai
// daftar link di sheet "Lampiran Bukti" pada export Excel).
type ProofTransaction = {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  transactionType: 'INCOME' | 'EXPENSE';
  attachmentUrl: string;
  categoryName: string;
  accountName: string | null;
};

export default function ReportsPage() {
  const auth = useAuth();
  const { getProfitLoss } = auth;
  const getTransactions = (auth as unknown as { getTransactions?: (p: { startDate: string; endDate: string; accountId?: string }) => Promise<any[]> }).getTransactions;
  const getAccounts = (auth as unknown as { getAccounts?: () => Promise<ReportAccount[]> }).getAccounts;

  const { t } = useLanguage();
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  // '' = Semua Akun
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const startDate = rangeStart ? toISODate(rangeStart) : '';
  const endDate = rangeEnd ? toISODate(rangeEnd) : rangeStart ? toISODate(rangeStart) : '';

  const { data: accounts = [] } = useQuery<ReportAccount[]>({
    queryKey: ['accounts'],
    queryFn: () => getAccounts!(),
    enabled: typeof getAccounts === 'function',
  });

  const { data: report, isLoading: loading } = useQuery<ProfitLossReport>({
    queryKey: ['profit-loss', startDate, endDate, selectedAccountId],
    queryFn: () =>
      (getProfitLoss as unknown as (p: {
        startDate?: string;
        endDate?: string;
        accountId?: string;
      }) => Promise<ProfitLossReport>)({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        accountId: selectedAccountId || undefined,
      }),
  });

  const monthStartISO = toISODate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1));
  const monthEndISO = toISODate(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0));

  const { data: monthTransactions = [] } = useQuery({
    queryKey: ['transactions-calendar', monthStartISO, monthEndISO, selectedAccountId],
    queryFn: () =>
      getTransactions!({
        startDate: monthStartISO,
        endDate: monthEndISO,
        accountId: selectedAccountId || undefined,
      }),
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

  // Nama akun yang sedang aktif, dipakai di UI & di export.
  const selectedAccountLabel = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)?.accountName ?? 'Akun'
    : 'Semua Akun';

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

  // Kalau "Semua Akun" yang dipilih, tarik laporan LENGKAP (termasuk breakdown
  // kategori) per masing-masing akun secara paralel. Dipakai untuk section
  // "Rincian per Bank" di layar, dan datanya dipakai ulang saat export (PDF/Excel)
  // supaya tidak perlu fetch dua kali. Kalau user sudah filter ke 1 akun spesifik,
  // query ini nonaktif karena datanya jadi tidak relevan lagi.
  const shouldFetchPerAccount = !selectedAccountId && accounts.length > 0 && typeof getProfitLoss === 'function';

  const { data: perAccountReports = [], isLoading: perAccountLoading } = useQuery<AccountDetail[]>({
    queryKey: ['profit-loss-per-account', startDate, endDate, accounts.map((a) => a.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        accounts.map(async (acc) => {
          const r = await (getProfitLoss as unknown as (p: {
            startDate?: string;
            endDate?: string;
            accountId?: string;
          }) => Promise<ProfitLossReport>)({
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            accountId: acc.id,
          });
          return { account: acc, report: r };
        }),
      );
      // Cuma tampilkan akun yang beneran ada aktivitas di periode ini,
      // diurutkan dari yang paling aktif supaya enak dibaca.
      return results
        .filter((x) => (x.report?.totalIncome ?? 0) > 0 || (x.report?.totalExpenses ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.report.totalIncome + b.report.totalExpenses) - (a.report.totalIncome + a.report.totalExpenses),
        );
    },
    enabled: shouldFetchPerAccount,
  });

  // Ambil daftar transaksi pada periode terpilih yang punya bukti (attachmentUrl).
  // Di-fetch on-demand saat export (bukan lewat useQuery) supaya tidak nge-load
  // data ini kalau usernya tidak pernah export PDF/Excel.
  async function fetchProofAttachments(): Promise<ProofTransaction[]> {
    const fetcher = getTransactions as unknown as
      | ((p: { startDate?: string; endDate?: string; accountId?: string }) => Promise<any[]>)
      | undefined;

    if (typeof fetcher !== 'function') return [];

    const txs = await fetcher({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      accountId: selectedAccountId || undefined,
    });

    return (txs ?? [])
      .filter((tx: any) => !!tx.attachmentUrl)
      .map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description ?? null,
        amount: tx.amount,
        transactionType: tx.transactionType,
        attachmentUrl: tx.attachmentUrl as string,
        categoryName: tx.category?.parent
          ? `${tx.category.parent.categoryName} / ${tx.category.categoryName}`
          : tx.category?.categoryName ?? '-',
        accountName: tx.account?.accountName ?? null,
      }))
      .sort(
        (a: ProofTransaction, b: ProofTransaction) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
  }

  async function handleExport(format: 'pdf' | 'excel') {
    setExporting(format);
    try {
      const perAccount = shouldFetchPerAccount ? perAccountReports : null;
      const proofTransactions = await fetchProofAttachments();

      if (format === 'excel') {
        exportExcel(perAccount, proofTransactions);
      } else {
        exportPdf(perAccount, proofTransactions);
      }
    } finally {
      setExporting(null);
    }
  }

  function exportExcel(perAccount: AccountDetail[] | null, proofTransactions: ProofTransaction[] = []) {
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

    // Baris ringkasan: judul, periode, akun, tanggal cetak, lalu angka-angka utama.
    const summaryRows: (string | number)[][] = [
      [t('reports.title')],
      [t('reports.period').replace(':', ''), exportPeriodLabel],
      ['Akun', selectedAccountLabel],
      [t('reports.generatedOn'), generatedAt],
      [],
      [t('reports.totalIncome'), report?.totalIncome ?? 0],
      [t('reports.totalExpenses'), report?.totalExpenses ?? 0],
      [t('reports.netProfit'), report?.netProfit ?? 0],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 24 }, { wch: 38 }];
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    // Baris angka (income/expenses/netProfit) sekarang di baris 6, 7, 8
    // karena ada baris tambahan "Akun" di atasnya.
    for (const cellRef of ['B6', 'B7', 'B8']) {
      if (summarySheet[cellRef]) {
        summarySheet[cellRef].z = '#,##0';
      }
    }
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Sheet khusus "Per Akun" — hanya muncul kalau filter di halaman lagi "Semua Akun"
    // dan memang ada transaksi di salah satu akun pada periode terpilih.
    if (perAccount && perAccount.length > 0) {
      const totalIncome = perAccount.reduce((s, x) => s + x.report.totalIncome, 0);
      const totalExpenses = perAccount.reduce((s, x) => s + x.report.totalExpenses, 0);
      const totalNet = perAccount.reduce((s, x) => s + x.report.netProfit, 0);

      const summaryRowsAcct: (string | number)[][] = [
        ['Ringkasan per Akun/Bank'],
        [t('reports.period').replace(':', ''), exportPeriodLabel],
        [t('reports.generatedOn'), generatedAt],
        [],
        ['Akun/Bank', 'Total Pemasukan', 'Total Pengeluaran', 'Laba Bersih'],
        ...perAccount.map((x) => [x.account.accountName, x.report.totalIncome, x.report.totalExpenses, x.report.netProfit]),
        ['Total', totalIncome, totalExpenses, totalNet],
      ];

      const acctSheet = XLSX.utils.aoa_to_sheet(summaryRowsAcct);
      acctSheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
      acctSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

      const headerRowIndex = 4; // baris header tabel (0-based)
      for (let row = headerRowIndex + 1; row < summaryRowsAcct.length; row++) {
        for (const col of ['B', 'C', 'D']) {
          const cell = acctSheet[`${col}${row + 1}`];
          if (cell) cell.z = '#,##0';
        }
      }
      acctSheet['!autofilter'] = { ref: `A${headerRowIndex + 1}:D${summaryRowsAcct.length}` };
      acctSheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIndex + 1 }];

      XLSX.utils.book_append_sheet(wb, acctSheet, 'Per Akun');

      // Sheet "Detail per Bank" — setiap transaksi/kategori ditandai bank asalnya,
      // supaya kelihatan uangnya dari/ke rekening mana.
      const detailRows: (string | number)[][] = [
        ['Detail Transaksi per Bank'],
        [t('reports.period').replace(':', ''), exportPeriodLabel],
        [t('reports.generatedOn'), generatedAt],
        [],
        ['Bank/Akun', 'Jenis', 'Kategori', 'Jumlah', 'Transaksi'],
      ];

      for (const { account, report: acctReport } of perAccount) {
        const incomeGroups = groupBreakdownCategories(acctReport.incomeBreakdown);
        const expenseGroups = groupBreakdownCategories(acctReport.expenseBreakdown);

        for (const g of incomeGroups) {
          detailRows.push([account.accountName, 'Pemasukan', g.parentName, g.total, g.count]);
        }
        for (const g of expenseGroups) {
          detailRows.push([account.accountName, 'Pengeluaran', g.parentName, g.total, g.count]);
        }
        if (incomeGroups.length === 0 && expenseGroups.length === 0) {
          detailRows.push([account.accountName, '-', 'Tidak ada transaksi', 0, 0]);
        }
      }

      const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
      detailSheet['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 12 }];
      detailSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

      const detailHeaderRow = 4; // baris header tabel (0-based)
      for (let row = detailHeaderRow + 1; row < detailRows.length; row++) {
        const cell = detailSheet[`D${row + 1}`];
        if (cell) cell.z = '#,##0';
      }
      if (detailRows.length > detailHeaderRow + 1) {
        detailSheet['!autofilter'] = { ref: `A${detailHeaderRow + 1}:E${detailRows.length}` };
      }
      detailSheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: detailHeaderRow + 1 }];

      XLSX.utils.book_append_sheet(wb, detailSheet, 'Detail per Bank');
    }

    // Sheet "Lampiran Bukti" — daftar transaksi yang punya bukti terlampir, dengan
    // link URL-nya. Library `xlsx` yang dipakai di sini tidak bisa menyematkan
    // gambar langsung ke dalam cell, jadi ditampilkan sebagai link yang bisa
    // diklik/dibuka manual (gambarnya sendiri ditampilkan penuh di export PDF).
    if (proofTransactions.length > 0) {
      const attachmentRows: (string | number)[][] = [
        ['Lampiran Bukti Transaksi'],
        [t('reports.period').replace(':', ''), exportPeriodLabel],
        [t('reports.generatedOn'), generatedAt],
        [],
        ['Tanggal', 'Kategori', 'Akun', 'Jenis', 'Jumlah', 'Link Bukti'],
        ...proofTransactions.map((tx) => [
          formatDateID(tx.date),
          tx.categoryName,
          tx.accountName ?? '-',
          tx.transactionType === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
          tx.amount,
          tx.attachmentUrl,
        ]),
      ];

      const attachmentSheet = XLSX.utils.aoa_to_sheet(attachmentRows);
      attachmentSheet['!cols'] = [{ wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 46 }];
      attachmentSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

      const attachmentHeaderRow = 4;
      for (let row = attachmentHeaderRow + 1; row < attachmentRows.length; row++) {
        const cell = attachmentSheet[`E${row + 1}`];
        if (cell) cell.z = '#,##0';
      }
      attachmentSheet['!autofilter'] = { ref: `A${attachmentHeaderRow + 1}:F${attachmentRows.length}` };
      attachmentSheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: attachmentHeaderRow + 1 }];

      XLSX.utils.book_append_sheet(wb, attachmentSheet, 'Lampiran Bukti');
    }

    function createBreakdownSheet(categories: BreakdownCategory[], sheetName: string, title: string, totalLabel: string, total: number) {
      const rows: (string | number)[][] = [
        [title],
        [t('reports.period').replace(':', ''), exportPeriodLabel],
        ['Akun', selectedAccountLabel],
        [],
        [t('reports.category'), 'Subcategory', t('reports.amount'), t('reports.transactions')],
        ...buildBreakdownRows(categories, totalLabel, total),
      ];

      const sheet = XLSX.utils.aoa_to_sheet(rows);
      sheet['!cols'] = [{ wch: 32 }, { wch: 32 }, { wch: 20 }, { wch: 18 }];
      sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

      const headerRowIndex = 4; // baris header tabel (0-based), sekarang geser 1 karena ada baris Akun
      for (let row = headerRowIndex + 1; row < rows.length; row++) {
        const amountCell = sheet[`C${row + 1}`];
        if (amountCell) {
          amountCell.z = '#,##0';
        }
      }

      if (rows.length > headerRowIndex + 1) {
        sheet['!autofilter'] = { ref: `A${headerRowIndex + 1}:D${rows.length}` };
      }
      // Freeze header supaya tetap kelihatan saat sheet di-scroll ke bawah.
      sheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIndex + 1 }];

      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    }

    createBreakdownSheet(report?.incomeBreakdown ?? [], 'Income Breakdown', t('reports.incomeBreakdown'), t('reports.totalIncome'), report?.totalIncome ?? 0);
    createBreakdownSheet(report?.expenseBreakdown ?? [], 'Expense Breakdown', t('reports.expenseBreakdown'), t('reports.totalExpenses'), report?.totalExpenses ?? 0);

    const fileSuffix = selectedAccountId
      ? `-${selectedAccountLabel.toLowerCase().replace(/\s+/g, '-')}`
      : '';
    XLSX.writeFile(wb, `profit-loss-report${fileSuffix}.xlsx`);
  }
// ------------------------------------------------------------------
  // Mapping nama akun/bank -> file logo di /public/img/Bank/...
  // Dicocokkan dengan substring (case-insensitive) supaya "BCA Utama",
  // "Rekening BCA", dsb tetap kena logo yang benar. Urutan array penting:
  // taruh nama yang lebih spesifik lebih dulu kalau ada potensi tabrakan.
  // Kalau nama file/lokasi folder berbeda, cukup ubah BANK_LOGO_BASE
  // dan/atau daftar BANK_LOGO_MAP di bawah ini.
  // ------------------------------------------------------------------
  const BANK_LOGO_BASE = '/img/Bank';
  const BANK_LOGO_MAP: { match: string; file: string }[] = [
    { match: 'papua', file: 'Bankpapua.png' },
    { match: 'bca', file: 'BCA.png' },
    { match: 'bni', file: 'BNI.png' },
    { match: 'bri', file: 'BRI.png' },
    { match: 'btn', file: 'BTN.png' },
    { match: 'cimb', file: 'CIMB.png' },
    { match: 'mandiri', file: 'Mandiri.png' },
  ];

  function getBankLogoSrc(accountName: string): string | null {
    const name = accountName.toLowerCase();
    const found = BANK_LOGO_MAP.find((entry) => name.includes(entry.match));
    return found ? `${BANK_LOGO_BASE}/${found.file}` : null;
  }

  function exportPdf(perAccount: AccountDetail[] | null, proofTransactions: ProofTransaction[] = []) {
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

    // Render logo bank di depan nama akun, ukurannya cukup besar supaya tetap
    // jelas kelihatan (baik di baris tabel putih maupun header gelap). Kalau
    // gambar gagal dimuat ATAU tidak ada mapping-nya sama sekali, fallback ke
    // lingkaran inisial huruf pertama (abu-abu terang, bukan gelap) supaya
    // tetap rapi dan tidak pernah tampil kosong/blank.
    function renderBankBadge(accountName: string, size = 28) {
      const initial = accountName.trim().charAt(0).toUpperCase() || '?';
      const fallbackSpan = `<span class="bank-logo-fallback" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${escapeHtml(initial)}</span>`;

      const logoSrc = getBankLogoSrc(accountName);
      if (!logoSrc) return fallbackSpan;

      // Kalau <img> gagal load (mis. file belum ada / path salah), sembunyikan
      // gambarnya lalu tampilkan fallback yang sudah disiapkan di sebelahnya,
      // bukan dibiarkan kosong seperti sebelumnya.
      return `<span class="bank-logo-wrap" style="display:inline-flex;width:${size}px;height:${size}px">` +
        `<img src="${escapeHtml(logoSrc)}" class="bank-logo" style="width:${size}px;height:${size}px" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'" />` +
        `<span class="bank-logo-fallback" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px;display:none">${escapeHtml(initial)}</span>` +
        `</span>`;
    }

    // Logo Artha Karya di header PDF. File n.svg dipindah/copy ke public/n.svg
    // (root project, sejajar folder app/), sehingga bisa diakses langsung lewat
    // URL "/n.svg" — termasuk dari jendela print mentah ini yang tidak lewat
    // bundler Next.js. Kalau nama file/lokasinya berubah, sesuaikan LOGO_SRC.
    const LOGO_SRC = '/n.svg';

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
        .map((group, groupIndex) => {
          const parentName = group.parent.categoryName;
          const stripeClass = groupIndex % 2 === 0 ? 'stripe-a' : 'stripe-b';
          const parentRow = `
            <tr class="parent-row ${stripeClass}">
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
                <tr class="child-row ${stripeClass}">
                  <td class="parent-cell"></td>
                  <td class="subcategory-cell"><span class="tree-line">&#8627;</span>${escapeHtml(child.categoryName)}</td>
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

    // Baris tabel ringkasan "per akun/bank" — hanya diisi kalau memang ada datanya
    // (filter halaman = Semua Akun & ada transaksi di periode ini).
    const perAccountRows = (perAccount ?? [])
      .map(
        (x, i) => `
          <tr class="${i % 2 === 0 ? 'stripe-a' : 'stripe-b'}">
            <td class="acct-name">
              <div class="acct-name-inner">
                ${renderBankBadge(x.account.accountName, 28)}
                <span>${escapeHtml(x.account.accountName)}</span>
              </div>
            </td>
            <td class="acct-amount amount-in">${formatCurrency(x.report.totalIncome)}</td>
            <td class="acct-amount amount-out">${formatCurrency(x.report.totalExpenses)}</td>
            <td class="acct-amount amount-net">${formatCurrency(x.report.netProfit)}</td>
          </tr>
        `,
      )
      .join('');

    const perAccountTotals = (perAccount ?? []).reduce(
      (acc, x) => ({
        income: acc.income + x.report.totalIncome,
        expenses: acc.expenses + x.report.totalExpenses,
        net: acc.net + x.report.netProfit,
      }),
      { income: 0, expenses: 0, net: 0 },
    );

    const perAccountSection =
      perAccount && perAccount.length > 0
        ? `
            <div class="section">
              <div class="section-heading">
                <span class="section-number">02</span>
                <div>
                  <h2 class="section-title">Ringkasan per Akun/Bank</h2>
                  <div class="section-description">Kontribusi pemasukan &amp; pengeluaran dari tiap akun bank pada periode ini</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Akun/Bank</th>
                    <th style="text-align:right">Pemasukan</th>
                    <th style="text-align:right">Pengeluaran</th>
                    <th style="text-align:right">Laba Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  ${perAccountRows}
                  <tr class="total-row">
                    <td>Total</td>
                    <td class="acct-amount amount-in">${formatCurrency(perAccountTotals.income)}</td>
                    <td class="acct-amount amount-out">${formatCurrency(perAccountTotals.expenses)}</td>
                    <td class="acct-amount amount-net">${formatCurrency(perAccountTotals.net)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `
        : '';

    // Detail kategori per bank — supaya setiap baris transaksi/kategori kelihatan
    // jelas berasal dari bank/akun yang mana.
    const perAccountDetailSection =
      perAccount && perAccount.length > 0
        ? `
            <div class="section">
              <div class="section-heading">
                <span class="section-number">03</span>
                <div>
                  <h2 class="section-title">Detail Transaksi per Bank</h2>
                  <div class="section-description">Rincian kategori pemasukan &amp; pengeluaran untuk masing-masing bank/akun</div>
                </div>
              </div>
              ${perAccount
                .map(({ account, report: acctReport }) => {
                  const incomeGroups = groupBreakdownCategories(acctReport.incomeBreakdown);
                  const expenseGroups = groupBreakdownCategories(acctReport.expenseBreakdown);
                  const rows = [
                    ...incomeGroups.map(
                      (g, i) => `
                        <tr class="${i % 2 === 0 ? 'stripe-a' : 'stripe-b'}">
                          <td class="jenis-cell"><span class="badge badge-in">Masuk</span></td>
                          <td class="parent-cell">${escapeHtml(g.parentName)}</td>
                          <td class="amount-cell amount-in">${formatCurrency(g.total)}</td>
                          <td class="count-cell">${g.count}</td>
                        </tr>
                      `,
                    ),
                    ...expenseGroups.map(
                      (g, i) => `
                        <tr class="${(incomeGroups.length + i) % 2 === 0 ? 'stripe-a' : 'stripe-b'}">
                          <td class="jenis-cell"><span class="badge badge-out">Keluar</span></td>
                          <td class="parent-cell">${escapeHtml(g.parentName)}</td>
                          <td class="amount-cell amount-out">${formatCurrency(g.total)}</td>
                          <td class="count-cell">${g.count}</td>
                        </tr>
                      `,
                    ),
                  ].join('');

                  return `
                    <div class="bank-block">
                      <div class="bank-block-header">
                        <div class="bank-block-name-wrap">
                          ${renderBankBadge(account.accountName, 32)}
                          <span class="bank-block-name">${escapeHtml(account.accountName)}</span>
                        </div>
                        <span class="bank-block-net ${acctReport.netProfit >= 0 ? 'amount-in' : 'amount-out'}">
                          Laba bersih: ${formatCurrency(acctReport.netProfit)}
                        </span>
                      </div>
                      <table class="bank-table">
                        <thead>
                          <tr>
                            <th style="width:14%">Jenis</th>
                            <th>Kategori</th>
                            <th style="text-align:right;width:22%">Jumlah</th>
                            <th style="text-align:center;width:14%">Transaksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${rows || `<tr><td colspan="4" class="empty-cell">Tidak ada transaksi pada periode ini</td></tr>`}
                        </tbody>
                      </table>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `
        : '';

    // Bagian "Lampiran Bukti Transaksi" — daftar transaksi pada periode ini yang
    // punya bukti terlampir, ditampilkan sebagai thumbnail gambar (langsung dari
    // URL Cloudinary yang tersimpan di attachmentUrl). Kalau buktinya berupa PDF,
    // ditampilkan sebagai link "Lihat PDF" saja karena <img> tidak bisa merender PDF.
    const attachmentsSection =
      proofTransactions.length > 0
        ? `
            <div class="section attachments-section">
              <div class="section-heading">
                <span class="section-number">A</span>
                <div>
                  <h2 class="section-title">Lampiran Bukti Transaksi</h2>
                  <div class="section-description">
                    ${escapeHtml(`${proofTransactions.length} transaksi pada periode ini memiliki bukti terlampir`)}
                  </div>
                </div>
              </div>
              <div class="attachments-grid">
                ${proofTransactions
                  .map((tx) => {
                    const isPdf = tx.attachmentUrl.toLowerCase().split('?')[0].endsWith('.pdf');
                    const isIncome = tx.transactionType === 'INCOME';
                    const amountLabel = `${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}`;
                    const amountClass = isIncome ? 'amount-in' : 'amount-out';
                    const badgeClass = isIncome ? 'badge-in' : 'badge-out';
                    const badgeLabel = isIncome ? 'Masuk' : 'Keluar';

                    return `
                      <div class="attachment-card">
                        ${
                          isPdf
                            ? `<a href="${escapeHtml(tx.attachmentUrl)}" target="_blank" rel="noopener noreferrer" class="attachment-pdf-link">Lihat Berkas PDF</a>`
                            : `<img src="${escapeHtml(tx.attachmentUrl)}" class="attachment-thumb" />`
                        }
                        <div class="attachment-meta">
                          <div class="attachment-top-row">
                            <span class="attachment-date">${escapeHtml(formatDateID(tx.date))}</span>
                            <span class="badge ${badgeClass}">${badgeLabel}</span>
                          </div>
                          <div class="attachment-category">${escapeHtml(tx.categoryName)}</div>
                          ${
                            tx.accountName
                              ? `<div class="attachment-account">${renderBankBadge(tx.accountName, 18)}<span>${escapeHtml(tx.accountName)}</span></div>`
                              : ''
                          }
                          <div class="attachment-amount ${amountClass}">${amountLabel}</div>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
            </div>
          `
        : '';

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(t('reports.title'))}</title>
          <style>
            :root {
              --ink: #111827;
              --muted: #6b7280;
              --muted-light: #9ca3af;
              --border: #e5e7eb;
              --border-strong: #d1d5db;
              --surface: #f9fafb;
              --stripe: #f6f7f9;
              --accent: #a0522d;
              --navy: #1f2937;
              --income: #047857;
              --income-bg: #ecfdf5;
              --expense: #be123c;
              --expense-bg: #fff1f2;
              --profit: #b45309;
              --profit-bg: #fffbeb;
            }
            * { box-sizing: border-box; }
            @page { size: A4; margin: 16mm 14mm 18mm; }
            body {
              font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
              color: var(--ink);
              background: #ffffff;
              margin: 0;
              font-size: 11.5px;
              line-height: 1.5;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report { width: 100%; }

            /* ---------- Letterhead ---------- */
            .letterhead { margin-bottom: 14px; }
            .letterhead-top { display: flex; align-items: center; gap: 16px; }
            .letterhead .header-logo { height: 54px; width: auto; max-width: 88px; object-fit: contain; flex-shrink: 0; }
            .letterhead-titles { min-width: 0; }
            .company-name { margin: 0; font-size: 19px; line-height: 1.2; font-weight: 800; color: var(--ink); letter-spacing: 0.03em; text-transform: uppercase; }
            .company-tagline { margin-top: 2px; font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.04em; }
            .company-address { margin-top: 3px; font-size: 9.5px; color: var(--muted); }
            .letterhead-divider { margin-top: 12px; height: 4px; border-radius: 3px; background: linear-gradient(to right, var(--navy) 0%, var(--navy) 60%, var(--accent) 60%, var(--accent) 100%); }

            /* ---------- Report header ---------- */
            .header { margin-bottom: 22px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
            .header-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
            .title { margin: 0; font-size: 21px; line-height: 1.25; font-weight: 800; color: var(--ink); }
            .subtitle { margin-top: 3px; color: var(--muted); font-size: 11px; }
            .header-badge { flex-shrink: 0; padding: 5px 12px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border); font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

            .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
            .meta-box { padding: 9px 12px; border: 1px solid var(--border); border-left: 3px solid var(--navy); border-radius: 6px; background: var(--surface); box-shadow: 0 1px 2px rgba(17,24,39,0.04); }
            .meta-label { display: block; font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
            .meta-value { font-size: 12px; font-weight: 700; color: var(--ink); }

            /* ---------- Summary cards ---------- */
            .summary { margin-bottom: 26px; }
            .summary-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
            .summary-title { margin: 0; font-size: 13px; font-weight: 800; color: var(--ink); text-transform: uppercase; letter-spacing: 0.04em; }
            .summary-title-line { flex: 1; height: 1px; background: var(--border); }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
            .summary-card { position: relative; padding: 14px 15px; border-radius: 10px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 1px 3px rgba(17,24,39,0.05); }
            .summary-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
            .summary-card.income { background: var(--income-bg); }
            .summary-card.income::before { background: var(--income); }
            .summary-card.expense { background: var(--expense-bg); }
            .summary-card.expense::before { background: var(--expense); }
            .summary-card.profit { background: var(--profit-bg); }
            .summary-card.profit::before { background: var(--profit); }
            .summary-card-top { display: flex; align-items: center; gap: 7px; margin-bottom: 3px; }
            .summary-icon {
              display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
              width: 19px; height: 19px; border-radius: 6px; font-size: 8.5px; font-weight: 800;
            }
            .summary-icon-income { background: rgba(4,120,87,0.12); color: var(--income); }
            .summary-icon-expense { background: rgba(190,18,60,0.12); color: var(--expense); }
            .summary-icon-profit { background: rgba(180,83,9,0.12); color: var(--profit); }
            .summary-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
            .summary-card.income .summary-label { color: var(--income); }
            .summary-card.expense .summary-label { color: var(--expense); }
            .summary-card.profit .summary-label { color: var(--profit); }
            .summary-value { margin-top: 6px; font-size: 17px; font-weight: 800; color: var(--ink); font-family: 'Courier New', monospace; letter-spacing: -0.01em; }

            /* ---------- Flow bar (proporsi pemasukan vs pengeluaran) ---------- */
            .flow-bar-wrap { margin-top: 14px; }
            .flow-bar { display: flex; height: 9px; border-radius: 999px; overflow: hidden; background: var(--border); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.03); }
            .flow-bar-income { background: var(--income); }
            .flow-bar-expense { background: var(--expense); }
            .flow-bar-labels { display: flex; justify-content: space-between; margin-top: 6px; font-size: 9.5px; font-weight: 700; }
            .flow-label-income { color: var(--income); }
            .flow-label-expense { color: var(--expense); }

            /* ---------- Sections ---------- */
            .section { margin-bottom: 28px; page-break-inside: avoid; }
            .section-heading { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
            .section-number {
              flex-shrink: 0; display: flex; align-items: center; justify-content: center;
              width: 24px; height: 24px; border-radius: 7px; background: var(--navy); color: #fff;
              font-size: 10px; font-weight: 800; margin-top: 1px; box-shadow: 0 1px 2px rgba(0,0,0,0.15);
            }
            .section-number-income { background: var(--income); }
            .section-number-expense { background: var(--expense); }
            .section-title { margin: 0; font-size: 14.5px; font-weight: 800; color: var(--ink); }
            .section-description { margin-top: 2px; color: var(--muted); font-size: 10.5px; }

            /* ---------- Tables ---------- */
            table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid var(--border-strong); border-radius: 8px; overflow: hidden; }
            thead { display: table-header-group; }
            th {
              padding: 9px 10px; text-align: left; font-size: 9.5px; font-weight: 800; color: #fff;
              background: var(--navy); text-transform: uppercase; letter-spacing: 0.03em;
            }
            td { padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
            tr.stripe-b td { background: var(--stripe); }
            .parent-row td { font-weight: 700; }
            .child-row td { color: #4b5563; }
            .parent-cell { width: 30%; }
            .subcategory-cell { width: 35%; }
            .amount-cell { width: 22%; text-align: right; white-space: nowrap; font-family: 'Courier New', monospace; font-weight: 700; }
            .count-cell { width: 13%; text-align: center; color: var(--muted); }
            .tree-line { display: inline-block; width: 16px; color: var(--muted-light); font-weight: 700; }
            .amount-in { color: var(--income); }
            .amount-out { color: var(--expense); }
            .amount-net { color: var(--profit); }
            .acct-name { width: 40%; font-weight: 700; }
            .acct-name-inner { display: flex; align-items: center; gap: 10px; }
            .acct-amount { width: 20%; text-align: right; white-space: nowrap; font-family: 'Courier New', monospace; font-weight: 700; }
            .empty-cell { text-align: center; color: var(--muted-light); font-style: italic; padding: 12px; }

            .total-row td { background: var(--surface) !important; border-top: 2px solid var(--border-strong); border-bottom: none; font-weight: 800; }

            /* ---------- Bank logos ---------- */
            .bank-logo-wrap { position: relative; flex-shrink: 0; }
            .bank-logo {
              object-fit: contain; flex-shrink: 0; border-radius: 7px; background: #fff;
              box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06);
              padding: 4px;
            }
            .bank-logo-fallback {
              display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
              border-radius: 50%; background: #e5e7eb; color: #374151; font-weight: 800;
            }

            /* ---------- Bank detail blocks ---------- */
            .bank-block { margin-bottom: 16px; page-break-inside: avoid; border-radius: 7px; box-shadow: 0 1px 3px rgba(17,24,39,0.06); }
            .bank-block:last-child { margin-bottom: 0; }
            .bank-block-header {
              display: flex; align-items: center; justify-content: space-between; gap: 10px;
              padding: 7px 12px; background: var(--ink); border-radius: 7px 7px 0 0; color: #fff;
            }
            .bank-block-name-wrap { display: flex; align-items: center; gap: 8px; min-width: 0; }
            .bank-block-name { font-size: 11px; font-weight: 700; }
            .bank-block-net { font-size: 10px; font-weight: 700; font-family: 'Courier New', monospace; flex-shrink: 0; }
            .bank-block-net.amount-in { color: #6ee7b7; }
            .bank-block-net.amount-out { color: #fda4af; }
            .bank-table { border-radius: 0 0 7px 7px; border-top: none; }
            .bank-table th { background: #374151; }
            .jenis-cell { text-align: center; }

            .badge {
              display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 9px; font-weight: 800;
              text-transform: uppercase; letter-spacing: 0.03em;
            }
            .badge-in { background: var(--income-bg); color: var(--income); }
            .badge-out { background: var(--expense-bg); color: var(--expense); }

            /* ---------- Attachments ---------- */
            .attachments-section { page-break-before: always; }
            .attachments-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 4px; }
            .attachment-card { border: 1px solid var(--border); border-radius: 9px; overflow: hidden; page-break-inside: avoid; background: #fff; box-shadow: 0 1px 3px rgba(17,24,39,0.05); }
            .attachment-thumb { width: 100%; height: 118px; object-fit: cover; display: block; background: var(--surface); }
            .attachment-pdf-link {
              display: flex; align-items: center; justify-content: center; height: 118px;
              background: var(--surface); color: #2563eb; text-decoration: none; font-size: 10.5px; font-weight: 700;
            }
            .attachment-meta { padding: 8px 10px; font-size: 9.5px; }
            .attachment-top-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
            .attachment-date { font-weight: 700; color: var(--ink); }
            .attachment-category { margin-top: 4px; color: var(--muted); }
            .attachment-account { margin-top: 2px; color: var(--muted-light); display: flex; align-items: center; gap: 5px; }
            .attachment-amount { margin-top: 5px; font-family: 'Courier New', monospace; font-weight: 800; font-size: 11px; }

            /* ---------- Footer ---------- */
            .footer {
              margin-top: 32px; padding-top: 12px; border-top: 1px solid var(--border);
              display: flex; align-items: center; justify-content: space-between;
              color: var(--muted-light); font-size: 9.5px;
            }
            .footer-brand { font-weight: 700; color: var(--muted); }

            .no-print { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); text-align: center; }
            .print-button {
              padding: 11px 22px; border: 0; border-radius: 8px; background: var(--navy); color: white;
              cursor: pointer; font-size: 13px; font-weight: 700; box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            }
            .print-button:hover { background: #111827; }

            @media print {
              .no-print { display: none; }
              .section { page-break-inside: avoid; }
              .parent-row, .child-row { page-break-inside: avoid; }
              .bank-block { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="report">
            <div class="header">
              <div class="letterhead">
                <div class="letterhead-top">
                  <img src="${LOGO_SRC}" alt="PT. Artha Karya Property" class="header-logo" onerror="this.style.display='none'" />
                  <div class="letterhead-titles">
                    <h1 class="company-name">PT. Artha Karya Property</h1>
                    <div class="company-tagline">Hadirkan Hunian Idaman</div>
                    <div class="company-address">Jl. Anggrek, SP 1, Klamalu — Kabupaten Sorong, Provinsi Papua Barat Daya</div>
                  </div>
                </div>
                <div class="letterhead-divider"></div>
              </div>

              <div class="header-top">
                <div>
                  <h1 class="title">${escapeHtml(t('reports.title'))}</h1>
                  <div class="subtitle">${escapeHtml(t('reports.subtitle'))}</div>
                </div>
                <span class="header-badge">Dokumen Internal</span>
              </div>

              <div class="meta">
                <div class="meta-box">
                  <span class="meta-label">${escapeHtml(t('reports.period'))}</span>
                  <span class="meta-value">${escapeHtml(exportPeriodLabel)}</span>
                </div>
                <div class="meta-box">
                  <span class="meta-label">Akun</span>
                  <span class="meta-value">${escapeHtml(selectedAccountLabel)}</span>
                </div>
                <div class="meta-box">
                  <span class="meta-label">${escapeHtml(t('reports.generatedOn'))}</span>
                  <span class="meta-value">${escapeHtml(formatDateTimeID(new Date()))}</span>
                </div>
              </div>
            </div>

            <div class="summary">
              <div class="summary-title-row">
                <p class="summary-title">Ringkasan Laba Rugi</p>
                <div class="summary-title-line"></div>
              </div>
              <div class="summary-grid">
                <div class="summary-card income">
                  <div class="summary-card-top">
                    <span class="summary-icon summary-icon-income">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                    </span>
                    <span class="summary-label">${escapeHtml(t('reports.totalIncome'))}</span>
                  </div>
                  <div class="summary-value">${formatCurrency(report?.totalIncome ?? 0)}</div>
                </div>
                <div class="summary-card expense">
                  <div class="summary-card-top">
                    <span class="summary-icon summary-icon-expense">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10"/><path d="M17 7v10H7"/></svg>
                    </span>
                    <span class="summary-label">${escapeHtml(t('reports.totalExpenses'))}</span>
                  </div>
                  <div class="summary-value">${formatCurrency(report?.totalExpenses ?? 0)}</div>
                </div>
                <div class="summary-card profit">
                  <div class="summary-card-top">
                    <span class="summary-icon summary-icon-profit">Rp</span>
                    <span class="summary-label">${escapeHtml(t('reports.netProfit'))}</span>
                  </div>
                  <div class="summary-value">${formatCurrency(report?.netProfit ?? 0)}</div>
                </div>
              </div>

              ${(() => {
                const totalIncome = report?.totalIncome ?? 0;
                const totalExpenses = report?.totalExpenses ?? 0;
                const flowTotal = totalIncome + totalExpenses;
                const incomePct = flowTotal > 0 ? (totalIncome / flowTotal) * 100 : 50;
                const expensePct = 100 - incomePct;
                return `
                  <div class="flow-bar-wrap">
                    <div class="flow-bar">
                      <div class="flow-bar-income" style="width:${incomePct}%"></div>
                      <div class="flow-bar-expense" style="width:${expensePct}%"></div>
                    </div>
                    <div class="flow-bar-labels">
                      <span class="flow-label-income">Pemasukan &middot; ${incomePct.toFixed(0)}%</span>
                      <span class="flow-label-expense">Pengeluaran &middot; ${expensePct.toFixed(0)}%</span>
                    </div>
                  </div>
                `;
              })()}
            </div>

            ${perAccountSection}

            ${perAccountDetailSection}

            <div class="section">
              <div class="section-heading">
                <span class="section-number section-number-income">${perAccount && perAccount.length > 0 ? '04' : '02'}</span>
                <div>
                  <h2 class="section-title">${escapeHtml(t('reports.incomeBreakdown'))}</h2>
                  <div class="section-description">${escapeHtml(t('reports.revenueByCategory'))}</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width:30%">Kategori Utama</th>
                    <th style="width:35%">Subkategori</th>
                    <th style="text-align:right;width:22%">${escapeHtml(t('reports.amount'))}</th>
                    <th style="text-align:center;width:13%">${escapeHtml(t('reports.transactions'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${incomeRows || `<tr><td colspan="4" class="empty-cell">${escapeHtml(t('reports.noIncomeInPeriod'))}</td></tr>`}
                  <tr class="total-row">
                    <td colspan="2">${escapeHtml(t('reports.totalIncome'))}</td>
                    <td class="amount-cell amount-in">${formatCurrency(report?.totalIncome ?? 0)}</td>
                    <td class="count-cell">${incomeTransactionCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-heading">
                <span class="section-number section-number-expense">${perAccount && perAccount.length > 0 ? '05' : '03'}</span>
                <div>
                  <h2 class="section-title">${escapeHtml(t('reports.expenseBreakdown'))}</h2>
                  <div class="section-description">${escapeHtml(t('reports.costsByCategory'))}</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width:30%">Kategori Utama</th>
                    <th style="width:35%">Subkategori</th>
                    <th style="text-align:right;width:22%">${escapeHtml(t('reports.amount'))}</th>
                    <th style="text-align:center;width:13%">${escapeHtml(t('reports.transactions'))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenseRows || `<tr><td colspan="4" class="empty-cell">${escapeHtml(t('reports.noExpensesInPeriod'))}</td></tr>`}
                  <tr class="total-row">
                    <td colspan="2">${escapeHtml(t('reports.totalExpenses'))}</td>
                    <td class="amount-cell amount-out">${formatCurrency(report?.totalExpenses ?? 0)}</td>
                    <td class="count-cell">${expenseTransactionCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            ${attachmentsSection}

            <div class="footer">
              <span class="footer-brand">PT. Artha Karya Property</span>
              <span>${escapeHtml(t('reports.generatedOn'))} ${escapeHtml(formatDateTimeID(new Date()))}</span>
            </div>

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

      {/* Filter periode & akun — pintasan cepat + kalender, rapi di mobile & desktop */}
      <Card className={cn('mb-5 border-border/60 sm:mb-6', GLASS_CARD)}>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
              <CalendarIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            {t('reports.period')}
            <span className="truncate rounded-full bg-secondary px-2.5 py-1 text-xs font-normal text-foreground">
              {formatRangeLabel(rangeStart, rangeEnd, t('reports.allTime'))}
            </span>

            {/* Filter Akun — hanya tampil kalau ada daftar akun */}
            {accounts.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                {selectedAccountId ? (
                  <AccountAvatar
                    accountName={selectedAccountLabel}
                    boxClassName="h-7 w-7"
                    iconClassName="h-3.5 w-3.5"
                    iconBg="bg-violet-50 dark:bg-violet-950/40"
                    iconText="text-violet-600 dark:text-violet-400"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
                    <Wallet className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                )}
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="Filter akun"
                >
                  <option value="">Semua Akun</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName}
                    </option>
                  ))}
                </select>
              </div>
            )}
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

                <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
                  {selectedAccountId ? (
                    <AccountAvatar
                      accountName={selectedAccountLabel}
                      boxClassName="h-8 w-8"
                      iconClassName="h-4 w-4"
                      iconBg="bg-sky-100 dark:bg-sky-950/40"
                      iconText="text-sky-600 dark:text-sky-400"
                    />
                  ) : (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-950/40">
                      <Wallet className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Akun</p>
                    <p className="truncate text-sm font-semibold">{selectedAccountLabel}</p>
                  </div>
                </div>
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

          {/* Rincian per Bank — hanya muncul saat filter "Semua Akun" dan ada akun
              dengan aktivitas pada periode ini, supaya kelihatan transaksi mana
              datang/keluar dari bank yang mana. */}
          {shouldFetchPerAccount && (perAccountLoading || perAccountReports.length > 0) && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Rincian per Bank</p>
              </div>
              {perAccountLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-48 rounded-xl" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {perAccountReports.map(({ account, report: acctReport }) => (
                    <BankDetailCard key={account.id} account={account} report={acctReport} />
                  ))}
                </div>
              )}
            </div>
          )}

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