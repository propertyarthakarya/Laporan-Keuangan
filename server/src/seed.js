"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // Create users
    const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
    const staffPassword = await bcryptjs_1.default.hash('staff123', 10);
    const mgmtPassword = await bcryptjs_1.default.hash('mgmt123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@company.com' },
        update: {},
        create: { name: 'System Admin', email: 'admin@company.com', password: adminPassword, role: client_1.Role.ADMIN },
    });
    const staff = await prisma.user.upsert({
        where: { email: 'finance@company.com' },
        update: {},
        create: { name: 'Finance Staff', email: 'finance@company.com', password: staffPassword, role: client_1.Role.STAFF },
    });
    await prisma.user.upsert({
        where: { email: 'manager@company.com' },
        update: {},
        create: { name: 'Manager', email: 'manager@company.com', password: mgmtPassword, role: client_1.Role.MANAGEMENT },
    });
    // Create categories
    const incomeCategories = [
        { categoryName: 'Sales', type: client_1.TransactionType.INCOME },
        { categoryName: 'Investments', type: client_1.TransactionType.INCOME },
        { categoryName: 'Other Revenue', type: client_1.TransactionType.INCOME },
    ];
    const expenseCategories = [
        { categoryName: 'Salaries', type: client_1.TransactionType.EXPENSE },
        { categoryName: 'Operational Costs', type: client_1.TransactionType.EXPENSE },
        { categoryName: 'Goods Purchases', type: client_1.TransactionType.EXPENSE },
    ];
    const categories = [...incomeCategories, ...expenseCategories];
    for (const c of categories) {
        await prisma.category.upsert({
            where: { categoryName_type: { categoryName: c.categoryName, type: c.type } },
            update: {},
            create: c,
        });
    }
    // Create sample transactions
    const allCategories = await prisma.category.findMany();
    const sales = allCategories.find((c) => c.categoryName === 'Sales');
    const investments = allCategories.find((c) => c.categoryName === 'Investments');
    const salaries = allCategories.find((c) => c.categoryName === 'Salaries');
    const operational = allCategories.find((c) => c.categoryName === 'Operational Costs');
    const goods = allCategories.find((c) => c.categoryName === 'Goods Purchases');
    const now = new Date();
    const daysAgo = (n) => {
        const d = new Date(now);
        d.setDate(d.getDate() - n);
        return d;
    };
    const sampleTransactions = [
        { date: daysAgo(1), categoryId: sales.id, description: 'Product sale - Order #1042', amount: 12500, transactionType: client_1.TransactionType.INCOME, createdById: staff.id },
        { date: daysAgo(2), categoryId: sales.id, description: 'Product sale - Order #1041', amount: 8200, transactionType: client_1.TransactionType.INCOME, createdById: staff.id },
        { date: daysAgo(3), categoryId: salaries.id, description: 'Monthly payroll', amount: 45000, transactionType: client_1.TransactionType.EXPENSE, createdById: admin.id },
        { date: daysAgo(5), categoryId: operational.id, description: 'Office utilities', amount: 3200, transactionType: client_1.TransactionType.EXPENSE, createdById: staff.id },
        { date: daysAgo(7), categoryId: investments.id, description: 'Dividend income', amount: 5500, transactionType: client_1.TransactionType.INCOME, createdById: admin.id },
        { date: daysAgo(8), categoryId: goods.id, description: 'Raw materials purchase', amount: 12000, transactionType: client_1.TransactionType.EXPENSE, createdById: staff.id },
        { date: daysAgo(10), categoryId: sales.id, description: 'Product sale - Order #1038', amount: 9800, transactionType: client_1.TransactionType.INCOME, createdById: staff.id },
        { date: daysAgo(12), categoryId: operational.id, description: 'Software subscription', amount: 1500, transactionType: client_1.TransactionType.EXPENSE, createdById: admin.id },
        { date: daysAgo(14), categoryId: sales.id, description: 'Product sale - Order #1035', amount: 15600, transactionType: client_1.TransactionType.INCOME, createdById: staff.id },
        { date: daysAgo(15), categoryId: goods.id, description: 'Inventory restock', amount: 7800, transactionType: client_1.TransactionType.EXPENSE, createdById: staff.id },
        { date: daysAgo(18), categoryId: investments.id, description: 'Interest income', amount: 2200, transactionType: client_1.TransactionType.INCOME, createdById: admin.id },
        { date: daysAgo(20), categoryId: salaries.id, description: 'Contractor payment', amount: 8500, transactionType: client_1.TransactionType.EXPENSE, createdById: admin.id },
        { date: daysAgo(22), categoryId: sales.id, description: 'Product sale - Order #1030', amount: 11200, transactionType: client_1.TransactionType.INCOME, createdById: staff.id },
        { date: daysAgo(25), categoryId: operational.id, description: 'Marketing campaign', amount: 4500, transactionType: client_1.TransactionType.EXPENSE, createdById: admin.id },
        { date: daysAgo(28), categoryId: sales.id, description: 'Product sale - Order #1025', amount: 18700, transactionType: client_1.TransactionType.INCOME, createdById: staff.id },
    ];
    for (const t of sampleTransactions) {
        await prisma.transaction.create({ data: t });
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
