import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // =========================
  // Create users
  // =========================

  const adminPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);
  const mgmtPassword = await bcrypt.hash('mgmt123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@company.com',
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'finance@company.com' },
    update: {},
    create: {
      name: 'Finance Staff',
      email: 'finance@company.com',
      password: staffPassword,
      role: Role.STAFF,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      name: 'Manager',
      email: 'manager@company.com',
      password: mgmtPassword,
      role: Role.MANAGEMENT,
    },
  });

  // =========================
  // Create account
  // =========================

  const account = await prisma.account.upsert({
    where: {
      id: 'seed-default-account',
    },
    update: {},
    create: {
      id: 'seed-default-account',
      accountName: 'Kas Utama',
      initialBalance: 0,
      isActive: true,
    },
  });

  // =========================
  // Create categories
  // =========================

  const incomeCategories = [
    { categoryName: 'Sales', type: TransactionType.INCOME },
    { categoryName: 'Investments', type: TransactionType.INCOME },
    { categoryName: 'Other Revenue', type: TransactionType.INCOME },
  ];

  const expenseCategories = [
    { categoryName: 'Salaries', type: TransactionType.EXPENSE },
    { categoryName: 'Operational Costs', type: TransactionType.EXPENSE },
    { categoryName: 'Goods Purchases', type: TransactionType.EXPENSE },
  ];

  const categories = [...incomeCategories, ...expenseCategories];

  for (const c of categories) {
    await prisma.category.upsert({
      where: {
        categoryName_type: {
          categoryName: c.categoryName,
          type: c.type,
        },
      },
      update: {},
      create: c,
    });
  }

  // =========================
  // Get categories
  // =========================

  const allCategories = await prisma.category.findMany();

  const sales = allCategories.find(
    (c) => c.categoryName === 'Sales'
  )!;

  const investments = allCategories.find(
    (c) => c.categoryName === 'Investments'
  )!;

  const salaries = allCategories.find(
    (c) => c.categoryName === 'Salaries'
  )!;

  const operational = allCategories.find(
    (c) => c.categoryName === 'Operational Costs'
  )!;

  const goods = allCategories.find(
    (c) => c.categoryName === 'Goods Purchases'
  )!;

  // =========================
  // Create sample transactions
  // =========================

  const now = new Date();

  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };

  const sampleTransactions = [
    {
      date: daysAgo(1),
      categoryId: sales.id,
      accountId: account.id,
      description: 'Product sale - Order #1042',
      amount: 12500,
      transactionType: TransactionType.INCOME,
      createdById: staff.id,
    },
    {
      date: daysAgo(2),
      categoryId: sales.id,
      accountId: account.id,
      description: 'Product sale - Order #1041',
      amount: 8200,
      transactionType: TransactionType.INCOME,
      createdById: staff.id,
    },
    {
      date: daysAgo(3),
      categoryId: salaries.id,
      accountId: account.id,
      description: 'Monthly payroll',
      amount: 45000,
      transactionType: TransactionType.EXPENSE,
      createdById: admin.id,
    },
    {
      date: daysAgo(5),
      categoryId: operational.id,
      accountId: account.id,
      description: 'Office utilities',
      amount: 3200,
      transactionType: TransactionType.EXPENSE,
      createdById: staff.id,
    },
    {
      date: daysAgo(7),
      categoryId: investments.id,
      accountId: account.id,
      description: 'Dividend income',
      amount: 5500,
      transactionType: TransactionType.INCOME,
      createdById: admin.id,
    },
    {
      date: daysAgo(8),
      categoryId: goods.id,
      accountId: account.id,
      description: 'Raw materials purchase',
      amount: 12000,
      transactionType: TransactionType.EXPENSE,
      createdById: staff.id,
    },
    {
      date: daysAgo(10),
      categoryId: sales.id,
      accountId: account.id,
      description: 'Product sale - Order #1038',
      amount: 9800,
      transactionType: TransactionType.INCOME,
      createdById: staff.id,
    },
    {
      date: daysAgo(12),
      categoryId: operational.id,
      accountId: account.id,
      description: 'Software subscription',
      amount: 1500,
      transactionType: TransactionType.EXPENSE,
      createdById: admin.id,
    },
    {
      date: daysAgo(14),
      categoryId: sales.id,
      accountId: account.id,
      description: 'Product sale - Order #1035',
      amount: 15600,
      transactionType: TransactionType.INCOME,
      createdById: staff.id,
    },
    {
      date: daysAgo(15),
      categoryId: goods.id,
      accountId: account.id,
      description: 'Inventory restock',
      amount: 7800,
      transactionType: TransactionType.EXPENSE,
      createdById: staff.id,
    },
    {
      date: daysAgo(18),
      categoryId: investments.id,
      accountId: account.id,
      description: 'Interest income',
      amount: 2200,
      transactionType: TransactionType.INCOME,
      createdById: admin.id,
    },
    {
      date: daysAgo(20),
      categoryId: salaries.id,
      accountId: account.id,
      description: 'Contractor payment',
      amount: 8500,
      transactionType: TransactionType.EXPENSE,
      createdById: admin.id,
    },
    {
      date: daysAgo(22),
      categoryId: sales.id,
      accountId: account.id,
      description: 'Product sale - Order #1030',
      amount: 11200,
      transactionType: TransactionType.INCOME,
      createdById: staff.id,
    },
    {
      date: daysAgo(25),
      categoryId: operational.id,
      accountId: account.id,
      description: 'Marketing campaign',
      amount: 4500,
      transactionType: TransactionType.EXPENSE,
      createdById: admin.id,
    },
    {
      date: daysAgo(28),
      categoryId: sales.id,
      accountId: account.id,
      description: 'Product sale - Order #1025',
      amount: 18700,
      transactionType: TransactionType.INCOME,
      createdById: staff.id,
    },
  ];

  for (const t of sampleTransactions) {
    await prisma.transaction.create({
      data: t,
    });
  }

  console.log('Seed complete!');
  console.log('Login credentials:');
  console.log('  Admin:    admin@company.com / admin123');
  console.log('  Staff:    finance@company.com / staff123');
  console.log('  Manager:  manager@company.com / mgmt123');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });