export type Role = 'ADMIN' | 'STAFF' | 'MANAGEMENT';
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
  transactionCount?: number;
}

export interface Category {
  id: string;
  categoryName: string;
  type: TransactionType;
  createdAt?: string;
}

export interface Transaction {
  id: string;
  date: string;
  categoryId: string;
  category: {
    id: string;
    categoryName: string;
    type: TransactionType;
  };
  description: string | null;
  amount: number;
  transactionType: TransactionType;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  cashBalance: number;
  profitLoss: number;
  transactionCount: number;
}

export interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
}

export interface ProfitLossReport {
  period: { startDate: string | null; endDate: string | null };
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeBreakdown: CategoryBreakdown[];
  expenseBreakdown: CategoryBreakdown[];
  transactionCount: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
}

export interface ActivityLogEntry {
  transactionId: string;
  date: string;
  categoryName: string;
  description: string | null;
  amount: number;
  transactionType: TransactionType;
  enteredBy: string;
  enteredByEmail: string;
  enteredAt: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  STAFF: 'Finance Staff',
  MANAGEMENT: 'Management',
};

export const ROLE_BADGE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  STAFF: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MANAGEMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};
