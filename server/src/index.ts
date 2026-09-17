import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import transactionRoutes from './routes/transactions';
import accountRoutes from './routes/account';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import userRoutes from './routes/users';
import setupAdminRoutes from './routes/setup-admin';
import uploadRoutes from './routes/upload'; 
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/setup-admin', setupAdminRoutes);
app.use('/api/upload', uploadRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Error handler (must be last)
app.use(errorHandler);

// Cuma nyalain server manual kalau di lokal (development).
// Di Vercel (production), app ini dipanggil sebagai serverless function,
// jadi tidak butuh app.listen().
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Financial Reporting API running on http://localhost:${PORT}`);
  });
}

export default app;