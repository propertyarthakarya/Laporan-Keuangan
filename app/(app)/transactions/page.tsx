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
import type {
  Transaction,
  Category,
  TransactionType,
  Account,
} from '@/lib/types';

import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  CircleArrowUp as ArrowUpCircle,
  CircleArrowDown as ArrowDownCircle,
  Filter,
  X,
  Loader as Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Hash,
  Calendar as CalendarIcon,
  Wallet,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type TransactionFormData = {
  date: string;
  categoryId: string;
  accountId: string;
  description: string;
  amount: string;
  transactionType: TransactionType;
  uniqueCode: string;
};


type TransactionFilters = {
  categoryId?: string;
  accountId?: string;
  transactionType?: TransactionType;
  startDate?: string;
  endDate?: string;
};

const EMPTY_FORM: TransactionFormData = {
  date: toInputDate(new Date()),
  categoryId: '',
  accountId: '',
  description: '',
  amount: '',
  transactionType: 'INCOME',
  uniqueCode: '',
};

const ITEMS_PER_PAGE = 10;

// Ambil tipe fungsi `t` langsung dari useLanguage, biar konsisten dengan daftar key
// yang sebenarnya (bukan `string` generik yang bikin TypeScript komplain).
type TFunction = ReturnType<typeof useLanguage>['t'];

// ============================================================================
// Background — Glassmorphism + Noise Texture
// ============================================================================

const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function PageBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#f4f4f6] dark:bg-[#0a0a0c]" />
      <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rotate-[-20deg] bg-blue-200/25 blur-[110px] dark:bg-white/[0.10]" />
      <div className="absolute top-1/3 right-[-10%] h-[520px] w-[620px] -translate-y-1/2 rounded-full bg-indigo-200/20 blur-[130px] dark:bg-white/[0.07]" />
      <div className="absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-black/[0.04] blur-[120px] dark:bg-white/[0.1]" />
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-multiply dark:opacity-[0.05] dark:mix-blend-overlay"
        style={{ backgroundImage: NOISE_BG, backgroundRepeat: 'repeat' }}
      />
    </div>
  );
}

const GLASS_CARD =
  'border-white/60 bg-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] [backdrop-filter:blur(20px)_saturate(150%)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]';

// ============================================================================
// Sub-komponen: Category picker untuk FORM tambah/edit (drill-down, dibatasi type)
// ============================================================================

