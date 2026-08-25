'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Category, TransactionType } from '@/lib/types';
import {
  Plus,
  Pencil,
  Trash2,
  Tags,
  ArrowUpCircle,
  ArrowDownCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CategoriesPage() {
  const { user, getCategories, createCategory, updateCategory, deleteCategory } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<TransactionType>('INCOME');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, [getCategories]);

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [user, load]);

  function openCreate() {
    setEditing(null);
    setFormName('');
    setFormType('INCOME');
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
      setFormError('Category name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { categoryName: formName.trim(), type: formType });
      } else {
        await createCategory({ categoryName: formName.trim(), type: formType });
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete category.');
    } finally {
      setSaving(false);
    }
  }

  if (user && user.role !== 'ADMIN') return null;

  const incomeCats = categories.filter((c) => c.type === 'INCOME');
  const expenseCats = categories.filter((c) => c.type === 'EXPENSE');

  const CategoryCard = ({ cat }: { cat: Category }) => (
    <Card className="overflow-hidden transition-all hover:shadow-md animate-fade-in">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
            cat.type === 'INCOME' ? 'bg-success/10' : 'bg-destructive/10',
          )}
        >
          {cat.type === 'INCOME' ? (
            <ArrowUpCircle className="h-5 w-5 text-success" />
          ) : (
            <ArrowDownCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{cat.categoryName}</p>
          <Badge
            variant="outline"
            className={cn(
              'mt-0.5 text-[10px]',
              cat.type === 'INCOME' ? 'border-success/30 text-success' : 'border-destructive/30 text-destructive',
            )}
          >
            {cat.type}
          </Badge>
        </div>
        <div className="flex flex-shrink-0 gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteTarget(cat)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <PageHeader title="Categories" description="Manage income and expense categories">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ArrowUpCircle className="h-4 w-4 text-success" />
              Income Categories
              <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs">{incomeCats.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {incomeCats.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} />
              ))}
              {incomeCats.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    <Tags className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    No income categories yet
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ArrowDownCircle className="h-4 w-4 text-destructive" />
              Expense Categories
              <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs">{expenseCats.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {expenseCats.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} />
              ))}
              {expenseCats.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    <Tags className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    No expense categories yet
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the category details' : 'Create a new transaction category'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="cat-name">Category Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Sales, Salaries, Rent"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as TransactionType)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Income</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? 'Save changes' : 'Add category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{deleteTarget?.categoryName}" category. If any transactions
              use this category, you will need to reassign them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
