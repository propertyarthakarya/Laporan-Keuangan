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
const loginActivity_1 = require("../lib/loginActivity");
const router = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please enter a valid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await prisma_1.default.user.findUnique({
            where: { email: email.toLowerCase() }
        });
        console.log('LOGIN CHECK:', {
            email: email.toLowerCase(),
            userFound: !!user,
        });
        if (!user) {
            (0, loginActivity_1.recordLoginActivity)({ req, emailAttempted: email, status: 'FAILED', userId: null }).catch(() => { });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            // Email valid tapi password salah — userId tetap dicatat supaya
            // bisa dideteksi kalau akun tertentu sedang dibrute-force.
            (0, loginActivity_1.recordLoginActivity)({ req, emailAttempted: email, status: 'FAILED', userId: user.id }).catch(() => { });
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const token = (0, auth_1.signToken)({ id: user.id, email: user.email, role: user.role });
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie(auth_1.TOKEN_COOKIE, token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        // Fire-and-forget: tidak menunda response login, dan tidak pernah
        // melempar error keluar (lihat implementasinya).
        (0, loginActivity_1.recordLoginActivity)({ req, emailAttempted: email, status: 'SUCCESS', userId: user.id }).catch(() => { });
        return res.json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/auth/logout
router.post('/logout', (_req, res) => {
    res.clearCookie(auth_1.TOKEN_COOKIE);
    return res.json({ message: 'Logged out successfully.' });
});
// GET /api/auth/me
router.get('/me', auth_1.requireAuth, (req, res) => {
    return res.json({ user: req.user });
});
exports.default = router;
