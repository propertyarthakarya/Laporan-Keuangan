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
const setupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Nama wajib diisi'),
    email: zod_1.z.string().email('Email tidak valid'),
    password: zod_1.z.string().min(6, 'Password minimal 6 karakter'),
});
// GET /api/setup-admin -> cek apakah admin sudah ada
router.get('/', async (_req, res, next) => {
    try {
        const adminExists = await prisma_1.default.user.findFirst({
            where: { role: 'ADMIN' },
        });
        return res.json({ setupComplete: !!adminExists });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/setup-admin -> daftarkan admin pertama, lalu auto-login
router.post('/', async (req, res, next) => {
    try {
        const adminExists = await prisma_1.default.user.findFirst({
            where: { role: 'ADMIN' },
        });
        if (adminExists) {
            return res.status(403).json({
                error: 'Admin sudah terdaftar. Setup tidak bisa diulang.',
            });
        }
        const { name, email, password } = setupSchema.parse(req.body);
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: 'ADMIN',
            },
        });
        const token = (0, auth_1.signToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        res.cookie(auth_1.TOKEN_COOKIE, token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(201).json({
            message: 'Admin berhasil dibuat.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
