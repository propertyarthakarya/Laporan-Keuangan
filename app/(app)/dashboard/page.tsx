'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
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
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [range, setRange] = useState<Range>('daily');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      const s = await getDashboardSummary();
      setSummary(s);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [getDashboardSummary]);

  const loadCharts = useCallback(async (r: Range) => {
    setChartLoading(true);
    try {
      const data = await getDashboardCharts(r);
      setChartData(data);
    } catch {
      // ignore
    } finally {
      setChartLoading(false);
    }
  }, [getDashboardCharts]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadCharts(range);
  }, [range, loadCharts]);

  // Poll for fresh data every 10 seconds to simulate real-time updates
  // (in production, this would use websockets or SSE from the Express server)
  useEffect(() => {
    const interval = setInterval(() => {
      loadSummary();
      loadCharts(range);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadSummary, loadCharts, range]);

  function handleRefresh() {
    loadSummary();
    loadCharts(range);
  }

  const cards = [
    {
      label: 'Total Income',
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success/20',
      trend: 'up' as const,
    },
    {
      label: 'Total Expenses',
      value: summary?.totalExpenses ?? 0,
      icon: TrendingDown,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
      border: 'border-destructive/20',
      trend: 'down' as const,
    },
    {
      label: 'Cash Balance',
      value: summary?.cashBalance ?? 0,
      icon: Wallet,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      trend: null,
    },
    {
      label: 'Profit / Loss',
      value: summary?.profitLoss ?? 0,
      icon: DollarSign,
      color: (summary?.profitLoss ?? 0) >= 0 ? 'text-success' : 'text-destructive',
      bg: (summary?.profitLoss ?? 0) >= 0 ? 'bg-success/10' : 'bg-destructive/10',
      border: (summary?.profitLoss ?? 0) >= 0 ? 'border-success/20' : 'border-destructive/20',
      trend: (summary?.profitLoss ?? 0) >= 0 ? ('up' as const) : ('down' as const),
    },
  ];

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        description="Overview of your company's financial position"
      >
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-8 w-32" />
                  <Skeleton className="mt-3 h-3 w-16" />
                </CardContent>
              </Card>
            ))
          : cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <Card
                  key={i}
                  className={cn('overflow-hidden transition-all hover:shadow-md', card.border)}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', card.bg)}>
                        <Icon className={cn('h-5 w-5', card.color)} />
                      </div>
                      {card.trend && (
                        <div className={cn('flex items-center gap-1 text-xs font-medium', card.color)}>
                          {card.trend === 'up' ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className={cn('mt-1 text-2xl font-bold tracking-tight', card.color)}>
                      {formatCurrency(card.value)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Chart */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Transaction Overview</CardTitle>
              <CardDescription>Income vs expenses over time</CardDescription>
            </div>
            <div className="flex gap-1 rounded-lg bg-secondary p-1">
              {(['daily', 'weekly', 'monthly'] as Range[]).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={range === r ? 'default' : 'ghost'}
                  onClick={() => setRange(r)}
                  className="text-xs capitalize"
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              No transaction data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
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
                <Legend
                  wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expenses"
                  stroke="hsl(var(--destructive))"
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
