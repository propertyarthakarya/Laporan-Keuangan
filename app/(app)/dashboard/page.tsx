'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { DashboardSummary, ChartDataPoint } from '@/lib/types';
import { cn } from '@/lib/utils';

type Range = 'daily' | 'weekly' | 'monthly';

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

  const cards = [
    {
      label: t('dashboard.totalIncome'),
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      trend: 'up' as const,
    },
    {
      label: t('dashboard.totalExpenses'),
      value: summary?.totalExpenses ?? 0,
      icon: TrendingDown,
      trend: 'down' as const,
    },
    {
      label: t('dashboard.cashBalance'),
      value: summary?.cashBalance ?? 0,
      icon: Wallet,
      trend: null,
    },
    {
      label: t('dashboard.profitLoss'),
      value: summary?.profitLoss ?? 0,
      icon: DollarSign,
      trend: (summary?.profitLoss ?? 0) >= 0 ? ('up' as const) : ('down' as const),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title={`${t('dashboard.welcome')}, ${user?.name?.split(' ')[0]}`}
        description={t('dashboard.subtitle')}
      >
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          {t('common.refresh')}
        </Button>
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
              const isDown = card.trend === 'down';
              return (
                <Card key={i} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <CardContent className="p-3.5 sm:p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary sm:h-10 sm:w-10">
                        <Icon
                          className={cn(
                            'h-4 w-4 sm:h-5 sm:w-5',
                            isUp && 'text-green-600 dark:text-green-400',
                            isDown && 'text-red-600 dark:text-red-400',
                            !card.trend && 'text-foreground',
                          )}
                        />
                      </div>
                      {card.trend && (
                        <div
                          className={cn(
                            'flex items-center gap-1 text-xs font-medium',
                            isUp && 'text-green-600 dark:text-green-400',
                            isDown && 'text-red-600 dark:text-red-400',
                          )}
                        >
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
                    <p className="mt-1 truncate text-lg font-bold tracking-tight sm:text-2xl">
                      {formatCurrency(card.value)}
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
              <CardTitle>{t('dashboard.transactionOverview')}</CardTitle>
              <CardDescription>{t('dashboard.transactionOverviewSubtitle')}</CardDescription>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1 sm:inline-flex sm:w-auto">
              {(['daily', 'weekly', 'monthly'] as Range[]).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === r ? 'default' : 'ghost'}
                  onClick={() => setRange(r)}
                  className="text-xs capitalize px-2 sm:px-3"
                >
                  {t(`dashboard.${r}`)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
          {chartLoading ? (
            <Skeleton className="h-[260px] w-full sm:h-[320px]" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-center text-sm text-muted-foreground sm:h-[320px]">
              {t('dashboard.noTransactionData')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260} className="sm:!h-[320px]">
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
               <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                  width={64}
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
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name={t('dashboard.income')}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name={t('dashboard.expenses')}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  fill="url(#expenseGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}