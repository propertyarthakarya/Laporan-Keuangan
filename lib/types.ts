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
  parentId: string | null;
  createdAt?: string;
  children?: Category[];
}

export interface Transaction {
  id: string;
  date: string;
  categoryId: string;
  category: {
  id: string;
  categoryName: string;
  type: TransactionType;
  parentId: string | null;
  parent?: {
    id: string;
    categoryName: string;
    type: TransactionType;
  } | null;
};
  description: string | null;
  amount: number;
  transactionType: TransactionType;
  uniqueCode: string | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface DashboardCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  directTotal: number;
  directCount: number;
  children: {
    categoryId: string;
    categoryName: string;
    total: number;
    count: number;
  }[];
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  cashBalance: number;
  profitLoss: number;
  transactionCount: number;
  incomeBreakdown: DashboardCategoryBreakdown[];
  expenseBreakdown: DashboardCategoryBreakdown[];
}

export interface ChartCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  parentId: string | null;
  parentName: string | null;
}

export interface ChartDataPoint {
  label: string;
  income: number;
  expense: number;
  incomeCategories: ChartCategoryBreakdown[];
  expenseCategories: ChartCategoryBreakdown[];
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
  parentId: string | null;
  parentName: string | null;
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

export type LoginStatus = 'SUCCESS' | 'FAILED';

export interface LoginActivityEntry {
  id: string;
  emailAttempted: string;
  userId: string | null;
  userName: string | null;
  status: LoginStatus;
  ipAddress: string;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  country: string | null;
  isNewDevice: boolean;
  isNewLocation: boolean;
  failedAttemptsBeforeSuccess: number;
  createdAt: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  STAFF: 'Finance Staff',
  MANAGEMENT: 'Management',
};

export const ROLE_BADGE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-foreground text-background',
  STAFF: 'border border-border bg-background text-foreground',
  MANAGEMENT: 'bg-secondary text-secondary-foreground',
};