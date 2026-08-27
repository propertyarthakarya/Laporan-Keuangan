"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = exports.TOKEN_COOKIE = void 0;
exports.signToken = signToken;
exports.requireAuth = requireAuth;
exports.requireRoles = requireRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const TOKEN_COOKIE = 'fin_token';
exports.TOKEN_COOKIE = TOKEN_COOKIE;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
exports.JWT_SECRET = JWT_SECRET;
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
// Verifies the JWT from the httpOnly cookie and attaches the user to req.user.
async function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.[TOKEN_COOKIE];
        if (!token) {
            return res.status(401).json({ error: 'Authentication required. Please log in.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, name: true, email: true, role: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'User no longer exists. Please log in again.' });
        }
        req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    }
}
// Allows only the listed roles; call after requireAuth.
function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }
        next();
    };
}
