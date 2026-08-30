'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DateRange } from 'react-day-picker';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate, formatTime, toInputDate } from '@/lib/format';
import type { Transaction, Category, TransactionType } from '@/lib/types';
import {
  Plus,
  Pencil,
  Trash2,
  CircleArrowUp as ArrowUpCircle,
  CircleArrowDown as ArrowDownCircle,
  Filter,
  X,
  Loader as Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Hash,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type TransactionFormData = {
  date: string;
  categoryId: string;
  description: string;
  amount: string;
  transactionType: TransactionType;
  uniqueCode: string;
};

type TransactionFilters = {
  categoryId?: string;
  transactionType?: TransactionType;
  startDate?: string;
  endDate?: string;
};

const EMPTY_FORM: TransactionFormData = {
  date: toInputDate(new Date()),
  categoryId: '',
  description: '',
  amount: '',
  transactionType: 'INCOME',
  uniqueCode: '',
};

const ITEMS_PER_PAGE = 10;

// Ambil tipe fungsi `t` langsung dari useLanguage, biar konsisten dengan daftar key
// yang sebenarnya (bukan `string` generik yang bikin TypeScript komplain).
type TFunction = ReturnType<typeof useLanguage>['t'];

// Warna income/expense disamain dengan palet dashboard (emerald/rose), bukan
// green-600/red-600 generik, biar identitas visual satu aplikasi konsisten.
const TYPE_STYLES = {
  income: {
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    badge: 'border-emerald-600/40 text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-400',
    amount: 'text-emerald-600 dark:text-emerald-400',
    hoverRing: 'hover:border-emerald-500/30 hover:shadow-emerald-500/10',
  },
  expense: {
    iconBg: 'bg-rose-500/10 dark:bg-rose-400/10',
    iconText: 'text-rose-600 dark:text-rose-400',
    badge: 'border-rose-600/40 text-rose-600 dark:border-rose-400/40 dark:text-rose-400',
    amount: 'text-rose-600 dark:text-rose-400',
    hoverRing: 'hover:border-rose-500/30 hover:shadow-rose-500/10',
  },
} as const;

// ============================================================================
// Sub-komponen: Filter tanggal (satu kalender range, ganti dua input from/to)
// ============================================================================

function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  t,
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);

  const range: DateRange | undefined = {
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  };
  const hasRange = !!(range.from || range.to);

  function handleSelect(selected: DateRange | undefined) {
    onStartDateChange(selected?.from ? toInputDate(selected.from) : '');
    onEndDateChange(selected?.to ? toInputDate(selected.to) : '');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onStartDateChange('');
    onEndDateChange('');
  }

  const label = range.from
    ? range.to
      ? `${formatDate(range.from)} \u2013 ${formatDate(range.to)}`
      : formatDate(range.from)
    : t('transactions.fromDate');

  return (
    <div className="w-full sm:w-64">
      <Label className="mb-1.5 block text-xs">{t('transactions.fromDate')}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn('w-full justify-start gap-2 font-normal', !hasRange && 'text-muted-foreground')}
          >
            <CalendarIcon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{label}</span>
            {hasRange && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="ml-auto flex-shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleSelect}
            defaultMonth={range.from}
            numberOfMonths={1}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ============================================================================
// Sub-komponen: Filter bar
// ============================================================================

function TransactionFilterBar({
  categories,
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterCategoryChange,
  filterType,
  onFilterTypeChange,
  filterStartDate,
  onFilterStartDateChange,
  filterEndDate,
  onFilterEndDateChange,
  hasFilters,
  onClearFilters,
  t,
}: {
  categories: Category[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterCategory: string;
  onFilterCategoryChange: (v: string) => void;
  filterType: string;
  onFilterTypeChange: (v: string) => void;
  filterStartDate: string;
  onFilterStartDateChange: (v: string) => void;
  filterEndDate: string;
  onFilterEndDateChange: (v: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  t: TFunction;
}) {
  return (
    <Card className="mb-6 transition-shadow duration-300 hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="mb-1.5 block text-xs">{t('transactions.search')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
              <Input
                placeholder={t('transactions.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:flex sm:flex-wrap sm:gap-4">
            <div className="w-full sm:w-44">
              <Label className="mb-1.5 block text-xs">{t('transactions.category')}</Label>
              <Select value={filterCategory} onValueChange={onFilterCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('transactions.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('transactions.allCategories')}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.categoryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-36">
              <Label className="mb-1.5 block text-xs">{t('transactions.type')}</Label>
              <Select value={filterType} onValueChange={onFilterTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('transactions.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('transactions.allTypes')}</SelectItem>
                  <SelectItem value="INCOME">{t('transactions.income')}</SelectItem>
                  <SelectItem value="EXPENSE">{t('transactions.expense')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DateRangeFilter
              startDate={filterStartDate}
              endDate={filterEndDate}
              onStartDateChange={onFilterStartDateChange}
              onEndDateChange={onFilterEndDateChange}
              t={t}
            />
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="self-start text-muted-foreground transition-colors hover:text-foreground lg:mb-0.5 lg:self-auto"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {t('transactions.clear')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-komponen: Satu baris/kartu transaksi
// ============================================================================

function TransactionCard({
  tx,
  index,
  canEdit,
  onEdit,
  onDeleteRequest,
  t,
}: {
  tx: Transaction;
  index: number;
  canEdit: boolean;
  onEdit: (tx: Transaction) => void;
  onDeleteRequest: (tx: Transaction) => void;
  t: TFunction;
}) {
  const isIncome = tx.transactionType === 'INCOME';
  const style = isIncome ? TYPE_STYLES.income : TYPE_STYLES.expense;

  return (
    <Card
      className={cn(
        'group animate-fade-in border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        style.hoverRing,
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Ikon tipe transaksi */}
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
              style.iconBg,
            )}
          >
            {isIncome ? (
              <ArrowUpCircle className={cn('h-5 w-5', style.iconText)} />
            ) : (
              <ArrowDownCircle className={cn('h-5 w-5', style.iconText)} />
            )}
          </div>

          {/* Detail transaksi */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold break-words">{tx.category.categoryName}</p>
              <Badge variant="outline" className={cn('flex-shrink-0 text-[10px] font-bold', style.badge)}>
                {isIncome ? t('transactions.income') : t('transactions.expense')}
              </Badge>
              {tx.uniqueCode && (
                <Badge
                  variant="outline"
                  className="flex-shrink-0 gap-1 border-border text-[10px] font-mono font-medium text-muted-foreground"
                >
                  <Hash className="h-2.5 w-2.5" />
                  {tx.uniqueCode}
                </Badge>
              )}
            </div>
            {/* Tanggal transaksi (tx.date) dipisah dari jam input (tx.createdAt), karena
               keduanya bisa beda: tanggal transaksi diisi manual, jam input otomatis dari sistem. */}
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 sm:truncate">
              {tx.description || t('transactions.noDescription')} &middot; {formatDate(tx.date)} &middot;{' '}
              {formatTime(tx.createdAt)} &middot; {t('transactions.by')} {tx.createdBy.name}
            </p>
          </div>

          {/* Nominal + aksi */}
          <div className="flex flex-shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className={cn('whitespace-nowrap font-mono text-sm font-bold tabular-nums', style.amount)}>
              {isIncome ? '+' : '-'}
              {formatCurrency(tx.amount)}
            </p>

            {canEdit && (
              <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(tx)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onDeleteRequest(tx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-komponen: Dialog tambah/edit transaksi
// ============================================================================

function TransactionFormDialog({
  open,
  onOpenChange,
  isEditing,
  form,
  onFormChange,
  categories,
  formError,
  saving,
  onSave,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: TransactionFormData;
  onFormChange: (patch: Partial<TransactionFormData>) => void;
  categories: Category[];
  formError: string;
  saving: boolean;
  onSave: () => void;
  t: TFunction;
}) {
  const categoriesForType = categories.filter((c) => c.type === form.transactionType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('transactions.editTransactionTitle') : t('transactions.addTransactionTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('transactions.editTransactionDesc') : t('transactions.addTransactionDesc')}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground animate-fade-in">
            {formError}
          </div>
        )}

        <div className="space-y-4">
          {/* Toggle tipe: Income / Expense */}
          <div>
            <Label>{t('transactions.type')}</Label>
            <div className="mt-1.5 flex gap-2">
              <Button
                type="button"
                variant={form.transactionType === 'INCOME' ? 'default' : 'outline'}
                onClick={() => onFormChange({ transactionType: 'INCOME', categoryId: '' })}
                className="flex-1 transition-all"
                size="sm"
              >
                <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t('transactions.income')}
              </Button>
              <Button
                type="button"
                variant={form.transactionType === 'EXPENSE' ? 'default' : 'outline'}
                onClick={() => onFormChange({ transactionType: 'EXPENSE', categoryId: '' })}
                className="flex-1 transition-all"
                size="sm"
              >
                <ArrowDownCircle className="mr-2 h-4 w-4 text-rose-600 dark:text-rose-400" />
                {t('transactions.expense')}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="tx-date">{t('transactions.date')}</Label>
            <Input
              id="tx-date"
              type="date"
              value={form.date}
              onChange={(e) => onFormChange({ date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="tx-category">{t('transactions.category')}</Label>
            <Select value={form.categoryId} onValueChange={(v) => onFormChange({ categoryId: v })}>
              <SelectTrigger id="tx-category">
                <SelectValue placeholder={t('transactions.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categoriesForType.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tx-amount">{t('transactions.amount')}</Label>
            <Input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => onFormChange({ amount: e.target.value })}
              className="font-mono tabular-nums"
            />
          </div>

          {/* Kode unik — opsional, biasanya buat nomor invoice/referensi manual */}
          <div>
            <Label htmlFor="tx-unique-code">{t('transactions.uniqueCode')}</Label>
            <Input
              id="tx-unique-code"
              type="text"
              placeholder={t('transactions.uniqueCodePlaceholder')}
              value={form.uniqueCode}
              onChange={(e) => onFormChange({ uniqueCode: e.target.value })}
              className="font-mono"
            />
          </div>

          <div>
            <Label htmlFor="tx-desc">{t('transactions.description')}</Label>
            <Textarea
              id="tx-desc"
              placeholder={t('transactions.descriptionPlaceholder')}
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEditing ? t('transactions.saveChanges') : t('transactions.addTransactionAction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-komponen: Dialog konfirmasi hapus
// ============================================================================

function DeleteTransactionDialog({
  target,
  onOpenChange,
  onConfirm,
  saving,
  t,
}: {
  target: Transaction | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  saving: boolean;
  t: TFunction;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('transactions.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('transactions.deleteDesc', {
              category: target?.category.categoryName ?? '',
              amount: target ? formatCurrency(target.amount) : '',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// Sub-komponen: Kontrol pagination (dengan nomor halaman)
// ============================================================================

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  // Selalu tampilkan: halaman pertama, halaman terakhir, halaman aktif, dan tetangga kiri-kanannya
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(page);
  });
  return result;
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  t,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  t: TFunction;
}) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:justify-between">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="hidden sm:inline-flex"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('common.previous')}
      </Button>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 sm:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((page, i) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-muted-foreground">
              &hellip;
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="icon"
              onClick={() => onPageChange(page)}
              className="h-8 w-8 transition-transform hover:scale-105"
            >
              {page}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 sm:hidden"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="hidden sm:inline-flex"
      >
        {t('common.next')}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// Halaman utama
// ============================================================================

export default function TransactionsPage() {
  const { user, getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories } =
    useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'STAFF';

  // --- State: filter & search ---
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- State: dialog form tambah/edit ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  // --- State: dialog konfirmasi hapus ---
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // --- State: pagination ---
  const [currentPage, setCurrentPage] = useState(1);

  function updateForm(patch: Partial<TransactionFormData>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  // --- Data fetching ---
  const filters: TransactionFilters = {
    categoryId: filterCategory !== 'all' ? filterCategory : undefined,
    transactionType: filterType !== 'all' ? (filterType as TransactionType) : undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
  };

  // Transaksi — queryKey include filter, jadi tiap kombinasi filter punya cache sendiri
  const {
    data: transactions = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<Transaction[]>({
    queryKey: ['transactions', filters],
    queryFn: () => getTransactions(filters),
  });

  // Categories — independen dari filter, dipakai buat dropdown filter & form
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const error = queryError instanceof Error ? queryError.message : '';

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTransaction>[1] }) =>
      updateTransaction(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // --- Handlers: dialog form ---
  function openCreateDialog() {
    setEditingTx(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setDialogOpen(true);
  }

  function openEditDialog(tx: Transaction) {
    setEditingTx(tx);
    setForm({
      date: toInputDate(tx.date),
      categoryId: tx.categoryId,
      description: tx.description || '',
      amount: String(tx.amount),
      transactionType: tx.transactionType,
      uniqueCode: tx.uniqueCode || '',
    });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    setFormError('');

    const amount = parseFloat(form.amount);
    if (!form.categoryId) {
      setFormError(t('transactions.categoryRequired'));
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setFormError(t('transactions.amountInvalid'));
      return;
    }

    const payload = {
      date: form.date,
      categoryId: form.categoryId,
      description: form.description || null,
      amount,
      transactionType: form.transactionType,
      uniqueCode: form.uniqueCode || null,
    };

    try {
      if (editingTx) {
        await updateMutation.mutateAsync({ id: editingTx.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('transactions.saveFailed'));
    }
  }

  // --- Handlers: hapus ---
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('transactions.deleteFailed'));
    }
  }

  // --- Handlers: filter ---
  function clearFilters() {
    setFilterCategory('all');
    setFilterType('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  }

  const hasFilters = filterCategory !== 'all' || filterType !== 'all' || !!filterStartDate || !!filterEndDate;

  const filteredTransactions = searchQuery
    ? transactions.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.category.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.uniqueCode?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : transactions;

  // --- Pagination: potong data sesuai halaman aktif ---
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  );

  // Handler filter/search yang juga reset halaman ke 1 (biar nggak nyangkut di halaman kosong)
  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setCurrentPage(1);
    };
  }

  // --- Render ---
  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader title={t('transactions.title')} description={t('transactions.subtitle')}>
        {canEdit && (
          <Button onClick={openCreateDialog} className="transition-transform hover:scale-[1.02]">
            <Plus className="mr-2 h-4 w-4" />
            {t('transactions.addTransaction')}
          </Button>
        )}
      </PageHeader>

      <TransactionFilterBar
        categories={categories}
        searchQuery={searchQuery}
        onSearchChange={handleFilterChange(setSearchQuery)}
        filterCategory={filterCategory}
        onFilterCategoryChange={handleFilterChange(setFilterCategory)}
        filterType={filterType}
        onFilterTypeChange={handleFilterChange(setFilterType)}
        filterStartDate={filterStartDate}
        onFilterStartDateChange={handleFilterChange(setFilterStartDate)}
        filterEndDate={filterEndDate}
        onFilterEndDateChange={handleFilterChange(setFilterEndDate)}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        t={t}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground animate-fade-in">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Filter className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{t('transactions.noTransactionsFound')}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {hasFilters ? t('transactions.tryAdjustingFilters') : t('transactions.addToGetStarted')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedTransactions.map((tx, i) => (
              <TransactionCard
                key={tx.id}
                tx={tx}
                index={i}
                canEdit={canEdit}
                onEdit={openEditDialog}
                onDeleteRequest={setDeleteTarget}
                t={t}
              />
            ))}
          </div>

          <PaginationControls
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            t={t}
          />
        </>
      )}

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isEditing={!!editingTx}
        form={form}
        onFormChange={updateForm}
        categories={categories}
        formError={formError}
        saving={saving}
        onSave={handleSave}
        t={t}
      />

      <DeleteTransactionDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        saving={saving}
        t={t}
      />
    </div>
  );
}