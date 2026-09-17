import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import {
  requireAuth,
  requireRoles,
  AuthenticatedRequest,
} from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// =========================
// Validation
// =========================

const accountSchema = z.object({
  accountName: z
    .string()
    .min(1, 'Account name is required')
    .max(100, 'Account name is too long'),

  accountNumber: z
    .string()
    .max(100, 'Account number is too long')
    .optional()
    .nullable(),

  initialBalance: z
    .number()
    .min(0, 'Initial balance cannot be negative'),
});

// =========================
// GET /api/accounts
// Get all accounts
// =========================

router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const accounts = await prisma.account.findMany({
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
          } else {
            currentBalance -= amount;
          }
        }

        return {
          id: account.id,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
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
    } catch (err) {
      next(err);
    }
  }
);

// =========================
// POST /api/accounts
// Create account
// ADMIN only
// =========================

router.post(
  '/',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const data = accountSchema.parse(req.body);

      const account = await prisma.account.create({
        data: {
          accountName: data.accountName,
          accountNumber: data.accountNumber || null,
          initialBalance: data.initialBalance,
        },
      });

      return res.status(201).json({
        account: {
          ...account,
          initialBalance: Number(account.initialBalance),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// =========================
// PUT /api/accounts/:id
// Update account
// ADMIN only
// =========================

router.put(
  '/:id',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const data = accountSchema.parse(req.body);

      const existing = await prisma.account.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          error: 'Account not found.',
        });
      }

      const account = await prisma.account.update({
        where: { id },
        data: {
          accountName: data.accountName,
          accountNumber: data.accountNumber || null,
          initialBalance: data.initialBalance,
        },
      });

      return res.json({
        account: {
          ...account,
          initialBalance: Number(account.initialBalance),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// =========================
// PATCH /api/accounts/:id/status
// Activate / deactivate account
// ADMIN only
// =========================

router.patch(
  '/:id/status',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { id } = req.params;

      const schema = z.object({
        isActive: z.boolean(),
      });

      const data = schema.parse(req.body);

      const existing = await prisma.account.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          error: 'Account not found.',
        });
      }

      const account = await prisma.account.update({
        where: { id },
        data: {
          isActive: data.isActive,
        },
      });

      return res.json({
        account,
      });
    } catch (err) {
      next(err);
    }
  }
);

// =========================
// DELETE /api/accounts/:id
// Delete account
// ADMIN only
// =========================

router.delete(
  '/:id',
  requireRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { id } = req.params;

      const existing = await prisma.account.findUnique({
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
          error:
            'This account cannot be deleted because it has transactions. Deactivate it instead.',
        });
      }

      await prisma.account.delete({
        where: { id },
      });

      return res.json({
        message: 'Account deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;