function CategoryPicker({
  categories,
  type,
  value,
  onChange,
  t,
}: {
  categories: Category[];
  type: TransactionType;
  value: string;
  onChange: (value: string) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const categoriesForType = categories.filter(
    (category) => category.type === type,
  );

  const parentCategories = categoriesForType.filter(
    (category) => !category.parentId,
  );

  const selectedCategory = categoriesForType.find(
    (category) => category.id === value,
  );

  const selectedParent = selectedCategory?.parentId
    ? parentCategories.find(
        (parent) => parent.id === selectedCategory.parentId,
      )
    : selectedCategory;

  const activeParent = parentCategories.find(
    (parent) => parent.id === selectedParentId,
  );

  const children = activeParent
    ? categoriesForType.filter(
        (category) => category.parentId === activeParent.id,
      )
    : [];

  function handleParentClick(parent: Category) {
    const parentChildren = categoriesForType.filter(
      (category) => category.parentId === parent.id,
    );

    if (parentChildren.length === 0) {
      onChange(parent.id);
      setSelectedParentId(null);
      setOpen(false);
      return;
    }

    setSelectedParentId(parent.id);
  }

  function handleChildClick(child: Category) {
    onChange(child.id);
    setSelectedParentId(null);
    setOpen(false);
  }

  function handleBack() {
    setSelectedParentId(null);
  }

  const displayLabel =
    selectedCategory?.parentId && selectedParent
      ? `${selectedParent.categoryName} / ${selectedCategory.categoryName}`
      : selectedCategory?.categoryName ?? '';

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          setSelectedParentId(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id="tx-category"
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-between font-normal transition-colors',
            !displayLabel && 'text-muted-foreground',
          )}
        >
          <span className="truncate">
            {displayLabel ||
              t('transactions.selectCategory')}
          </span>

          <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1"
        align="start"
      >
        {!selectedParentId ? (
          <div className="space-y-1">
            {parentCategories.map((parent) => {
              const hasChildren = categoriesForType.some(
                (category) =>
                  category.parentId === parent.id,
              );

              return (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() =>
                    handleParentClick(parent)
                  }
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
                >
                  <span className="truncate font-medium">
                    {parent.categoryName}
                  </span>

                  {hasChildren && (
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            <button
              type="button"
              onClick={handleBack}
              className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="truncate">
                {activeParent?.categoryName}
              </span>
            </button>

            <div className="border-t pt-1">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() =>
                    handleChildClick(child)
                  }
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  {child.categoryName}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Sub-komponen: Category picker untuk FILTER
// ============================================================================

function CategoryFilterPicker({
  categories,
  type,
  value,
  onChange,
  t,
}: {
  categories: Category[];
  type: TransactionType | 'all';
  value: string;
  onChange: (value: string) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  const categoriesForType =
    type === 'all'
      ? categories
      : categories.filter((category) => category.type === type);

  const parentCategories = categoriesForType.filter(
    (category) => !category.parentId,
  );

  const selectedCategory = categoriesForType.find(
    (category) => category.id === value,
  );

  const selectedParent = selectedCategory?.parentId
    ? parentCategories.find(
        (parent) => parent.id === selectedCategory.parentId,
      )
    : selectedCategory;

  const activeParent = parentCategories.find(
    (parent) => parent.id === selectedParentId,
  );

  const children = activeParent
    ? categoriesForType.filter(
        (category) => category.parentId === activeParent.id,
      )
    : [];

  function handleSelectAll() {
    onChange('all');
    setSelectedParentId(null);
    setOpen(false);
  }

  function handleParentClick(parent: Category) {
    const parentChildren = categoriesForType.filter(
      (category) => category.parentId === parent.id,
    );

    if (parentChildren.length === 0) {
      onChange(parent.id);
      setSelectedParentId(null);
      setOpen(false);
      return;
    }

    setSelectedParentId(parent.id);
  }

  function handleSelectParentDirectly(parent: Category) {
    onChange(parent.id);
    setSelectedParentId(null);
    setOpen(false);
  }

  function handleChildClick(child: Category) {
    onChange(child.id);
    setSelectedParentId(null);
    setOpen(false);
  }

  function handleBack() {
    setSelectedParentId(null);
  }

  const displayLabel =
    value === 'all' || !value
      ? t('transactions.allCategories')
      : selectedCategory?.parentId && selectedParent
        ? `${selectedParent.categoryName} / ${selectedCategory.categoryName}`
        : selectedCategory?.categoryName ?? t('transactions.allCategories');

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSelectedParentId(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-between font-normal transition-colors',
            (value === 'all' || !value) && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        {!selectedParentId ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className={cn(
                'flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-secondary',
                (value === 'all' || !value) && 'bg-secondary',
              )}
            >
              {t('transactions.allCategories')}
            </button>

            <div className="border-t pt-1">
              {parentCategories.map((parent) => {
                const hasChildren = categoriesForType.some(
                  (category) => category.parentId === parent.id,
                );

                return (
                  <button
                    key={parent.id}
                    type="button"
                    onClick={() => handleParentClick(parent)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary',
                      value === parent.id && 'bg-secondary',
                    )}
                  >
                    <span className="truncate font-medium">{parent.categoryName}</span>
                    {hasChildren && (
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <button
              type="button"
              onClick={handleBack}
              className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="truncate">{activeParent?.categoryName}</span>
            </button>

            <div className="border-t pt-1">
              <button
                type="button"
                onClick={() => activeParent && handleSelectParentDirectly(activeParent)}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-left text-sm italic text-muted-foreground transition-colors hover:bg-secondary',
                  value === activeParent?.id && 'bg-secondary',
                )}
              >
                {t('transactions.allCategories')} &middot; {activeParent?.categoryName}
              </button>

              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleChildClick(child)}
                  className={cn(
                    'flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary',
                    value === child.id && 'bg-secondary',
                  )}
                >
                  {child.categoryName}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Sub-komponen: Type picker untuk FILTER
// ============================================================================

function TypeFilterPicker({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (value: string) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);

  const options: { value: string; label: string }[] = [
    { value: 'all', label: t('transactions.allTypes') || 'Semua Jenis' },
    { value: 'INCOME', label: t('transactions.income') },
    { value: 'EXPENSE', label: t('transactions.expense') },
  ];

  const selected = options.find((option) => option.value === value);

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-between font-normal transition-colors',
            value === 'all' && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{selected?.label}</span>
          <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        <div className="space-y-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary',
                value === option.value && 'bg-secondary font-medium',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Sub-komponen: Account picker untuk FILTER
// ============================================================================

function AccountFilterPicker({
  accounts,
  value,
  onChange,
  t,
}: {
  accounts: Account[];
  value: string;
  onChange: (value: string) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);

  const selectedAccount = accounts.find((account) => account.id === value);
  const displayLabel =
    value === 'all' || !value
      ? t('transactions.allAccounts') || 'Semua Akun'
      : selectedAccount?.accountName ?? (t('transactions.allAccounts') || 'Semua Akun');

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-between font-normal transition-colors',
            (value === 'all' || !value) && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => handleSelect('all')}
            className={cn(
              'flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-secondary',
              (value === 'all' || !value) && 'bg-secondary',
            )}
          >
            {t('transactions.allAccounts') || 'Semua Akun'}
          </button>

          <div className="border-t pt-1">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => handleSelect(account.id)}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary',
                  value === account.id && 'bg-secondary',
                )}
              >
                {account.accountName}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Sub-komponen: Account picker untuk FORM tambah/edit
// ============================================================================

function AccountPicker({
  accounts,
  transactionType,
  value,
  onChange,
  t,
}: {
  accounts: Account[];
  transactionType: TransactionType;
  value: string;
  onChange: (value: string) => void;
  t: TFunction;
}) {
  const [open, setOpen] = useState(false);

  const label =
    transactionType === 'INCOME'
      ? t('transactions.accountIncome')
      : t('transactions.accountExpense');

  const selectedAccount = accounts.find((account) => account.id === value);

  function handleSelect(account: Account) {
    if (!account.isActive) return;
    onChange(account.id);
    setOpen(false);
  }

  return (
    <div>
      <Label htmlFor="tx-account">{label}</Label>

      <div className="mt-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="tx-account"
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-between font-normal transition-colors',
                !selectedAccount && 'text-muted-foreground',
              )}
            >
              <span className="truncate">
                {selectedAccount?.accountName || t('transactions.selectAccount')}
              </span>
              <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
            <div className="space-y-1">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  disabled={!account.isActive}
                  onClick={() => handleSelect(account)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary',
                    value === account.id && 'bg-secondary font-medium',
                    !account.isActive && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                  )}
                >
                  <span className="truncate">{account.accountName}</span>
                  {!account.isActive && (
                    <span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">
                      ({t('accounts.inactive')})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

const TYPE_STYLES = {
  income: {
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    amount: 'text-emerald-600 dark:text-emerald-400',
  },
  expense: {
    iconBg: 'bg-rose-500/10 dark:bg-rose-400/10',
    iconText: 'text-rose-600 dark:text-rose-400',
    amount: 'text-rose-600 dark:text-rose-400',
  },
} as const;

const DATE_GROUP_THEME = {
  bg: 'bg-blue-500/5 dark:bg-blue-400/5',
  text: 'text-blue-700 dark:text-blue-400 font-semibold',
  border: 'border-blue-600/30 dark:border-blue-400/30',
} as const;

// ============================================================================
// Sub-komponen: Filter tanggal
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
            className={cn('w-full justify-start gap-2 font-normal transition-colors', !hasRange && 'text-muted-foreground')}
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
  accounts,
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterCategoryChange,
  filterType,
  onFilterTypeChange,
  filterAccount,
  onFilterAccountChange,
  filterStartDate,
  onFilterStartDateChange,
  filterEndDate,
  onFilterEndDateChange,
  hasFilters,
  onClearFilters,
  t,
}: {
  categories: Category[];
  accounts: Account[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterCategory: string;
  onFilterCategoryChange: (v: string) => void;
  filterType: string;
  onFilterTypeChange: (v: string) => void;
  filterAccount: string;
  onFilterAccountChange: (v: string) => void;
  filterStartDate: string;
  onFilterStartDateChange: (v: string) => void;
  filterEndDate: string;
  onFilterEndDateChange: (v: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  t: TFunction;
}) {
  return (
    <Card className={cn(GLASS_CARD, 'mb-6 rounded-xl transition-shadow duration-300 hover:shadow-md')}>
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
            <div className="w-full sm:w-52">
              <Label className="mb-1.5 block text-xs">{t('transactions.category')}</Label>
              <CategoryFilterPicker
                categories={categories}
                type={filterType as TransactionType | 'all'}
                value={filterCategory}
                onChange={onFilterCategoryChange}
                t={t}
              />
            </div>

            <div className="w-full sm:w-36">
              <Label className="mb-1.5 block text-xs">{t('transactions.type')}</Label>
              <TypeFilterPicker
                value={filterType}
                onChange={(v) => {
                  onFilterTypeChange(v);
                  onFilterCategoryChange('all');
                }}
                t={t}
              />
            </div>

            <div className="w-full sm:w-48">
              <Label className="mb-1.5 block text-xs">{t('transactions.account')}</Label>
              <AccountFilterPicker
                accounts={accounts}
                value={filterAccount}
                onChange={onFilterAccountChange}
                t={t}
              />
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
// Sub-komponen: Header kolom tabel (desktop saja)
// ============================================================================

function TransactionTableHeader({ t }: { t: TFunction }) {
  return (
    <div className="hidden grid-cols-[64px_180px_1fr_110px_130px_108px] gap-4 border-b border-border bg-muted/20 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
      <span />
      <span className="truncate overflow-hidden whitespace-nowrap">{t('transactions.category')}</span>
      <span className="truncate overflow-hidden whitespace-nowrap">{t('transactions.description')}</span>
      <span className="truncate overflow-hidden whitespace-nowrap">{t('transactions.uniqueCode')}</span>
      <span className="truncate overflow-hidden whitespace-nowrap text-right">{t('transactions.amount')}</span>
      <span />
    </div>
  );
}

// ============================================================================
// Sub-komponen: Satu baris transaksi (tabel di desktop, kartu ringkas di mobile)
// ----------------------------------------------------------------------------
// PATCH: menambahkan link "Lihat Bukti" (tx.attachmentUrl) di baris desktop
// dan kartu mobile — sebelumnya field ini tidak ditampilkan sama sekali di
// sini, walau datanya sudah tersimpan & dikembalikan oleh API.
// ============================================================================

function TransactionRow({
  tx,
  index,
  canEdit,
  onEdit,
  onDuplicate,
  onDeleteRequest,
  t,
}: {
  tx: Transaction;
  index: number;
  canEdit: boolean;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDeleteRequest: (tx: Transaction) => void;
  t: TFunction;
}) {
  const isIncome = tx.transactionType === 'INCOME';
  const style = isIncome ? TYPE_STYLES.income : TYPE_STYLES.expense;

  const parentName = tx.category.parent?.categoryName ?? tx.category.categoryName;
  const subName = tx.category.parent ? tx.category.categoryName : null;

  const accountName = tx.account?.accountName;

  return (
    <div
      className="group animate-fade-in border-b border-border transition-colors last:border-b-0 hover:bg-secondary/50"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      {/* Desktop: baris tabel */}
      <div className="hidden grid-cols-[64px_180px_1fr_110px_130px_108px] items-center gap-4 px-4 py-3 lg:grid">
        <div className="truncate overflow-hidden whitespace-nowrap text-xs text-muted-foreground">{formatTime(tx.createdAt)}</div>

        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
              style.iconBg,
            )}
          >
            {isIncome ? (
              <ArrowUpCircle className={cn('h-4 w-4', style.iconText)} />
            ) : (
              <ArrowDownCircle className={cn('h-4 w-4', style.iconText)} />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{parentName}</p>
            {subName && (
              <p className="truncate text-xs text-muted-foreground">{subName}</p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm text-foreground">
            {tx.description || t('transactions.noDescription')}
          </p>
        </div>

        <div className="text-xs text-muted-foreground">
          {tx.uniqueCode ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono">
              <Hash className="h-2.5 w-2.5" />
              {tx.uniqueCode}
            </span>
          ) : (
            <span className="text-muted-foreground/50">&mdash;</span>
          )}
        </div>

        <div className="text-right">
          <p className={cn('font-mono text-sm font-bold tabular-nums', style.amount)}>
            {isIncome ? '+' : '-'}
            {formatCurrency(tx.amount)}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {tx.createdBy.name}
            {accountName ? ` \u00b7 ${accountName}` : ''}
          </p>

          {/* PATCH: link bukti transaksi (desktop) */}
          {tx.attachmentUrl && (
            <a
              href={tx.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-blue-600 underline transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={(e) => e.stopPropagation()}
            >
              <Paperclip className="h-2.5 w-2.5" />
              Lihat Bukti
            </a>
          )}
        </div>

        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {canEdit && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tx)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onDuplicate(tx)}
                title={t('transactions.duplicate')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => onDeleteRequest(tx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile & tablet: kartu ringkas */}
      <div className="flex items-start gap-3 p-4 lg:hidden">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
            style.iconBg,
          )}
        >
          {isIncome ? (
            <ArrowUpCircle className={cn('h-5 w-5', style.iconText)} />
          ) : (
            <ArrowDownCircle className={cn('h-5 w-5', style.iconText)} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{parentName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {subName ? `${subName} \u00b7 ${formatTime(tx.createdAt)}` : formatTime(tx.createdAt)}
              </p>
            </div>
            <p
              className={cn(
                'flex-shrink-0 whitespace-nowrap font-mono text-sm font-bold tabular-nums',
                style.amount,
              )}
            >
              {isIncome ? '+' : '-'}
              {formatCurrency(tx.amount)}
            </p>
          </div>

          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            {tx.description || t('transactions.noDescription')}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {tx.uniqueCode && (
              <Badge
                variant="outline"
                className="gap-1 border-border text-[10px] font-mono font-medium text-muted-foreground"
              >
                <Hash className="h-2.5 w-2.5" />
                {tx.uniqueCode}
              </Badge>
            )}

            {accountName && (
              <Badge
                variant="outline"
                className="gap-1 border-border text-[10px] font-medium text-muted-foreground"
              >
                <Wallet className="h-2.5 w-2.5" />
                {accountName}
              </Badge>
            )}

            {/* PATCH: link bukti transaksi (mobile) */}
            {tx.attachmentUrl && (
              <a
                href={tx.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-blue-600 underline dark:text-blue-400"
              >
                <Paperclip className="h-2.5 w-2.5" />
                Lihat Bukti
              </a>
            )}

            <span className="text-[11px] text-muted-foreground">
              {t('transactions.by')} {tx.createdBy.name}
            </span>

            {canEdit && (
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tx)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDuplicate(tx)}
                  title={t('transactions.duplicate')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onDeleteRequest(tx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper: kelompokkan transaksi per tanggal
// ============================================================================

type TransactionDateGroup = {
  dateKey: string;
  date: Date;
  items: Transaction[];
};

function groupTransactionsByDate(transactions: Transaction[]): TransactionDateGroup[] {
  const groups: TransactionDateGroup[] = [];

  for (const tx of transactions) {
    const date = new Date(tx.date);
    const dateKey = toInputDate(date);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.dateKey === dateKey) {
      lastGroup.items.push(tx);
    } else {
      groups.push({ dateKey, date, items: [tx] });
    }
  }

  return groups;
}

function getDateGroupLabel(date: Date, t: TFunction): string {
  const todayKey = toInputDate(new Date());
  const yesterdayKey = toInputDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const dateKey = toInputDate(date);

  if (dateKey === todayKey) return t('transactions.today');
  if (dateKey === yesterdayKey) return t('transactions.yesterday');
  return formatDate(date);
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
  accounts,
  formError,
  saving,
  onSave,
  proofFile,
  proofPreview,
  attachmentUrl,
  uploadingProof,
  onProofChange,
  onRemoveProof,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: TransactionFormData;
  onFormChange: (patch: Partial<TransactionFormData>) => void;
  categories: Category[];
  accounts: Account[];
  formError: string;
  saving: boolean;
  onSave: () => void;
  proofFile: File | null;
  proofPreview: string | null;
  attachmentUrl: string | null;
  uploadingProof: boolean;
  onProofChange: (file: File | null) => void;
  onRemoveProof: () => void;
  t: TFunction;
}) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('transactions.editTransactionTitle')
              : t('transactions.addTransactionTitle')}
          </DialogTitle>

          <DialogDescription>
            {isEditing
              ? t('transactions.editTransactionDesc')
              : t('transactions.addTransactionDesc')}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="animate-fade-in rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
            {formError}
          </div>
        )}

        <div className="space-y-4">
          {/* Toggle tipe */}
          <div>
            <Label>{t('transactions.type')}</Label>

            <div className="mt-1.5 flex gap-2">
              <Button
                type="button"
                variant={
                  form.transactionType === 'INCOME'
                    ? 'default'
                    : 'outline'
                }
                onClick={() =>
                  onFormChange({
                    transactionType: 'INCOME',
                    categoryId: '',
                  })
                }
                className="flex-1 transition-all"
                size="sm"
              >
                <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {t('transactions.income')}
              </Button>

              <Button
                type="button"
                variant={
                  form.transactionType === 'EXPENSE'
                    ? 'default'
                    : 'outline'
                }
                onClick={() =>
                  onFormChange({
                    transactionType: 'EXPENSE',
                    categoryId: '',
                  })
                }
                className="flex-1 transition-all"
                size="sm"
              >
                <ArrowDownCircle className="mr-2 h-4 w-4 text-rose-600 dark:text-rose-400" />
                {t('transactions.expense')}
              </Button>
            </div>
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="tx-date">
              {t('transactions.date')}
            </Label>

            <Input
              id="tx-date"
              type="date"
              value={form.date}
              onChange={(e) =>
                onFormChange({
                  date: e.target.value,
                })
              }
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="tx-category">
              {t('transactions.category')}
            </Label>

            <div className="mt-1.5">
              <CategoryPicker
                categories={categories}
                type={form.transactionType}
                value={form.categoryId}
                onChange={(value) =>
                  onFormChange({
                    categoryId: value,
                  })
                }
                t={t}
              />
            </div>
          </div>

          {/* Account */}
          <AccountPicker
            accounts={accounts}
            transactionType={form.transactionType}
            value={form.accountId}
            onChange={(value) =>
              onFormChange({
                accountId: value,
              })
            }
            t={t}
          />

          {/* Amount */}
          <div>
            <Label htmlFor="tx-amount">
              {t('transactions.amount')}
            </Label>

            <Input
              id="tx-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) =>
                onFormChange({
                  amount: e.target.value,
                })
              }
              className="font-mono tabular-nums"
            />
          </div>

          {/* Unique code */}
          <div>
            <Label htmlFor="tx-unique-code">
              {t('transactions.uniqueCode')}
            </Label>

            <Input
              id="tx-unique-code"
              type="text"
              placeholder={t(
                'transactions.uniqueCodePlaceholder',
              )}
              value={form.uniqueCode}
              onChange={(e) =>
                onFormChange({
                  uniqueCode: e.target.value,
                })
              }
              className="font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="tx-desc">
              {t('transactions.description')}
            </Label>

            <Textarea
              id="tx-desc"
              placeholder={t(
                'transactions.descriptionPlaceholder',
              )}
              value={form.description}
              onChange={(e) =>
                onFormChange({
                  description: e.target.value,
                })
              }
              rows={2}
            />
          </div>

          {/* Bukti Transaksi — dipindah ke dalam space-y-4 supaya spacing
              antar-field konsisten dengan field lain di atasnya */}
          <div>
            <Label>{t('transactions.proof') || 'Bukti Transaksi (Opsional)'}</Label>

            <div className="mt-1.5 space-y-2">
              {!proofFile && !attachmentUrl ? (
                <label
                  htmlFor="tx-proof"
                  className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('transactions.uploadProof') || 'Upload Bukti'}
                  <input
                    id="tx-proof"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      onProofChange(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              ) : (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <div className="flex items-center gap-3">
                    {proofPreview || attachmentUrl ? (
                      <img
                        src={proofPreview || attachmentUrl || ''}
                        alt="Preview bukti transaksi"
                        className="h-16 w-16 rounded-md border object-cover"
                      />
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {proofFile?.name || 'Bukti transaksi'}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {proofFile
                          ? `${(proofFile.size / 1024 / 1024).toFixed(2)} MB`
                          : 'Bukti tersimpan'}
                      </p>
                    </div>

                    {(proofPreview || attachmentUrl) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open(
                            proofPreview || attachmentUrl || '',
                            '_blank',
                            'noopener,noreferrer',
                          )
                        }
                      >
                        Lihat
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onRemoveProof}
                      disabled={uploadingProof}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                JPG atau PNG, maksimal 5 MB.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>

          <Button
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}

            {isEditing
              ? t('transactions.saveChanges')
              : t('transactions.addTransactionAction')}
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
// Sub-komponen: Kontrol pagination
// ============================================================================

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
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
  const {
    user,
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getCategories,
    getAccounts,
    uploadTransactionProof,
  } = useAuth();

  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'STAFF';

  // --- State: filter & search ---
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- State: dialog form tambah/edit ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  function handleProofChange(file: File | null) {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];

    if (!allowedTypes.includes(file.type)) {
      setFormError('Bukti transaksi harus berupa JPG atau PNG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Ukuran bukti transaksi maksimal 5 MB.');
      return;
    }

    setFormError('');
    setProofFile(file);

    const previewUrl = URL.createObjectURL(file);
    setProofPreview(previewUrl);
  }

  function handleRemoveProof() {
    setProofFile(null);
    setProofPreview(null);
    setAttachmentUrl(null);
  }

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
    accountId: filterAccount !== 'all' ? filterAccount : undefined,
    transactionType: filterType !== 'all' ? (filterType as TransactionType) : undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
  };

  const {
    data: transactions = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<Transaction[]>({
    queryKey: ['transactions', filters],
    queryFn: () => getTransactions(filters),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: getAccounts,
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
    setProofFile(null);
    setProofPreview(null);
    setAttachmentUrl(null);
    setDialogOpen(true);
  }

  function openEditDialog(tx: Transaction) {
    setEditingTx(tx);
    setForm({
      date: toInputDate(tx.date),
      categoryId: tx.categoryId,
      accountId: tx.accountId || '',
      description: tx.description || '',
      amount: String(tx.amount),
      transactionType: tx.transactionType,
      uniqueCode: tx.uniqueCode || '',
    });
    setFormError('');
    setProofFile(null);
    setProofPreview(null);
    setAttachmentUrl(tx.attachmentUrl ?? null);
    setDialogOpen(true);
  }

  function openDuplicateDialog(tx: Transaction) {
    setEditingTx(null);

    setForm({
      date: toInputDate(new Date()),
      categoryId: tx.categoryId,
      accountId: tx.accountId || '',
      description: tx.description || '',
      amount: String(tx.amount),
      transactionType: tx.transactionType,
      uniqueCode: '',
    });

    setFormError('');

    setProofFile(null);
    setProofPreview(null);
    setAttachmentUrl(null);

    setDialogOpen(true);
  }

  async function handleSave() {
    setFormError('');

    const amount = parseFloat(form.amount);

    if (!form.categoryId) {
      setFormError(t('transactions.categoryRequired'));
      return;
    }

    if (!form.accountId) {
      setFormError(t('transactions.accountRequired'));
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      setFormError(t('transactions.amountInvalid'));
      return;
    }

    try {
      let finalAttachmentUrl = attachmentUrl;

      // Kalau user memilih file baru, upload dulu ke Cloudinary
      if (proofFile) {
        setUploadingProof(true);

        try {
          const result = await uploadTransactionProof(proofFile);
          finalAttachmentUrl = result.url;
        } finally {
          setUploadingProof(false);
        }
      }

      const payload = {
        date: form.date,
        categoryId: form.categoryId,
        accountId: form.accountId,
        description: form.description || null,
        amount,
        transactionType: form.transactionType,
        uniqueCode: form.uniqueCode || null,
        attachmentUrl: finalAttachmentUrl,
      };

      if (editingTx) {
        await updateMutation.mutateAsync({
          id: editingTx.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }

      setDialogOpen(false);
      setProofFile(null);
      setProofPreview(null);
      setAttachmentUrl(null);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('transactions.saveFailed'),
      );
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
    setFilterAccount('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  }

  const hasFilters =
    filterCategory !== 'all' ||
    filterType !== 'all' ||
    filterAccount !== 'all' ||
    !!filterStartDate ||
    !!filterEndDate;

  const filteredTransactions = searchQuery
    ? transactions.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.category.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.uniqueCode?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : transactions;

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE,
  );

  const groupedTransactions = groupTransactionsByDate(paginatedTransactions);

  const rangeStart = filteredTransactions.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredTransactions.length);

  function handleFilterChange(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setCurrentPage(1);
    };
  }

  // --- Render ---
  return (
    <div className="relative isolate p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageBackground />

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
        accounts={accounts}
        searchQuery={searchQuery}
        onSearchChange={handleFilterChange(setSearchQuery)}
        filterCategory={filterCategory}
        onFilterCategoryChange={handleFilterChange(setFilterCategory)}
        filterType={filterType}
        onFilterTypeChange={handleFilterChange(setFilterType)}
        filterAccount={filterAccount}
        onFilterAccountChange={handleFilterChange(setFilterAccount)}
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
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className={cn(GLASS_CARD, 'animate-fade-in rounded-xl')}>
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
          <p className="mb-2 text-xs text-muted-foreground">
            {t('transactions.showingRange', {
              start: rangeStart,
              end: rangeEnd,
              total: filteredTransactions.length,
            })}
          </p>

          <Card className={cn(GLASS_CARD, 'overflow-hidden rounded-xl')}>
            <TransactionTableHeader t={t} />
            <div>
              {groupedTransactions.map((group, groupIndex) => (
                <div
                  key={group.dateKey}
                  className={cn(
                    'border-l-4',
                    DATE_GROUP_THEME.border,
                    groupIndex !== 0 && 'border-t-2',
                  )}
                >
                  <div
                    className={cn(
                      'px-4 py-2 text-xs font-semibold',
                      DATE_GROUP_THEME.bg,
                      DATE_GROUP_THEME.text,
                    )}
                  >
                    {getDateGroupLabel(group.date, t)}
                  </div>

                  {group.items.map((tx, i) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      index={i}
                      canEdit={canEdit}
                      onEdit={openEditDialog}
                      onDuplicate={openDuplicateDialog}
                      onDeleteRequest={setDeleteTarget}
                      t={t}
                    />
                  ))}
                </div>
              ))}
            </div>
          </Card>

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
        accounts={accounts}
        formError={formError}
        saving={saving}
        onSave={handleSave}
        proofFile={proofFile}
        proofPreview={proofPreview}
        attachmentUrl={attachmentUrl}
        uploadingProof={uploadingProof}
        onProofChange={handleProofChange}
        onRemoveProof={handleRemoveProof}
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