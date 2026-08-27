"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const transactionSchema = zod_1.z.object({
    date: zod_1.z.string().or(zod_1.z.date()),
    categoryId: zod_1.z.string().uuid('Invalid category'),
    description: zod_1.z.string().max(500).optional().nullable(),
    amount: zod_1.z.number().positive('Amount must be greater than zero'),
    transactionType: zod_1.z.enum(['INCOME', 'EXPENSE']),
});
// GET /api/transactions — supports filtering by date range and category
router.get('/', async (req, res, next) => {
    try {
        const { startDate, endDate, categoryId, transactionType } = req.query;
        const where = {};
        if (categoryId)
            where.categoryId = categoryId;
        if (transactionType)
            where.transactionType = transactionType;
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
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: { date: 'desc' },
        });
        return res.json({
            transactions: transactions.map((t) => ({
                ...t,
                amount: Number(t.amount),
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/transactions (Admin & Staff)
router.post('/', (0, auth_1.requireRoles)('ADMIN', 'STAFF'), async (req, res, next) => {
    try {
        const data = transactionSchema.parse(req.body);
        const category = await prisma_1.default.category.findUnique({ where: { id: data.categoryId } });
        if (!category) {
            return res.status(400).json({ error: 'Selected category does not exist.' });
        }
        if (category.type !== data.transactionType) {
            return res.status(400).json({
                error: `This category is for ${category.type.toLowerCase()} transactions, but you selected ${data.transactionType.toLowerCase()}.`,
            });
        }
        const transaction = await prisma_1.default.transaction.create({
            data: {
                date: new Date(data.date),
                categoryId: data.categoryId,
                description: data.description || null,
                amount: data.amount,
                transactionType: data.transactionType,
                createdById: req.user.id,
            },
            include: {
                category: { select: { id: true, categoryName: true, type: true } },
                createdBy: { select: { id: true, name: true } },
            },
        });
        return res.status(201).json({ transaction: { ...transaction, amount: Number(transaction.amount) } });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/transactions/:id (Admin & Staff)
router.put('/:id', (0, auth_1.requireRoles)('ADMIN', 'STAFF'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = transactionSchema.parse(req.body);
        const existing = await prisma_1.default.transaction.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }
        const category = await prisma_1.default.category.findUnique({ where: { id: data.categoryId } });
        if (!category) {
            return res.status(400).json({ error: 'Selected category does not exist.' });
        }
        if (category.type !== data.transactionType) {
            return res.status(400).json({
                error: `Category type mismatch: "${category.categoryName}" is for ${category.type.toLowerCase()}, not ${data.transactionType.toLowerCase()}.`,
            });
        }
        const transaction = await prisma_1.default.transaction.update({
            where: { id },
            data: {
                date: new Date(data.date),
                categoryId: data.categoryId,
                description: data.description || null,
                amount: data.amount,
                transactionType: data.transactionType,
            },
            include: {
                category: { select: { id: true, categoryName: true, type: true } },
                createdBy: { select: { id: true, name: true } },
            },
        });
        return res.json({ transaction: { ...transaction, amount: Number(transaction.amount) } });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/transactions/:id (Admin & Staff)
router.delete('/:id', (0, auth_1.requireRoles)('ADMIN', 'STAFF'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.transaction.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }
        await prisma_1.default.transaction.delete({ where: { id } });
        return res.json({ message: 'Transaction deleted successfully.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
