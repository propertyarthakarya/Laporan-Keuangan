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
const categorySchema = zod_1.z.object({
    categoryName: zod_1.z.string().min(1, 'Category name is required').max(100),
    type: zod_1.z.enum(['INCOME', 'EXPENSE']),
});
// GET /api/categories
router.get('/', async (_req, res, next) => {
    try {
        const categories = await prisma_1.default.category.findMany({
            orderBy: [{ type: 'asc' }, { categoryName: 'asc' }],
        });
        return res.json({ categories });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/categories (Admin only)
router.post('/', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const data = categorySchema.parse(req.body);
        const category = await prisma_1.default.category.create({ data });
        return res.status(201).json({ category });
    }
    catch (err) {
        next(err);
    }
});
// PUT /api/categories/:id (Admin only)
router.put('/:id', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = categorySchema.parse(req.body);
        const existing = await prisma_1.default.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Category not found.' });
        }
        const category = await prisma_1.default.category.update({ where: { id }, data });
        return res.json({ category });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/categories/:id (Admin only)
router.delete('/:id', (0, auth_1.requireRoles)('ADMIN'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Category not found.' });
        }
        const txCount = await prisma_1.default.transaction.count({ where: { categoryId: id } });
        if (txCount > 0) {
            return res.status(400).json({
                error: `Cannot delete this category because ${txCount} transaction(s) still use it. Please reassign or delete those transactions first.`,
            });
        }
        await prisma_1.default.category.delete({ where: { id } });
        return res.json({ message: 'Category deleted successfully.' });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
