"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100),
    email: zod_1.z.string().email('Please enter a valid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['ADMIN', 'STAFF', 'MANAGEMENT']),
});
// GET /api/users (Admin only)
router.get('/', (0, auth_1.requireRoles)('ADMIN'), async (_req, res, next) => {
    try {
        const users = await prisma_1.default.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: { select: { transactions: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ users });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/users (Admin only)
router.post('/', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const data = createUserSchema.parse(req.body);
        const existing = await prisma_1.default.user.findUnique({ where: { email: data.email.toLowerCase() } });
        if (existing) {
            return res.status(409).json({ error: 'A user with this email already exists.' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                name: data.name,
                email: data.email.toLowerCase(),
                password: hashedPassword,
                role: data.role,
            },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        return res.status(201).json({ user });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/users/:id (Admin only)
router.delete('/:id', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) {
            return res.status(400).json({ error: 'You cannot delete your own account.' });
        }
        const existing = await prisma_1.default.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const txCount = await prisma_1.default.transaction.count({ where: { createdById: id } });
        if (txCount > 0) {
            return res.status(400).json({
                error: `Cannot delete this user because they have entered ${txCount} transaction(s). Please reassign those transactions or remove them first.`,
            });
        }
        await prisma_1.default.user.delete({ where: { id } });
        return res.json({ message: 'User deleted successfully.' });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/users/activity-log (Admin only)
// Returns a list of all transactions with who entered them and when,
// serving as the activity log.
router.get('/activity-log', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const transactions = await prisma_1.default.transaction.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                category: { select: { categoryName: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });
        const log = transactions.map((t) => ({
            transactionId: t.id,
            date: t.date,
            categoryName: t.category.categoryName,
            description: t.description,
            amount: Number(t.amount),
            transactionType: t.transactionType,
            enteredBy: t.createdBy.name,
            enteredByEmail: t.createdBy.email,
            enteredAt: t.createdAt,
        }));
        return res.json({ activity: log });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/users/login-activity (Admin only)
// Log aktivitas login (sukses & gagal) beserta flag anomali sederhana:
// perangkat baru, lokasi (IP) baru, dan jumlah percobaan gagal sebelum
// akhirnya berhasil. Lihat server/src/lib/loginActivity.ts untuk logika
// pencatatan & deteksinya.
router.get('/login-activity', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const entries = await prisma_1.default.loginActivity.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });
        const log = entries.map((e) => ({
            id: e.id,
            emailAttempted: e.emailAttempted,
            userId: e.userId,
            userName: e.user?.name ?? null,
            status: e.status,
            ipAddress: e.ipAddress,
            userAgent: e.userAgent,
            browser: e.browser,
            os: e.os,
            isNewDevice: e.isNewDevice,
            isNewLocation: e.isNewLocation,
            failedAttemptsBeforeSuccess: e.failedAttemptsBeforeSuccess,
            createdAt: e.createdAt,
        }));
        return res.json({ loginActivity: log });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
