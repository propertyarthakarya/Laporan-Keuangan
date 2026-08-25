'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role, TransactionType, Category, Transaction, DashboardSummary, ChartDataPoint, ProfitLossReport, ActivityLogEntry } from './types';
import { mockDb } from './mock-db';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;

  // Data access
  getCategories: () => Promise<Category[]>;
  createCategory: (data: { categoryName: string; type: TransactionType }) => Promise<Category>;
  updateCategory: (id: string, data: { categoryName: string; type: TransactionType }) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;

  getTransactions: (filters?: { startDate?: string; endDate?: string; categoryId?: string; transactionType?: TransactionType }) => Promise<Transaction[]>;
  createTransaction: (data: { date: string; categoryId: string; description?: string | null; amount: number; transactionType: TransactionType }) => Promise<Transaction>;
  updateTransaction: (id: string, data: { date: string; categoryId: string; description?: string | null; amount: number; transactionType: TransactionType }) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;

  getDashboardSummary: () => Promise<DashboardSummary>;
  getDashboardCharts: (range: 'daily' | 'weekly' | 'monthly') => Promise<ChartDataPoint[]>;

  getProfitLoss: (filters?: { startDate?: string; endDate?: string }) => Promise<ProfitLossReport>;

  getUsers: () => Promise<(User & { transactionCount: number })[]>;
  createUser: (data: { name: string; email: string; password: string; role: Role }) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  getActivityLog: (limit?: number) => Promise<ActivityLogEntry[]>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'fintrack_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const u = await mockDb.login(email, password);
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    return u;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    router.push('/login');
  }, [router]);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    getCategories: mockDb.getCategories,
    createCategory: mockDb.createCategory,
    updateCategory: mockDb.updateCategory,
    deleteCategory: mockDb.deleteCategory,
    getTransactions: mockDb.getTransactions,
    createTransaction: (data) => mockDb.createTransaction(data, user!.id),
    updateTransaction: mockDb.updateTransaction,
    deleteTransaction: mockDb.deleteTransaction,
    getDashboardSummary: mockDb.getDashboardSummary,
    getDashboardCharts: mockDb.getDashboardCharts,
    getProfitLoss: mockDb.getProfitLoss,
    getUsers: mockDb.getUsers,
    createUser: mockDb.createUser,
    deleteUser: mockDb.deleteUser,
    getActivityLog: mockDb.getActivityLog,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
