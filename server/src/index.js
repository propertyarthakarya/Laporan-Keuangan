"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const categories_1 = __importDefault(require("./routes/categories"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const reports_1 = __importDefault(require("./routes/reports"));
const users_1 = __importDefault(require("./routes/users"));
const setup_admin_1 = __importDefault(require("./routes/setup-admin"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/users', users_1.default);
app.use('/api/setup-admin', setup_admin_1.default);
// 404
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
// Cuma nyalain server manual kalau di lokal (development).
// Di Vercel (production), app ini dipanggil sebagai serverless function,
// jadi tidak butuh app.listen().
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Financial Reporting API running on http://localhost:${PORT}`);
    });
}
exports.default = app;
