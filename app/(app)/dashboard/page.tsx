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
import type { DashboardSummary, ChartDataPoint } from '@/lib/types';
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
const ACCENT_STYLES: Record<
  Accent,
  { iconBg: string; iconText: string; hoverRing: string }
> = {
  emerald: {
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    hoverRing: 'hover:border-emerald-500/30 hover:shadow-emerald-500/10',
  },
  rose: {
    iconBg: 'bg-rose-500/10 dark:bg-rose-400/10',
    iconText: 'text-rose-600 dark:text-rose-400',
    hoverRing: 'hover:border-rose-500/30 hover:shadow-rose-500/10',
  },
  indigo: {
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-400/10',
    iconText: 'text-indigo-600 dark:text-indigo-400',
    hoverRing: 'hover:border-indigo-500/30 hover:shadow-indigo-500/10',
  },
  amber: {
    iconBg: 'bg-amber-500/10 dark:bg-amber-400/10',
    iconText: 'text-amber-600 dark:text-amber-400',
    hoverRing: 'hover:border-amber-500/30 hover:shadow-amber-500/10',
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

// Titik hijau berkedip yang menandakan data di halaman ini nyala terus (auto-refresh
// tiap 10 detik), bukan cuma dekorasi — supaya orang nggak salah kira angkanya statis.
function LiveIndicator() {
  return (
    <div
      className="flex items-center gap-1.5"
      title="Data diperbarui otomatis setiap 10 detik"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-xs font-medium text-muted-foreground">Live</span>
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
    refetch: refetchCharts,
  } = useQuery<ChartDataPoint[]>({
    queryKey: ['dashboard-charts', range],
    queryFn: () => getDashboardCharts(range),
    refetchInterval: 10000,
  });

  function handleRefresh() {
    refetchSummary();
    refetchCharts();
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
      color: '#93c5fd',
    },
  } satisfies ChartConfig;

  // Biar label tanggal di sumbu-X nggak numpuk jadi cuma 3 titik (awal/tengah/akhir),
  // tapi juga nggak kepadetan kalau datanya banyak — target ~6 label yang kebagi rata.
  const xAxisInterval =
    chartData.length > 7 ? Math.ceil(chartData.length / 6) - 1 : 0;

  const ranges: Range[] = ['daily', 'weekly', 'monthly'];
  const activeRangeIndex = ranges.indexOf(range);

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title={`${t('dashboard.welcome')}, ${user?.name?.split(' ')[0]}`}
        description={t('dashboard.subtitle')}
      >
        <div className="flex items-center gap-3">
          <LiveIndicator />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="w-full sm:w-auto">
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
        </div>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3.5 sm:p-5">
                  <Skeleton className="h-4 w-20 sm:w-24" />
                  <Skeleton className="mt-3 h-7 w-24 sm:h-8 sm:w-32" />
                  <Skeleton className="mt-3 h-3 w-16" />
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
                    style.hoverRing,
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
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
                    <p className="mt-3 truncate text-xs font-medium text-muted-foreground sm:mt-4 sm:text-sm">
                      {card.label}
                    </p>
                    <p className="mt-1 truncate font-mono text-lg font-bold tabular-nums tracking-tight sm:text-2xl">
                      <AnimatedCurrency value={card.value} />
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Chart */}
      <Card className="mt-4 sm:mt-6">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <CardTitle>{t('dashboard.transactionOverview')}</CardTitle>
                <LiveIndicator />
              </div>
              <CardDescription>{t('dashboard.transactionOverviewSubtitle')}</CardDescription>
            </div>
            {/* Pill-style range toggle dengan indikator yang geser mulus antar pilihan */}
            <div className="relative grid grid-cols-3 gap-1 rounded-full bg-gray-100 p-1 dark:bg-secondary">
              <div
                className="absolute inset-y-1 rounded-full bg-black shadow-sm transition-transform duration-300 ease-out dark:bg-white"
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

                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />

                {/* Sumbu-X: paksa jarak antar label biar nggak cuma nongol awal/akhir */}
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={xAxisInterval}
                  tick={{ fontSize: 11 }}
                  padding={{ left: 8, right: 8 }}
                />

                {/* Sumbu-Y kiri khusus Pemasukan */}
                <YAxis
                  yAxisId="income"
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tick={{ fontSize: 11, fill: 'var(--color-income)' }}
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
                  tick={{ fontSize: 11, fill: 'var(--color-expense)' }}
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                />

                <ChartTooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{name}</span>
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {formatCurrency(Number(value))}
                          </span>
                        </div>
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
                  strokeWidth={2.5}
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