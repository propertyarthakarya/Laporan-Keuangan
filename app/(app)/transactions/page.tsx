'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
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
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency, formatDate, toInputDate } from '@/lib/format';
import type { Transaction, Category, TransactionType } from '@/lib/types';
import { Plus, Pencil, Trash2, CircleArrowUp as ArrowUpCircle, CircleArrowDown as ArrowDownCircle, Filter, X, Loader as Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TransactionsPage() {
  const { user, getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formDate, setFormDate] = useState(toInputDate(new Date()));
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState<TransactionType>('INCOME');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [txs, cats] = await Promise.all([
        getTransactions({
          categoryId: filterCategory !== 'all' ? filterCategory : undefined,
          transactionType: filterType !== 'all' ? (filterType as TransactionType) : undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
        }),
        getCategories(),
      ]);
      setTransactions(txs);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [getTransactions, getCategories, filterCategory, filterType, filterStartDate, filterEndDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditingTx(null);
    setFormDate(toInputDate(new Date()));
    setFormCategory('');
    setFormType('INCOME');
    setFormAmount('');
    setFormDescription('');
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    setFormDate(toInputDate(tx.date));
    setFormCategory(tx.categoryId);
    setFormType(tx.transactionType);
    setFormAmount(String(tx.amount));
    setFormDescription(tx.description || '');
    setFormError('');
    setDialogOpen(true);
  }

  async function handleSave() {
    setFormError('');
    setSaving(true);
    try {
      const amount = parseFloat(formAmount);
      if (!formCategory) {
        setFormError('Please select a category.');
        setSaving(false);
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        setFormError('Please enter a valid amount greater than zero.');
        setSaving(false);
        return;
      }

      const data = {
        date: formDate,
        categoryId: formCategory,
        description: formDescription || null,
        amount,
        transactionType: formType,
      };

      if (editingTx) {
        await updateTransaction(editingTx.id, data);
      } else {
        await createTransaction(data);
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteTransaction(deleteTarget.id);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete transaction.');
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setFilterCategory('all');
    setFilterType('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchQuery('');
  }

  const hasFilters = filterCategory !== 'all' || filterType !== 'all' || filterStartDate || filterEndDate;

  const filteredTx = searchQuery
    ? transactions.filter(
        (t) =>
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.categoryName.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : transactions;

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <PageHeader title="Transactions" description="View, add, and manage financial transactions">
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </PageHeader>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
            <div className="flex-1">
              <Label className="mb-1.5 block text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full lg:w-48">
              <Label className="mb-1.5 block text-xs">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-36">
              <Label className="mb-1.5 block text-xs">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-40">
              <Label className="mb-1.5 block text-xs">From date</Label>
              <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
            </div>
            <div className="w-full lg:w-40">
              <Label className="mb-1.5 block text-xs">To date</Label>
              <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="lg:mb-0.5">
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      )}

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredTx.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Filter className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">No transactions found</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {hasFilters ? 'Try adjusting your filters' : 'Add a transaction to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTx.map((tx) => (
            <Card
              key={tx.id}
              className="animate-fade-in"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
                    tx.transactionType === 'INCOME' ? 'bg-secondary' : 'bg-foreground/5',
                  )}
                >
                  {tx.transactionType === 'INCOME' ? (
                    <ArrowUpCircle className="h-5 w-5 text-foreground" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{tx.category.categoryName}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        'flex-shrink-0 text-[10px] font-bold',
                        tx.transactionType === 'INCOME'
                          ? 'border-foreground text-foreground'
                          : 'border-muted-foreground text-muted-foreground',
                      )}
                    >
                      {tx.transactionType}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {tx.description || 'No description'} &middot; {formatDate(tx.date)} &middot; by {tx.createdBy.name}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p
                    className={cn(
                      'text-sm font-bold',
                      tx.transactionType === 'INCOME' ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {tx.transactionType === 'INCOME' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </p>
                </div>

                {canEdit && (
                  <div className="flex flex-shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tx)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setDeleteTarget(tx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTx ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
            <DialogDescription>
              {editingTx ? 'Update the transaction details below' : 'Enter the details for the new transaction'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <div className="mt-1.5 flex gap-2">
                <Button
                  type="button"
                  variant={formType === 'INCOME' ? 'default' : 'outline'}
                  onClick={() => {
                    setFormType('INCOME');
                    setFormCategory('');
                  }}
                  className="flex-1"
                  size="sm"
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Income
                </Button>
                <Button
                  type="button"
                  variant={formType === 'EXPENSE' ? 'default' : 'outline'}
                  onClick={() => {
                    setFormType('EXPENSE');
                    setFormCategory('');
                  }}
                  className="flex-1"
                  size="sm"
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Expense
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="tx-category">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger id="tx-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.type === formType)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.categoryName}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="tx-desc">Description (optional)</Label>
              <Textarea
                id="tx-desc"
                placeholder="Add a note about this transaction..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingTx ? 'Save changes' : 'Add transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteTarget?.category.categoryName} transaction of{' '}
              {deleteTarget ? formatCurrency(deleteTarget.amount) : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
