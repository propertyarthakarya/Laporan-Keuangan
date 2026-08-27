"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// GET /api/reports/profit-loss?startDate=&endDate=
// Returns the full profit & loss breakdown by category.
router.get('/profit-loss', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const where = {};
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate)
                dateFilter.gte = new Date(startDate);
            if (endDate)
                dateFilter.lte = new Date(endDate);
            where.date = dateFilter;
        }
        const transactions = await prisma_1.default.transaction.findMany({
            where,
            include: {
                category: { select: { id: true, categoryName: true, type: true } },
            },
            orderBy: { date: 'asc' },
        });
        // Group by category
        const incomeByCategory = {};
        const expenseByCategory = {};
        let totalIncome = 0;
        let totalExpenses = 0;
        for (const t of transactions) {
            const amt = Number(t.amount);
            const cat = t.category;
            const map = t.transactionType === 'INCOME' ? incomeByCategory : expenseByCategory;
            if (!map[cat.id]) {
                map[cat.id] = { categoryId: cat.id, categoryName: cat.categoryName, total: 0, count: 0 };
            }
            map[cat.id].total += amt;
            map[cat.id].count += 1;
            if (t.transactionType === 'INCOME')
                totalIncome += amt;
            else
                totalExpenses += amt;
        }
        const netProfit = totalIncome - totalExpenses;
        return res.json({
            period: { startDate: startDate || null, endDate: endDate || null },
            totalIncome,
            totalExpenses,
            netProfit,
            incomeBreakdown: Object.values(incomeByCategory).sort((a, b) => b.total - a.total),
            expenseBreakdown: Object.values(expenseByCategory).sort((a, b) => b.total - a.total),
            transactionCount: transactions.length,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
