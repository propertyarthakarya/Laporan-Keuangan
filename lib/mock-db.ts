import type {
  User,
  Category,
  Transaction,
  Role,
  TransactionType,
  DashboardSummary,
  ChartDataPoint,
  ProfitLossReport,
  ActivityLogEntry,
  CategoryBreakdown,
} from './types';

// In-memory data store that mirrors the Express backend's Prisma models.
// This allows the frontend to run standalone for demo purposes. When the
// real API is available, the API client will proxy requests there instead.

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const users: User[] = [
  { id: 'u-admin', name: 'System Admin', email: 'admin@company.com', role: 'ADMIN', createdAt: new Date('2024-01-01').toISOString() },
  { id: 'u-staff', name: 'Finance Staff', email: 'finance@company.com', role: 'STAFF', createdAt: new Date('2024-01-05').toISOString() },
  { id: 'u-mgmt', name: 'Manager', email: 'manager@company.com', role: 'MANAGEMENT', createdAt: new Date('2024-01-10').toISOString() },
];

const passwords: Record<string, string> = {
  'admin@company.com': 'admin123',
  'finance@company.com': 'staff123',
  'manager@company.com': 'mgmt123',
};

const categories: Category[] = [
  { id: 'c-sales', categoryName: 'Sales', type: 'INCOME', createdAt: new Date('2024-01-01').toISOString() },
  { id: 'c-invest', categoryName: 'Investments', type: 'INCOME', createdAt: new Date('2024-01-01').toISOString() },
  { id: 'c-other', categoryName: 'Other Revenue', type: 'INCOME', createdAt: new Date('2024-01-01').toISOString() },
  { id: 'c-sal', categoryName: 'Salaries', type: 'EXPENSE', createdAt: new Date('2024-01-01').toISOString() },
  { id: 'c-op', categoryName: 'Operational Costs', type: 'EXPENSE', createdAt: new Date('2024-01-01').toISOString() },
  { id: 'c-goods', categoryName: 'Goods Purchases', type: 'EXPENSE', createdAt: new Date('2024-01-01').toISOString() },
];

