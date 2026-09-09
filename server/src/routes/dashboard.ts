import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/dashboard/summary
// Returns total income, total expenses, cash balance, and current profit/loss.
router.get('/summary', async (_req, res: Response, next) => {
  try {
    const transactions = await prisma.transaction.findMany({
      select: {
        amount: true,
        transactionType: true,
        category: {
          select: {
            id: true,
            categoryName: true,
            type: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                categoryName: true,
                type: true,
              },
            },
          },
        },
      },
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    type ChildBreakdown = {
      categoryId: string;
      categoryName: string;
      total: number;
      count: number;
    };

    type CategoryBreakdown = {
      categoryId: string;
      categoryName: string;
      total: number;
      count: number;
      directTotal: number;
      directCount: number;
      children: Map<string, ChildBreakdown>;
    };

    const incomeGroups = new Map<
      string,
      CategoryBreakdown
    >();

    const expenseGroups = new Map<
      string,
      CategoryBreakdown
    >();

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      if (transaction.transactionType === 'INCOME') {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
      }

      const category = transaction.category;

      const rootCategory =
        category.parent ?? category;

      const map =
        transaction.transactionType === 'INCOME'
          ? incomeGroups
          : expenseGroups;

      let group = map.get(rootCategory.id);

      if (!group) {
        group = {
          categoryId: rootCategory.id,
          categoryName: rootCategory.categoryName,
          total: 0,
          count: 0,
          directTotal: 0,
          directCount: 0,
          children: new Map(),
        };

        map.set(rootCategory.id, group);
      }

      group.total += amount;
      group.count += 1;

      // Transaksi langsung pada kategori induk
      if (!category.parentId) {
        group.directTotal += amount;
        group.directCount += 1;
      } else {
        // Transaksi pada subkategori
        const existingChild = group.children.get(
          category.id,
        );

        if (existingChild) {
          existingChild.total += amount;
          existingChild.count += 1;
        } else {
          group.children.set(category.id, {
            categoryId: category.id,
            categoryName: category.categoryName,
            total: amount,
            count: 1,
          });
        }
      }
    }

    function serializeGroups(
      groups: Map<string, CategoryBreakdown>,
    ) {
      return Array.from(groups.values())
        .map((group) => ({
          categoryId: group.categoryId,
          categoryName: group.categoryName,
          total: group.total,
          count: group.count,
          directTotal: group.directTotal,
          directCount: group.directCount,
          children: Array.from(
            group.children.values(),
          ).sort((a, b) => b.total - a.total),
        }))
        .sort((a, b) => b.total - a.total);
    }

    const cashBalance =
      totalIncome - totalExpenses;

    const profitLoss = cashBalance;

    return res.json({
      totalIncome,
      totalExpenses,
      cashBalance,
      profitLoss,
      transactionCount: transactions.length,

      incomeBreakdown:
        serializeGroups(incomeGroups),

      expenseBreakdown:
        serializeGroups(expenseGroups),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/charts?range=daily|weekly|monthly
// Returns aggregated income/expense data grouped by the requested range.
router.get(
  '/charts',
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const range =
        (req.query.range as string) ||
        'daily';

      const transactions =
        await prisma.transaction.findMany({
          select: {
            date: true,
            amount: true,
            transactionType: true,
            category: {
              select: {
                id: true,
                categoryName: true,
                parentId: true,
                parent: {
                  select: {
                    id: true,
                    categoryName: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: 'asc',
          },
        });

      type ChartCategory = {
        categoryId: string;
        categoryName: string;
        total: number;
        count: number;
        parentId: string | null;
        parentName: string | null;
      };

      type ChartBucket = {
        label: string;
        income: number;
        expense: number;
        sortKey: string;
        incomeCategories: Map<
          string,
          ChartCategory
        >;
        expenseCategories: Map<
          string,
          ChartCategory
        >;
      };

      const buckets: Record<
        string,
        ChartBucket
      > = {};

      for (const t of transactions) {
        const d = new Date(t.date);

        let key: string;
        let label: string;
        let sortKey: string;

        if (range === 'monthly') {
          const monthName =
            d.toLocaleDateString(
              'en-US',
              {
                month: 'short',
                year: 'numeric',
              },
            );

          key = `${d.getFullYear()}-${d.getMonth()}`;
          label = monthName;
          sortKey = key;
        } else if (range === 'weekly') {
          const day = d.getDay();

          const diff =
            d.getDate() -
            day +
            (day === 0 ? -6 : 1);

          const weekStart =
            new Date(d);

          weekStart.setDate(diff);

          key = weekStart
            .toISOString()
            .slice(0, 10);

          label = `Week of ${weekStart.toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
            },
          )}`;

          sortKey = key;
        } else {
          key = d.toISOString().slice(0, 10);

          label =
            d.toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
              },
            );

          sortKey = key;
        }

        if (!buckets[key]) {
          buckets[key] = {
            label,
            income: 0,
            expense: 0,
            sortKey,
            incomeCategories: new Map(),
            expenseCategories: new Map(),
          };
        }

        const bucket = buckets[key];

        const amount =
          Number(t.amount);

        const category =
          t.category;

        const categoryMap =
          t.transactionType === 'INCOME'
            ? bucket.incomeCategories
            : bucket.expenseCategories;

        if (t.transactionType === 'INCOME') {
          bucket.income += amount;
        } else {
          bucket.expense += amount;
        }

        const existing =
          categoryMap.get(category.id);

        if (existing) {
          existing.total += amount;
          existing.count += 1;
        } else {
          categoryMap.set(
            category.id,
            {
              categoryId: category.id,
              categoryName:
                category.categoryName,
              total: amount,
              count: 1,
              parentId:
                category.parentId,
              parentName:
                category.parent?.categoryName ??
                null,
            },
          );
        }
      }

      const data = Object.values(
        buckets,
      )
        .sort((a, b) =>
          a.sortKey.localeCompare(
            b.sortKey,
          ),
        )
        .map((bucket) => ({
          label: bucket.label,
          income: bucket.income,
          expense: bucket.expense,

          incomeCategories:
            Array.from(
              bucket.incomeCategories.values(),
            ).sort(
              (a, b) =>
                b.total - a.total,
            ),

          expenseCategories:
            Array.from(
              bucket.expenseCategories.values(),
            ).sort(
              (a, b) =>
                b.total - a.total,
            ),
        }));

      return res.json({
        data,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
