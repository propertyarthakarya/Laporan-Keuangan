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
// GET /api/dashboard/summary
// Returns total income, total expenses, cash balance, and current profit/loss.
router.get('/summary', async (_req, res, next) => {
    try {
        const transactions = await prisma_1.default.transaction.findMany({
            select: { amount: true, transactionType: true },
        });
        let totalIncome = 0;
        let totalExpenses = 0;
        for (const t of transactions) {
            const amt = Number(t.amount);
            if (t.transactionType === 'INCOME')
                totalIncome += amt;
            else
                totalExpenses += amt;
        }
        const cashBalance = totalIncome - totalExpenses;
        const profitLoss = cashBalance;
        return res.json({
            totalIncome,
            totalExpenses,
            cashBalance,
            profitLoss,
            transactionCount: transactions.length,
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/dashboard/charts?range=daily|weekly|monthly
// Returns aggregated income/expense data grouped by the requested range.
router.get('/charts', async (req, res, next) => {
    try {
        const range = req.query.range || 'daily';
        const transactions = await prisma_1.default.transaction.findMany({
            select: { date: true, amount: true, transactionType: true },
            orderBy: { date: 'asc' },
        });
        const buckets = {};
        for (const t of transactions) {
            const d = new Date(t.date);
            let key;
            let label;
            let sortKey;
            if (range === 'monthly') {
                const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                key = `${d.getFullYear()}-${d.getMonth()}`;
                label = monthName;
                sortKey = key;
            }
            else if (range === 'weekly') {
                // Get the Monday of the week
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const weekStart = new Date(d);
                weekStart.setDate(diff);
                key = weekStart.toISOString().slice(0, 10);
                label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                sortKey = key;
            }
            else {
                // daily
                key = d.toISOString().slice(0, 10);
                label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                sortKey = key;
            }
            if (!buckets[key]) {
                buckets[key] = { label, income: 0, expense: 0, sortKey };
            }
            const amt = Number(t.amount);
            if (t.transactionType === 'INCOME')
                buckets[key].income += amt;
            else
                buckets[key].expense += amt;
        }
        const data = Object.values(buckets)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map((b) => ({ label: b.label, income: b.income, expense: b.expense }));
        return res.json({ data });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
