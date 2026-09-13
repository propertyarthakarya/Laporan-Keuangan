'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import type {
  DashboardSummary,
  ChartDataPoint,
  ChartCategoryBreakdown,
} from '@/lib/types';
import { cn } from '@/lib/utils';

type Range = 'daily' | 'weekly' | 'monthly';
type Accent = 'emerald' | 'rose' | 'indigo' | 'amber';

// Lucide (dan hampir semua icon library lain) nggak punya glyph resmi untuk simbol Rupiah —
// beda dari "$" yang punya satu karakter universal, "Rp" itu dua huruf, jadi kalau di-render
// pakai <text> font biasa, di ukuran kecil (16–20px) hasilnya tipis & buram.
// Solusinya: digambar sebagai ikon vektor monoline (garis, bukan font), pakai treatment yang
// sama persis kayak ikon lucide lain — stroke 2px, rounded cap/join, currentColor — biar
// tajam di ukuran kecil dan konsisten secara visual sama ikon-ikon di sebelahnya.
function RupiahIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Huruf R */}
      <path d="M3 20V4" />
      <path d="M3 4h5c2.2 0 3.5 1.3 3.5 3.5S10.2 11 8 11H3" />
      <path d="M8 11l5 9" />
      {/* Huruf P */}
      <path d="M15 20V4" />
      <path d="M15 4h4c2 0 3 1.3 3 3.5S21 11 19 11h-4" />
    </svg>
  );
}

// Kartu ringkasan diberi warna sesuai makna finansialnya (bukan sekadar dekorasi):
// hijau = uang masuk, merah = uang keluar, indigo = posisi kas, kuning = hasil akhir.
// Dark mode dibikin senada abu/putih (seperti kaca iOS), bukan glow warna-warni per kartu —
// warna cuma dipakai di ikon kecil, biar tetap informatif tanpa keliatan berlebihan.
const ACCENT_STYLES: Record<
  Accent,
  { iconBg: string; iconText: string }
> = {
  emerald: {
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
  },
  rose: {
    iconBg: 'bg-rose-500/10 dark:bg-rose-400/10',
    iconText: 'text-rose-600 dark:text-rose-400',
  },
  indigo: {
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-400/10',
    iconText: 'text-indigo-600 dark:text-indigo-400',
  },
  amber: {
    iconBg: 'bg-amber-500/10 dark:bg-amber-400/10',
    iconText: 'text-amber-600 dark:text-amber-400',
  },
};

// Animasi "ticker": tiap kali nilai berubah (misalnya karena auto-refresh 10 detik),
// angkanya jalan halus dari nilai lama ke nilai baru, bukan langsung loncat.
// Ini yang bikin dashboard kerasa "hidup" — mirip papan angka di terminal keuangan.
function useCountUp(target: number, duration = 700) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

function AnimatedCurrency({ value }: { value: number }) {
  const display = useCountUp(value);
  return <>{formatCurrency(display)}</>;
}

