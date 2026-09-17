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
    categoryName: zod_1.z
        .string()
        .min(1, 'Category name is required')
        .max(100),
    type: zod_1.z.enum(['INCOME', 'EXPENSE']),
    parentId: zod_1.z
        .string()
        .uuid()
        .nullable()
        .optional(),
});
// GET /api/categories
router.get('/', async (_req, res, next) => {
    try {
        const categories = await prisma_1.default.category.findMany({
            orderBy: [
                { type: 'asc' },
                { categoryName: 'asc' },
            ],
            include: {
                children: {
                    orderBy: {
                        categoryName: 'asc',
                    },
                },
            },
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
        // Kalau membuat subkategori, pastikan parent ada
        if (data.parentId) {
            const parent = await prisma_1.default.category.findUnique({
                where: {
                    id: data.parentId,
                },
            });
            if (!parent) {
                return res.status(404).json({
                    error: 'Parent category not found.',
                });
            }
            // Parent dan child harus memiliki type yang sama
            if (parent.type !== data.type) {
                return res.status(400).json({
                    error: 'Subcategory type must match the parent category type.',
                });
            }
            // Maksimal 2 level:
            // kategori utama -> subkategori
            if (parent.parentId) {
                return res.status(400).json({
                    error: 'Subcategories cannot have another subcategory.',
                });
            }
        }
        const category = await prisma_1.default.category.create({
            data: {
                categoryName: data.categoryName,
                type: data.type,
                parentId: data.parentId ?? null,
            },
        });
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
        const existing = await prisma_1.default.category.findUnique({
            where: { id },
        });
        if (!existing) {
            return res.status(404).json({
                error: 'Category not found.',
            });
        }
        // Tidak boleh menjadikan dirinya sendiri sebagai parent
        if (data.parentId === id) {
            return res.status(400).json({
                error: 'A category cannot be its own parent.',
            });
        }
        if (data.parentId) {
            const parent = await prisma_1.default.category.findUnique({
                where: {
                    id: data.parentId,
                },
            });
            if (!parent) {
                return res.status(404).json({
                    error: 'Parent category not found.',
                });
            }
            // Parent dan child harus type sama
            if (parent.type !== data.type) {
                return res.status(400).json({
                    error: 'Subcategory type must match the parent category type.',
                });
            }
            // Parent tidak boleh merupakan subkategori
            if (parent.parentId) {
                return res.status(400).json({
                    error: 'Subcategories cannot have another subcategory.',
                });
            }
        }
        // Kalau kategori yang sedang diedit punya children,
        // jangan izinkan type berubah karena akan membuat
        // type parent dan child berbeda.
        if (existing.type !== data.type &&
            data.parentId === null &&
            existing.parentId === null) {
            const childrenCount = await prisma_1.default.category.count({
                where: {
                    parentId: id,
                },
            });
            if (childrenCount > 0) {
                return res.status(400).json({
                    error: 'Cannot change the type of a category that has subcategories.',
                });
            }
        }
        const category = await prisma_1.default.category.update({
            where: { id },
            data: {
                categoryName: data.categoryName,
                type: data.type,
                parentId: data.parentId ?? null,
            },
        });
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
        const existing = await prisma_1.default.category.findUnique({
            where: { id },
            include: {
                children: true,
            },
        });
        if (!existing) {
            return res.status(404).json({
                error: 'Category not found.',
            });
        }
        // Cek transaksi
        const txCount = await prisma_1.default.transaction.count({
            where: {
                categoryId: id,
            },
        });
        if (txCount > 0) {
            return res.status(400).json({
                error: `Cannot delete this category because ${txCount} transaction(s) still use it. Please reassign or delete those transactions first.`,
            });
        }
        // Kalau parent masih punya subkategori
        if (existing.children.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete this category because it still has subcategories. Please delete or move the subcategories first.',
            });
        }
        await prisma_1.default.category.delete({
            where: { id },
        });
        return res.json({
            message: 'Category deleted successfully.',
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