const now = new Date();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const transactions: Transaction[] = [
  { id: uid(), date: daysAgo(1), categoryId: 'c-sales', category: { id: 'c-sales', categoryName: 'Sales', type: 'INCOME' }, description: 'Product sale - Order #1042', amount: 12500, transactionType: 'INCOME', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(1) },
  { id: uid(), date: daysAgo(2), categoryId: 'c-sales', category: { id: 'c-sales', categoryName: 'Sales', type: 'INCOME' }, description: 'Product sale - Order #1041', amount: 8200, transactionType: 'INCOME', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(2) },
  { id: uid(), date: daysAgo(3), categoryId: 'c-sal', category: { id: 'c-sal', categoryName: 'Salaries', type: 'EXPENSE' }, description: 'Monthly payroll', amount: 45000, transactionType: 'EXPENSE', createdById: 'u-admin', createdBy: { id: 'u-admin', name: 'System Admin' }, createdAt: daysAgo(3) },
  { id: uid(), date: daysAgo(5), categoryId: 'c-op', category: { id: 'c-op', categoryName: 'Operational Costs', type: 'EXPENSE' }, description: 'Office utilities', amount: 3200, transactionType: 'EXPENSE', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(5) },
  { id: uid(), date: daysAgo(7), categoryId: 'c-invest', category: { id: 'c-invest', categoryName: 'Investments', type: 'INCOME' }, description: 'Dividend income', amount: 5500, transactionType: 'INCOME', createdById: 'u-admin', createdBy: { id: 'u-admin', name: 'System Admin' }, createdAt: daysAgo(7) },
  { id: uid(), date: daysAgo(8), categoryId: 'c-goods', category: { id: 'c-goods', categoryName: 'Goods Purchases', type: 'EXPENSE' }, description: 'Raw materials purchase', amount: 12000, transactionType: 'EXPENSE', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(8) },
  { id: uid(), date: daysAgo(10), categoryId: 'c-sales', category: { id: 'c-sales', categoryName: 'Sales', type: 'INCOME' }, description: 'Product sale - Order #1038', amount: 9800, transactionType: 'INCOME', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(10) },
  { id: uid(), date: daysAgo(12), categoryId: 'c-op', category: { id: 'c-op', categoryName: 'Operational Costs', type: 'EXPENSE' }, description: 'Software subscription', amount: 1500, transactionType: 'EXPENSE', createdById: 'u-admin', createdBy: { id: 'u-admin', name: 'System Admin' }, createdAt: daysAgo(12) },
  { id: uid(), date: daysAgo(14), categoryId: 'c-sales', category: { id: 'c-sales', categoryName: 'Sales', type: 'INCOME' }, description: 'Product sale - Order #1035', amount: 15600, transactionType: 'INCOME', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(14) },
  { id: uid(), date: daysAgo(15), categoryId: 'c-goods', category: { id: 'c-goods', categoryName: 'Goods Purchases', type: 'EXPENSE' }, description: 'Inventory restock', amount: 7800, transactionType: 'EXPENSE', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(15) },
  { id: uid(), date: daysAgo(18), categoryId: 'c-invest', category: { id: 'c-invest', categoryName: 'Investments', type: 'INCOME' }, description: 'Interest income', amount: 2200, transactionType: 'INCOME', createdById: 'u-admin', createdBy: { id: 'u-admin', name: 'System Admin' }, createdAt: daysAgo(18) },
  { id: uid(), date: daysAgo(20), categoryId: 'c-sal', category: { id: 'c-sal', categoryName: 'Salaries', type: 'EXPENSE' }, description: 'Contractor payment', amount: 8500, transactionType: 'EXPENSE', createdById: 'u-admin', createdBy: { id: 'u-admin', name: 'System Admin' }, createdAt: daysAgo(20) },
  { id: uid(), date: daysAgo(22), categoryId: 'c-sales', category: { id: 'c-sales', categoryName: 'Sales', type: 'INCOME' }, description: 'Product sale - Order #1030', amount: 11200, transactionType: 'INCOME', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(22) },
  { id: uid(), date: daysAgo(25), categoryId: 'c-op', category: { id: 'c-op', categoryName: 'Operational Costs', type: 'EXPENSE' }, description: 'Marketing campaign', amount: 4500, transactionType: 'EXPENSE', createdById: 'u-admin', createdBy: { id: 'u-admin', name: 'System Admin' }, createdAt: daysAgo(25) },
  { id: uid(), date: daysAgo(28), categoryId: 'c-sales', category: { id: 'c-sales', categoryName: 'Sales', type: 'INCOME' }, description: 'Product sale - Order #1025', amount: 18700, transactionType: 'INCOME', createdById: 'u-staff', createdBy: { id: 'u-staff', name: 'Finance Staff' }, createdAt: daysAgo(28) },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockDb = {
  // Auth
  async login(email: string, password: string): Promise<User> {
    await delay(300);
    const user = users.find((u) => u.email === email.toLowerCase());
    if (!user || passwords[user.email] !== password) {
      throw new Error('Invalid email or password.');
    }
    return user;
  },

  // Users
  async getUsers(): Promise<(User & { transactionCount: number })[]> {
    await delay(200);
    return users.map((u) => ({
      ...u,
      transactionCount: transactions.filter((t) => t.createdById === u.id).length,
    }));
  },

  async createUser(data: { name: string; email: string; password: string; role: Role }): Promise<User> {
    await delay(300);
    if (users.some((u) => u.email === data.email.toLowerCase())) {
      throw new Error('A user with this email already exists.');
    }
    const user: User = {
      id: uid(),
      name: data.name,
      email: data.email.toLowerCase(),
      role: data.role,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    passwords[user.email] = data.password;
    return user;
  },

  async deleteUser(id: string): Promise<void> {
    await delay(200);
    const txCount = transactions.filter((t) => t.createdById === id).length;
    if (txCount > 0) {
      throw new Error(`Cannot delete this user because they have entered ${txCount} transaction(s).`);
    }
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found.');
    users.splice(idx, 1);
  },

  async getActivityLog(limit = 50): Promise<ActivityLogEntry[]> {
    await delay(200);
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((t) => {
        const user = users.find((u) => u.id === t.createdById)!;
        return {
          transactionId: t.id,
          date: t.date,
          categoryName: t.category.categoryName,
          description: t.description,
          amount: t.amount,
          transactionType: t.transactionType,
          enteredBy: user.name,
          enteredByEmail: user.email,
          enteredAt: t.createdAt,
        };
      });
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    await delay(200);
    return [...categories].sort((a, b) =>
      a.type === b.type ? a.categoryName.localeCompare(b.categoryName) : a.type.localeCompare(b.type),
    );
  },

  async createCategory(data: { categoryName: string; type: TransactionType }): Promise<Category> {
    await delay(300);
    if (categories.some((c) => c.categoryName === data.categoryName && c.type === data.type)) {
      throw new Error('A category with this name and type already exists.');
    }
    const cat: Category = {
      id: uid(),
      categoryName: data.categoryName,
      type: data.type,
      createdAt: new Date().toISOString(),
    };
    categories.push(cat);
    return cat;
  },

  async updateCategory(id: string, data: { categoryName: string; type: TransactionType }): Promise<Category> {
    await delay(300);
    const cat = categories.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found.');
    cat.categoryName = data.categoryName;
    cat.type = data.type;
    // Update related transactions' category info
    transactions.forEach((t) => {
      if (t.categoryId === id) {
        t.category.categoryName = data.categoryName;
        t.category.type = data.type;
      }
    });
    return cat;
  },

  async deleteCategory(id: string): Promise<void> {
    await delay(200);
    const txCount = transactions.filter((t) => t.categoryId === id).length;
    if (txCount > 0) {
      throw new Error(`Cannot delete this category because ${txCount} transaction(s) still use it.`);
    }
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Category not found.');
    categories.splice(idx, 1);
  },

  // Transactions
  async getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    transactionType?: TransactionType;
  }): Promise<Transaction[]> {
    await delay(200);
    let result = [...transactions];
    if (filters?.categoryId) result = result.filter((t) => t.categoryId === filters.categoryId);
    if (filters?.transactionType) result = result.filter((t) => t.transactionType === filters.transactionType);
    if (filters?.startDate) result = result.filter((t) => new Date(t.date) >= new Date(filters.startDate!));
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((t) => new Date(t.date) <= end);
    }
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async createTransaction(data: {
    date: string;
    categoryId: string;
    description?: string | null;
    amount: number;
    transactionType: TransactionType;
  }, userId: string): Promise<Transaction> {
    await delay(300);
    const cat = categories.find((c) => c.id === data.categoryId);
    if (!cat) throw new Error('Selected category does not exist.');
    if (cat.type !== data.transactionType) {
      throw new Error(`This category is for ${cat.type.toLowerCase()} transactions, but you selected ${data.transactionType.toLowerCase()}.`);
    }
    const user = users.find((u) => u.id === userId)!;
    const tx: Transaction = {
      id: uid(),
      date: new Date(data.date).toISOString(),
      categoryId: data.categoryId,
      category: { id: cat.id, categoryName: cat.categoryName, type: cat.type },
      description: data.description || null,
      amount: data.amount,
      transactionType: data.transactionType,
      createdById: userId,
      createdBy: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
    };
    transactions.push(tx);
    return tx;
  },

  async updateTransaction(id: string, data: {
    date: string;
    categoryId: string;
    description?: string | null;
    amount: number;
    transactionType: TransactionType;
  }): Promise<Transaction> {
    await delay(300);
    const tx = transactions.find((t) => t.id === id);
    if (!tx) throw new Error('Transaction not found.');
    const cat = categories.find((c) => c.id === data.categoryId);
    if (!cat) throw new Error('Selected category does not exist.');
    if (cat.type !== data.transactionType) {
      throw new Error(`Category type mismatch: "${cat.categoryName}" is for ${cat.type.toLowerCase()}, not ${data.transactionType.toLowerCase()}.`);
    }
    tx.date = new Date(data.date).toISOString();
    tx.categoryId = data.categoryId;
    tx.category = { id: cat.id, categoryName: cat.categoryName, type: cat.type };
    tx.description = data.description || null;
    tx.amount = data.amount;
    tx.transactionType = data.transactionType;
    return tx;
  },

  async deleteTransaction(id: string): Promise<void> {
    await delay(200);
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Transaction not found.');
    transactions.splice(idx, 1);
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    await delay(200);
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const t of transactions) {
      if (t.transactionType === 'INCOME') totalIncome += t.amount;
      else totalExpenses += t.amount;
    }
    return {
      totalIncome,
      totalExpenses,
      cashBalance: totalIncome - totalExpenses,
      profitLoss: totalIncome - totalExpenses,
      transactionCount: transactions.length,
    };
  },

  async getDashboardCharts(range: 'daily' | 'weekly' | 'monthly'): Promise<ChartDataPoint[]> {
    await delay(200);
    const buckets: Record<string, { label: string; income: number; expense: number; sortKey: string }> = {};

    for (const t of transactions) {
      const d = new Date(t.date);
      let key: string;
      let label: string;

      if (range === 'monthly') {
        key = `${d.getFullYear()}-${d.getMonth()}`;
        label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else if (range === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d);
        weekStart.setDate(diff);
        key = weekStart.toISOString().slice(0, 10);
        label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        key = d.toISOString().slice(0, 10);
        label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!buckets[key]) buckets[key] = { label, income: 0, expense: 0, sortKey: key };
      if (t.transactionType === 'INCOME') buckets[key].income += t.amount;
      else buckets[key].expense += t.amount;
    }

    return Object.values(buckets)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, income, expense }) => ({ label, income, expense }));
  },

  // Reports
  async getProfitLoss(filters?: { startDate?: string; endDate?: string }): Promise<ProfitLossReport> {
    await delay(300);
    let result = [...transactions];
    if (filters?.startDate) result = result.filter((t) => new Date(t.date) >= new Date(filters.startDate!));
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((t) => new Date(t.date) <= end);
    }

    const incomeMap: Record<string, CategoryBreakdown> = {};
    const expenseMap: Record<string, CategoryBreakdown> = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of result) {
      const map = t.transactionType === 'INCOME' ? incomeMap : expenseMap;
      if (!map[t.categoryId]) {
        map[t.categoryId] = { categoryId: t.categoryId, categoryName: t.category.categoryName, total: 0, count: 0 };
      }
      map[t.categoryId].total += t.amount;
      map[t.categoryId].count += 1;
      if (t.transactionType === 'INCOME') totalIncome += t.amount;
      else totalExpenses += t.amount;
    }

    return {
      period: { startDate: filters?.startDate || null, endDate: filters?.endDate || null },
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      incomeBreakdown: Object.values(incomeMap).sort((a, b) => b.total - a.total),
      expenseBreakdown: Object.values(expenseMap).sort((a, b) => b.total - a.total),
      transactionCount: result.length,
    };
  },
};