function DashboardChartTooltip({
  active,
  payload,
  incomeLabel,
  expenseLabel,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: ChartDataPoint;
  }>;
  incomeLabel: string;
  expenseLabel: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point) {
    return null;
  }

  function renderCategories(
    categories: ChartCategoryBreakdown[],
  ) {
    const groups = new Map<
      string,
      {
        parentName: string;
        total: number;
        children: ChartCategoryBreakdown[];
      }
    >();

    for (const category of categories) {
      const groupId =
        category.parentId ?? category.categoryId;

      const parentName =
        category.parentName ??
        category.categoryName;

      const existing = groups.get(groupId);

      if (existing) {
        existing.total += category.total;

        if (category.parentId) {
          existing.children.push(category);
        }
      } else {
        groups.set(groupId, {
          parentName,
          total: category.total,
          children: category.parentId
            ? [category]
            : [],
        });
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => b.total - a.total)
      .map((group) => (
        <div
          key={group.parentName}
          className="space-y-1.5"
        >
          {/* Parent */}
          <div className="flex items-center justify-between gap-4">
            <span className="truncate text-xs font-semibold text-foreground">
              {group.parentName}
            </span>

            <span className="flex-shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
              {formatCurrency(group.total)}
            </span>
          </div>

          {/* Subcategory */}
          {group.children.length > 0 && (
            <div className="ml-3 space-y-1 border-l border-border pl-3">
              {group.children
                .sort((a, b) => b.total - a.total)
                .map((child) => (
                  <div
                    key={child.categoryId}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                      └ {child.categoryName}
                    </span>

                    <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {formatCurrency(child.total)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      ));
  }

  return (
    <div className="min-w-[280px] max-w-[340px] rounded-xl border bg-background p-3 shadow-xl dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] dark:backdrop-blur-xl">
      {/* Tanggal */}
      <p className="mb-3 text-xs font-semibold text-foreground">
        {point.label}
      </p>

      {/* Income */}
      {point.income > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {incomeLabel}
            </span>

            <span className="font-mono text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatCurrency(point.income)}
            </span>
          </div>

          <div className="space-y-2">
            {renderCategories(
              point.incomeCategories,
            )}
          </div>
        </div>
      )}

      {/* Expense */}
      {point.expense > 0 && (
        <div
          className={cn(
            'space-y-2',
            point.income > 0 &&
              'mt-4 border-t border-border pt-4',
          )}
        >
          <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {expenseLabel}
            </span>

            <span className="font-mono text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {formatCurrency(point.expense)}
            </span>
          </div>

          <div className="space-y-2">
            {renderCategories(
              point.expenseCategories,
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// BACKGROUND — Glassmorphism + Noise Texture
// ============================================================================
const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function DashboardBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* 1. Dasar solid — abu sangat muda di light mode (biar beda tipis dari putih card),
             nyaris hitam di dark mode */}
      <div className="absolute inset-0 bg-[#f4f4f6] dark:bg-[#0a0a0c]" />

      {/* 2a. Glow diagonal kiri-atas — pastel biru muda di light mode, putih di dark mode */}
      <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rotate-[-20deg] bg-blue-200/25 blur-[110px] dark:bg-white/[0.10] dark:bg-none" />

      {/* 2b. Glow lembut menyebar di kanan-tengah */}
      <div className="absolute top-1/3 right-[-10%] h-[520px] w-[620px] -translate-y-1/2 rounded-full bg-indigo-200/20 blur-[130px] dark:bg-white/[0.07]" />

      {/* 2c. Glow tengah — dipertahankan dari versi sebelumnya */}
      <div className="absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-black/[0.04] blur-[120px] dark:bg-white/[0.1]" />

      {/* 3. Noise / grain halus — dipakai di KEDUA mode, cuma opacity-nya jauh lebih rendah
             di light mode (0.015) supaya tetap kerasa "kaca" tanpa bikin putihnya kotor */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-multiply dark:opacity-[0.05] dark:mix-blend-overlay"
        style={{ backgroundImage: NOISE_BG, backgroundRepeat: 'repeat' }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { user, getDashboardSummary, getDashboardCharts } = useAuth();
  const { t } = useLanguage();
  const [range, setRange] = useState<Range>('daily');

  // Summary — auto refetch tiap 10 detik, gantiin setInterval manual
  const {
    data: summary,
    isLoading: loading,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 10000,
  });

  // Charts — key-nya include `range`, jadi otomatis refetch tiap ganti tab daily/weekly/monthly
  const {
    data: chartData = [],
    isLoading: chartLoading,
    isFetching: chartFetching,
    refetch: refetchCharts,
  } = useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard-charts', range],
    queryFn: () => getDashboardCharts(range),
    refetchInterval: 10000,
  });

  async function handleRefresh() {
    await Promise.all([
      refetchSummary(),
      refetchCharts(),
    ]);
  }

  const profitPositive = (summary?.profitLoss ?? 0) >= 0;

  const cards: {
    label: string;
    value: number;
    icon: ComponentType<{ className?: string }>;
    trend: 'up' | 'down' | null;
    accent: Accent;
  }[] = [
    {
      label: t('dashboard.totalIncome'),
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      trend: 'up',
      accent: 'emerald',
    },
    {
      label: t('dashboard.totalExpenses'),
      value: summary?.totalExpenses ?? 0,
      icon: TrendingDown,
      trend: 'down',
      accent: 'rose',
    },
    {
      label: t('dashboard.cashBalance'),
      value: summary?.cashBalance ?? 0,
      icon: Wallet,
      trend: null,
      accent: 'indigo',
    },
    {
      label: t('dashboard.profitLoss'),
      value: summary?.profitLoss ?? 0,
      icon: RupiahIcon,
      trend: profitPositive ? 'up' : 'down',
      accent: profitPositive ? 'amber' : 'rose',
    },
  ];

  // Chart config — warna biru senada, income lebih pekat
  const chartConfig = {
    income: {
      label: t('dashboard.income'),
      color: '#3b82f6',
    },
    expense: {
      label: t('dashboard.expenses'),
      color: '#60a5fa',
    },
  } satisfies ChartConfig;

  // Biar label tanggal di sumbu-X nggak numpuk jadi cuma 3 titik (awal/tengah/akhir),
  // tapi juga nggak kepadetan kalau datanya banyak — target ~6 label yang kebagi rata.
  const xAxisInterval =
    chartData.length > 7 ? Math.ceil(chartData.length / 6) - 1 : 0;

  const ranges: Range[] = ['daily', 'weekly', 'monthly'];
  const activeRangeIndex = ranges.indexOf(range);

  const refreshing =
    summaryFetching || chartFetching;

  return (
    <div className="relative isolate p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Ambient background — glassmorphism + noise, lihat komponen DashboardBackground di atas */}
      <DashboardBackground />

      <PageHeader
        title={`${t('dashboard.welcome')}, ${user?.name?.split(' ')[0]}`}
        description={t('dashboard.subtitle')}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full border-white/60 bg-white/50 backdrop-blur-xl hover:bg-white/70 sm:w-auto dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
          >
            <RefreshCw
              className={cn(
                'mr-2 h-4 w-4',
                refreshing && 'animate-spin',
              )}
            />
            {t('common.refresh')}
          </Button>
        </div>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-white/60 bg-white/60 [backdrop-filter:blur(20px)_saturate(150%)] dark:border-white/10 dark:bg-white/[0.05]">
                <CardContent className="p-3.5 sm:p-5">
                  <Skeleton className="h-4 w-20 sm:w-24" />
                  <Skeleton className="mt-4 h-7 w-24 sm:h-8 sm:w-32" />
                  <Skeleton className="mt-4 h-3 w-16" />
                </CardContent>
              </Card>
            ))
          : cards.map((card, i) => {
              const Icon = card.icon;
              const isUp = card.trend === 'up';
              const style = ACCENT_STYLES[card.accent];
              return (
                <Card
                  key={i}
                  className={cn(
                    'group relative animate-fade-in overflow-hidden border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                    'border-white/60 bg-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] [backdrop-filter:blur(20px)_saturate(150%)] hover:border-white/80 hover:bg-white/70',
                    'dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)] dark:hover:border-white/20 dark:hover:bg-white/[0.07]',
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Satu garis highlight tipis di tepi atas — item kaca di kedua mode, warnanya cuma dibalik */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/25" />

                  <CardContent className="p-3.5 sm:p-5">
                    <div className="flex items-start justify-between">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10',
                          style.iconBg,
                        )}
                      >
                        <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', style.iconText)} />
                      </div>
                      {card.trend && (
                        <div className={cn('flex items-center gap-1 text-xs font-medium', style.iconText)}>
                          {isUp ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="mt-4 truncate text-xs font-medium text-muted-foreground sm:mt-4 sm:text-sm">
                      {card.label}
                    </p>
                    <p className="mt-2 truncate font-mono text-lg font-bold tabular-nums tracking-tight sm:text-2xl">
                      <AnimatedCurrency value={card.value} />
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Chart */}
      <Card className="relative mt-4 overflow-hidden border-white/60 bg-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] [backdrop-filter:blur(20px)_saturate(150%)] sm:mt-8 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/25" />
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('dashboard.transactionOverview')}</CardTitle>
              <CardDescription>{t('dashboard.transactionOverviewSubtitle')}</CardDescription>
            </div>
            {/* Pill-style range toggle dengan indikator yang geser mulus antar pilihan */}
            <div className="relative grid grid-cols-3 gap-1 rounded-full border border-white/60 bg-white/40 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-secondary">
              <div
                className="absolute inset-y-1 rounded-full bg-black shadow-sm transition-transform duration-300 ease-out dark:bg-white dark:shadow-[0_0_20px_rgba(255,255,255,0.35)]"
                style={{
                  width: `calc(${100 / ranges.length}% - 0.25rem)`,
                  transform: `translateX(calc(${activeRangeIndex} * (100% + 0.0833rem)))`,
                }}
              />
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    'relative z-10 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors sm:px-4',
                    range === r ? 'text-white dark:text-black' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`dashboard.${r}`)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
          {chartLoading ? (
            <Skeleton className="h-[280px] w-full sm:h-[340px]" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-center text-sm text-muted-foreground sm:h-[340px]">
              {t('dashboard.noTransactionData')}
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full sm:h-[340px]">
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-income)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--color-income)" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-expense)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-expense)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#e5e7eb" className="dark:opacity-20" yAxisId="income" />

                {/* Sumbu-X: paksa jarak antar label biar nggak cuma nongol awal/akhir */}
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={xAxisInterval}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  padding={{ left: 8, right: 8 }}
                />

                {/* Sumbu-Y kiri khusus Pemasukan */}
                <YAxis
                  yAxisId="income"
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                />

                {/* Sumbu-Y kanan khusus Pengeluaran — skalanya beda jauh dari Pemasukan,
                    jadi kalau digabung satu sumbu, garis Pengeluaran bakal keliatan rata/flat.
                    Dengan sumbu terpisah, pergerakannya jadi kebaca. */}
                <YAxis
                  yAxisId="expense"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                />

                <ChartTooltip
                  cursor={{
                    stroke: 'hsl(var(--border))',
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                  content={
                    <DashboardChartTooltip
                      incomeLabel={t(
                        'dashboard.income',
                      )}
                      expenseLabel={t(
                        'dashboard.expenses',
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />

                <Area
                  yAxisId="income"
                  type="monotone"
                  dataKey="income"
                  name={t('dashboard.income')}
                  stroke="var(--color-income)"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                  dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-income)' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--background)', fill: 'var(--color-income)' }}
                  isAnimationActive
                  animationDuration={700}
                  animationEasing="ease-out"
                />
                <Area
                  yAxisId="expense"
                  type="monotone"
                  dataKey="expense"
                  name={t('dashboard.expenses')}
                  stroke="var(--color-expense)"
                  strokeWidth={2}
                  fill="url(#expenseGrad)"
                  dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-expense)' }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--background)', fill: 'var(--color-expense)' }}
                  isAnimationActive
                  animationDuration={700}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}