'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Category, TransactionType } from '@/lib/types';
import {
  Plus,
  Pencil,
  Trash2,
  Tags,
  CircleArrowUp as ArrowUpCircle,
  CircleArrowDown as ArrowDownCircle,
  Loader as Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 9;

// Generate nomor halaman dengan ellipsis (misal: 1 ... 4 5 6 ... 12) biar nggak numpuk kalau halamannya banyak
function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  const delta = 1;
  const range: number[] = [];
  const withDots: (number | 'ellipsis')[] = [];

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  let prev = 0;
  for (const i of range) {
    if (prev && i - prev > 1) withDots.push('ellipsis');
    withDots.push(i);
    prev = i;
  }
  return withDots;
}

function CategoryPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${idx}`} className="px-1.5 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8 flex-shrink-0 text-sm"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 flex-shrink-0"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Header seksi dengan garis aksen gradient sesuai tipe kategori, biar income & expense punya identitas warna yang jelas
function SectionHeader({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: 'income' | 'expense';
}) {
  return (
    <div className="mb-3">
      <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        <span>{label}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
            tone === 'income'
              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
          )}
        >
          {count}
        </span>
      </h2>
      <div
        className={cn(
          'mt-2 h-[3px] w-10 rounded-full bg-gradient-to-r',
          tone === 'income'
            ? 'from-green-500 to-green-500/10'
            : 'from-red-500 to-red-500/10',
        )}
      />
    </div>
  );
}

export default function CategoriesPage() {
  const { user, getCategories, createCategory, updateCategory, deleteCategory } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [formError, setFormError] = useState('');

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<TransactionType>('INCOME');

  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const {
    data: categories = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: user?.role === 'ADMIN',
  });

  const error = queryError instanceof Error ? queryError.message : '';

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { categoryName: string; type: TransactionType } }) =>
      updateCategory(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const incomeCats = categories.filter((c) => c.type === 'INCOME');
  const expenseCats = categories.filter((c) => c.type === 'EXPENSE');

  const incomeTotalPages = Math.max(1, Math.ceil(incomeCats.length / ITEMS_PER_PAGE));
  const expenseTotalPages = Math.max(1, Math.ceil(expenseCats.length / ITEMS_PER_PAGE));

  // Kalau kategori kehapus/berkurang sampai halaman aktif nggak ada lagi datanya, mundurin ke halaman terakhir yang valid
  useEffect(() => {
    if (incomePage > incomeTotalPages) setIncomePage(incomeTotalPages);
  }, [incomePage, incomeTotalPages]);

  useEffect(() => {
    if (expensePage > expenseTotalPages) setExpensePage(expenseTotalPages);
  }, [expensePage, expenseTotalPages]);

  const paginatedIncome = incomeCats.slice(
    (incomePage - 1) * ITEMS_PER_PAGE,
    incomePage * ITEMS_PER_PAGE,
  );
  const paginatedExpense = expenseCats.slice(
    (expensePage - 1) * ITEMS_PER_PAGE,
    expensePage * ITEMS_PER_PAGE,
  );

  function openCreate(presetType?: TransactionType) {
    setEditing(null);
    setFormName('');
    setFormType(presetType ?? 'INCOME');
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setFormName(cat.categoryName);
    setFormType(cat.type);
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    setFormError('');
    if (!formName.trim()) {
      setFormError(t('categories.nameRequired'));
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: { categoryName: formName.trim(), type: formType } });
      } else {
        await createMutation.mutateAsync({ categoryName: formName.trim(), type: formType });
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('categories.saveFailed'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('categories.deleteFailed'));
    }
  }

  if (user && user.role !== 'ADMIN') return null;

  const CategoryCard = ({ cat, index }: { cat: Category; index: number }) => (
    <Card
      className="group animate-fade-in transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms`, animationFillMode: 'backwards' }}
    >
      <CardContent className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:h-10 sm:w-10',
            cat.type === 'INCOME'
              ? 'bg-green-100 dark:bg-green-950'
              : 'bg-red-100 dark:bg-red-950',
          )}
        >
          {cat.type === 'INCOME' ? (
            <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400 sm:h-5 sm:w-5" />
          ) : (
            <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400 sm:h-5 sm:w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{cat.categoryName}</p>
          <Badge
            variant="outline"
            className={cn(
              'mt-0.5 text-[10px] font-bold',
              cat.type === 'INCOME'
                ? 'border-green-600/30 text-green-700 dark:text-green-400'
                : 'border-red-600/30 text-red-700 dark:text-red-400',
            )}
          >
            {cat.type === 'INCOME' ? t('categories.income') : t('categories.expense')}
          </Badge>
        </div>
        <div className="flex flex-shrink-0 gap-0.5 opacity-70 transition-opacity duration-150 group-hover:opacity-100 sm:gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setDeleteTarget(cat)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ tone, onAdd }: { tone: 'income' | 'expense'; onAdd: () => void }) => (
    <Card className="sm:col-span-2 xl:col-span-3 border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            tone === 'income' ? 'bg-green-100 dark:bg-green-950' : 'bg-red-100 dark:bg-red-950',
          )}
        >
          <Tags
            className={cn(
              'h-5 w-5',
              tone === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            )}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {tone === 'income' ? t('categories.noIncomeCategories') : t('categories.noExpenseCategories')}
        </p>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('categories.addCategory')}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader title={t('categories.title')} description={t('categories.subtitle')}>
        <Button onClick={() => openCreate()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('categories.addCategory')}
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          <div>
            <SectionHeader
              icon={<ArrowUpCircle className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />}
              label={t('categories.incomeCategories')}
              count={incomeCats.length}
              tone="income"
            />
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
              {paginatedIncome.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i} />
              ))}
              {incomeCats.length === 0 && (
                <EmptyState tone="income" onAdd={() => openCreate('INCOME')} />
              )}
            </div>
            <CategoryPagination page={incomePage} totalPages={incomeTotalPages} onChange={setIncomePage} />
          </div>

          <div>
            <SectionHeader
              icon={<ArrowDownCircle className="h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />}
              label={t('categories.expenseCategories')}
              count={expenseCats.length}
              tone="expense"
            />
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
              {paginatedExpense.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i} />
              ))}
              {expenseCats.length === 0 && (
                <EmptyState tone="expense" onAdd={() => openCreate('EXPENSE')} />
              )}
            </div>
            <CategoryPagination page={expensePage} totalPages={expenseTotalPages} onChange={setExpensePage} />
          </div>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:w-full">
          <DialogHeader>
            <DialogTitle>{editing ? t('categories.editCategoryTitle') : t('categories.addCategoryTitle')}</DialogTitle>
            <DialogDescription>
              {editing ? t('categories.editCategoryDesc') : t('categories.addCategoryDesc')}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">{t('categories.categoryName')}</Label>
              <Input
                id="cat-name"
                placeholder={t('categories.categoryNamePlaceholder')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t('categories.type')}</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as TransactionType)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">{t('categories.income')}</SelectItem>
                  <SelectItem value="EXPENSE">{t('categories.expense')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? t('categories.saveChanges') : t('categories.addCategoryAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.deleteDesc', { name: deleteTarget?.categoryName ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}