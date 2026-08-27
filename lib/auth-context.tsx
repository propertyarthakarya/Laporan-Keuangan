'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role, TransactionType, Category, Transaction, DashboardSummary, ChartDataPoint, ProfitLossReport, ActivityLogEntry, LoginActivityEntry } from './types';
import { apiClient } from './api-client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;

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
  getLoginActivity: (limit?: number) => Promise<LoginActivityEntry[]>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Batas maksimal nunggu cek sesi awal. Kalau backend hang / tidak respon
// sama sekali (bukan error/reject biasa), loading tetap dipaksa selesai
// setelah durasi ini supaya UI tidak stuck selamanya di spinner.
const AUTH_CHECK_TIMEOUT_MS = 8000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let finished = false;

    // Timeout guard: kalau apiClient.me() tidak pernah selesai (hang),
    // paksa loading jadi false setelah AUTH_CHECK_TIMEOUT_MS supaya
    // halaman tidak stuck di spinner selamanya. User dianggap belum
    // login (aman, akan diarahkan ke /login).
    const timeoutId = setTimeout(() => {
      if (!finished) {
        finished = true;
        setUser(null);
        setLoading(false);
      }
    }, AUTH_CHECK_TIMEOUT_MS);

    // Cek sesi aktif lewat cookie httpOnly (bukan localStorage)
    apiClient
      .me()
      .then((u) => {
        if (finished) return; // sudah keburu timeout, abaikan hasil telat
        finished = true;
        clearTimeout(timeoutId);
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        setUser(null);
        setLoading(false);
      });

    return () => {
      finished = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const u = await apiClient.login(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    apiClient.logout().finally(() => {
      setUser(null);
      router.push('/login');
    });
  }, [router]);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    getCategories: apiClient.getCategories,
    createCategory: apiClient.createCategory,
    updateCategory: apiClient.updateCategory,
    deleteCategory: apiClient.deleteCategory,
    getTransactions: apiClient.getTransactions,
    createTransaction: apiClient.createTransaction,
    updateTransaction: apiClient.updateTransaction,
    deleteTransaction: apiClient.deleteTransaction,
    getDashboardSummary: apiClient.getDashboardSummary,
    getDashboardCharts: apiClient.getDashboardCharts,
    getProfitLoss: apiClient.getProfitLoss,
    getUsers: apiClient.getUsers,
    createUser: apiClient.createUser,
    deleteUser: apiClient.deleteUser,
    getActivityLog: apiClient.getActivityLog,
    getLoginActivity: apiClient.getLoginActivity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}