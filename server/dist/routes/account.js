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
// =========================
// Validation
// =========================
const accountSchema = zod_1.z.object({
    accountName: zod_1.z
        .string()
        .min(1, 'Account name is required')
        .max(100, 'Account name is too long'),
    initialBalance: zod_1.z
        .number()
        .min(0, 'Initial balance cannot be negative'),
});
// =========================
// GET /api/accounts
// Get all accounts
// =========================
router.get('/', async (req, res, next) => {
    try {
        const accounts = await prisma_1.default.account.findMany({
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                transactions: {
                    select: {
                        amount: true,
                        transactionType: true,
                    },
                },
            },
        });
        const result = accounts.map((account) => {
            let currentBalance = Number(account.initialBalance);
            for (const transaction of account.transactions) {
                const amount = Number(transaction.amount);
                if (transaction.transactionType === 'INCOME') {
                    currentBalance += amount;
                }
                else {
                    currentBalance -= amount;
                }
            }
            return {
                id: account.id,
                accountName: account.accountName,
                initialBalance: Number(account.initialBalance),
                currentBalance,
                isActive: account.isActive,
                createdAt: account.createdAt,
                updatedAt: account.updatedAt,
            };
        });
        return res.json({
            accounts: result,
        });
    }
    catch (err) {
        next(err);
    }
});
// =========================
// POST /api/accounts
// Create account
// ADMIN only
// =========================
router.post('/', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const data = accountSchema.parse(req.body);
        const account = await prisma_1.default.account.create({
            data: {
                accountName: data.accountName,
                initialBalance: data.initialBalance,
            },
        });
        return res.status(201).json({
            account: {
                ...account,
                initialBalance: Number(account.initialBalance),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// =========================
// PUT /api/accounts/:id
// Update account
// ADMIN only
// =========================
router.put('/:id', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = accountSchema.parse(req.body);
        const existing = await prisma_1.default.account.findUnique({
            where: { id },
        });
        if (!existing) {
            return res.status(404).json({
                error: 'Account not found.',
            });
        }
        const account = await prisma_1.default.account.update({
            where: { id },
            data: {
                accountName: data.accountName,
                initialBalance: data.initialBalance,
            },
        });
        return res.json({
            account: {
                ...account,
                initialBalance: Number(account.initialBalance),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// =========================
// PATCH /api/accounts/:id/status
// Activate / deactivate account
// ADMIN only
// =========================
router.patch('/:id/status', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const schema = zod_1.z.object({
            isActive: zod_1.z.boolean(),
        });
        const data = schema.parse(req.body);
        const existing = await prisma_1.default.account.findUnique({
            where: { id },
        });
        if (!existing) {
            return res.status(404).json({
                error: 'Account not found.',
            });
        }
        const account = await prisma_1.default.account.update({
            where: { id },
            data: {
                isActive: data.isActive,
            },
        });
        return res.json({
            account,
        });
    }
    catch (err) {
        next(err);
    }
});
// =========================
// DELETE /api/accounts/:id
// Delete account
// ADMIN only
// =========================
router.delete('/:id', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.account.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        transactions: true,
                    },
                },
            },
        });
        if (!existing) {
            return res.status(404).json({
                error: 'Account not found.',
            });
        }
        // Jangan izinkan rekening dihapus kalau sudah digunakan transaksi
        if (existing._count.transactions > 0) {
            return res.status(400).json({
                error: 'This account cannot be deleted because it has transactions. Deactivate it instead.',
            });
        }
        await prisma_1.default.account.delete({
            where: { id },
        });
        return res.json({
            message: 'Account deleted successfully.',
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
