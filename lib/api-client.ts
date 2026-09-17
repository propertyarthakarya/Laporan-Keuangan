import type {
  User,
  Role,
  TransactionType,
  Category,
  Transaction,
  Account,
  DashboardSummary,
  ChartDataPoint,
  ProfitLossReport,
  ActivityLogEntry,
  LoginActivityEntry,
} from './types';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = 'Something went wrong.';
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as unknown as T);
}

export const apiClient = {
  // Auth
  async login(email: string, password: string): Promise<User> {
    const res = await request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return res.user;
  },

  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
  },

  async me(): Promise<User | null> {
    try {
      const res = await request<{ user: User }>('/auth/me');
      return res.user;
    } catch {
      return null;
    }
  },

  // Setup (bootstrap admin pertama)
  async checkSetupStatus(): Promise<boolean> {
    const res = await request<{ setupComplete: boolean }>('/setup-admin');
    return res.setupComplete;
  },

  async setupAdmin(data: { name: string; email: string; password: string }): Promise<User> {
    const res = await request<{ user: User }>('/setup-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.user;
  },

  // Accounts
  async getAccounts(): Promise<Account[]> {
    const res = await request<{ accounts: Account[] }>('/accounts');
    return res.accounts;
  },

  async createAccount(data: {
    accountName: string;
    initialBalance: number;
  }): Promise<Account> {
    const res = await request<{ account: Account }>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return res.account;
  },

  async updateAccount(
    id: string,
    data: {
      accountName: string;
      initialBalance: number;
    },
  ): Promise<Account> {
    const res = await request<{ account: Account }>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return res.account;
  },

  async updateAccountStatus(
    id: string,
    isActive: boolean,
  ): Promise<Account> {
    const res = await request<{ account: Account }>(
      `/accounts/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      },
    );

    return res.account;
  },

  async deleteAccount(id: string): Promise<void> {
    await request(`/accounts/${id}`, {
      method: 'DELETE',
    });
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await request<{ categories: Category[] }>('/categories');
    return res.categories;
  },

  async createCategory(data: {
    categoryName: string;
    type: TransactionType;
    parentId?: string | null;
  }): Promise<Category> {
    const res = await request<{ category: Category }>('/categories', {
      method: 'POST',
      body: JSON.stringify({
        categoryName: data.categoryName,
        type: data.type,
        parentId: data.parentId ?? null,
      }),
    });

    return res.category;
  },

  async updateCategory(
    id: string,
    data: {
      categoryName: string;
      type: TransactionType;
      parentId?: string | null;
    },
  ): Promise<Category> {
    const res = await request<{ category: Category }>(
      `/categories/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          categoryName: data.categoryName,
          type: data.type,
          parentId: data.parentId ?? null,
        }),
      },
    );

    return res.category;
  },

  async deleteCategory(id: string): Promise<void> {
    await request(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
async uploadTransactionProof(file: File): Promise<{
  url: string;
  publicId: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload/transaction-proof`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    let message = 'Gagal mengupload bukti transaksi.';

    try {
      const body = await res.json();

      if (body?.error) {
        message = body.error;
      } else if (body?.message) {
        message = body.message;
      }
    } catch {
      // Jika response bukan JSON, gunakan pesan default
    }

    throw new Error(message);
  }

  const data = await res.json();

  return {
    url: data.url,
    publicId: data.publicId,
  };
},
async getTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
  transactionType?: TransactionType;
}): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);
  if (filters?.categoryId) params.set('categoryId', filters.categoryId);
  if (filters?.accountId) params.set('accountId', filters.accountId);
  if (filters?.transactionType) params.set('transactionType', filters.transactionType);

  const qs = params.toString();
  const res = await request<{ transactions: Transaction[] }>(
    `/transactions${qs ? `?${qs}` : ''}`,
  );
  return res.transactions;
},

async createTransaction(data: {
  date: string;
  categoryId: string;
  accountId: string;
  description?: string | null;
  amount: number;
  transactionType: TransactionType;
  uniqueCode?: string | null;
  attachmentUrl?: string | null;
}): Promise<Transaction> {
  const res = await request<{ transaction: Transaction }>(
    '/transactions',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );

  return res.transaction;
},

async updateTransaction(
  id: string,
  data: {
    date: string;
    categoryId: string;
    accountId: string;
    description?: string | null;
    amount: number;
    transactionType: TransactionType;
    uniqueCode?: string | null;
    attachmentUrl?: string | null;
  },
): Promise<Transaction> {
  const res = await request<{ transaction: Transaction }>(
    `/transactions/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );

  return res.transaction;
},

async deleteTransaction(id: string): Promise<void> {
  await request(`/transactions/${id}`, {
    method: 'DELETE',
  });
},

  // Dashboard (sudah dikonfirmasi dari dashboard.ts)
  async getDashboardSummary(): Promise<DashboardSummary> {
    return request<DashboardSummary>('/dashboard/summary');
  },

  async getDashboardCharts(range: 'daily' | 'weekly' | 'monthly'): Promise<ChartDataPoint[]> {
    const res = await request<{ data: ChartDataPoint[] }>(`/dashboard/charts?range=${range}`);
    return res.data;
  },

  // Reports
  async getProfitLoss(filters?: { startDate?: string; endDate?: string; accountId?: string }): Promise<ProfitLossReport> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.accountId) params.set('accountId', filters.accountId);
    const qs = params.toString();
    return request<ProfitLossReport>(`/reports/profit-loss${qs ? `?${qs}` : ''}`);
  },

  // Users (sudah dikonfirmasi dari users.ts)
  async getUsers(): Promise<(User & { transactionCount: number })[]> {
    const res = await request<{ users: any[] }>('/users');
    return res.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      transactionCount: u._count?.transactions ?? 0,
    }));
  },

  async createUser(data: { name: string; email: string; password: string; role: Role }): Promise<User> {
    const res = await request<{ user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.user;
  },

  async deleteUser(id: string): Promise<void> {
    await request(`/users/${id}`, { method: 'DELETE' });
  },

  async getActivityLog(limit = 50): Promise<ActivityLogEntry[]> {
    const res = await request<{ activity: ActivityLogEntry[] }>(`/users/activity-log?limit=${limit}`);
    return res.activity;
  },

  async getLoginActivity(limit = 50): Promise<LoginActivityEntry[]> {
    const res = await request<{ loginActivity: LoginActivityEntry[] }>(`/users/login-activity?limit=${limit}`);
    return res.loginActivity;
  },
};