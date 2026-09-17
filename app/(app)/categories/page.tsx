'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import type { Category, TransactionType } from '@/lib/types';
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Tags,
  CircleArrowUp as ArrowUpCircle,
  CircleArrowDown as ArrowDownCircle,
  Loader as Loader2,
  ChevronRight,
  TriangleAlert as AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryKind = 'main' | 'sub';

/* ------------------------------------------------------------------ */
/*  Tone tokens — emerald untuk income, rose untuk expense, senada     */
/*  dengan halaman Laporan supaya konsisten di seluruh aplikasi.       */
/* ------------------------------------------------------------------ */

const tone = {
  income: {
    chip: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    ring: 'ring-emerald-500/10',
  },
  expense: {
    chip: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
    ring: 'ring-rose-500/10',
  },
} as const;

// Grid kategori utama: dibatasi maksimal 2 kolom (tidak ikut ke 3 seperti
// subkategori) karena kartunya lebih besar/detail dan 2 kolom lebih nyaman dibaca.
const CATEGORY_GRID = 'grid grid-cols-1 gap-2.5 sm:grid-cols-2';

// Grid subkategori: dibatasi maksimal 2 kolom, sama seperti kategori utama.
const SUB_CATEGORY_GRID = 'grid grid-cols-1 gap-2 sm:grid-cols-2';

function SectionHeader({
  icon,
  label,
  count,
  kind,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  kind: 'income' | 'expense';
}) {
  const t = tone[kind];
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl', t.chip)}>
        {icon}
      </div>
      <h2 className="text-sm font-semibold">{label}</h2>
      <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold tabular-nums', t.badge)}>
        {count}
      </span>
    </div>
  );
}

export default function CategoriesPage() {
  const {
    user,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useAuth();

  const { t } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [formError, setFormError] = useState('');

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<TransactionType>('INCOME');

  const [formParentId, setFormParentId] = useState<string>('none');

  // Menentukan apakah user sedang membuat kategori utama atau subkategori
  const [categoryKind, setCategoryKind] = useState<CategoryKind>('main');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(
        variables.parentId
          ? `Subkategori "${variables.categoryName}" berhasil ditambahkan.`
          : `Kategori "${variables.categoryName}" berhasil ditambahkan.`,
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('categories.saveFailed'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        categoryName: string;
        type: TransactionType;
        parentId: string | null;
      };
    }) => updateCategory(id, data),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(
        `Kategori "${variables.data.categoryName}" berhasil diperbarui.`,
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('categories.saveFailed'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(
        deleteTarget
          ? `"${deleteTarget.categoryName}" berhasil dihapus.`
          : 'Kategori berhasil dihapus.',
      );
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : t('categories.deleteFailed'),
      );
    },
  });

  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  /*
   * Backend mengembalikan categories dengan children.
   * Tetapi untuk keamanan frontend, kita tetap membuat
   * fallback jika children belum tersedia.
   */
  const normalizedCategories = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      children: category.children ?? [],
    }));
  }, [categories]);

  const incomeCats = normalizedCategories.filter(
    (category) => category.type === 'INCOME' && !category.parentId,
  );

  const expenseCats = normalizedCategories.filter(
    (category) => category.type === 'EXPENSE' && !category.parentId,
  );

  /*
   * Semua kategori utama (kandidat parent), tanpa filter tipe.
   */
  const parentCategories = normalizedCategories.filter(
    (category) => !category.parentId,
  );

  // Kandidat parent yang valid dipilih di form saat ini (exclude diri sendiri saat edit),
  // belum difilter berdasarkan Type.
  const parentCandidates = parentCategories.filter(
    (category) => category.id !== editing?.id,
  );

  // Dipakai untuk enable/disable toggle "Subkategori": apakah ada kategori utama
  // sama sekali (tanpa peduli tipe), karena Type mungkin belum dipilih user.
  const anyParentAvailable = parentCandidates.length > 0;

  // Daftar parent yang benar-benar bisa dipilih di dropdown, difilter sesuai
  // Type yang sedang aktif di form (Income -> induk Income saja, dst).
  const selectableParents = parentCandidates.filter(
    (category) => category.type === formType,
  );

  const noParentForType = selectableParents.length === 0;

  function toggleExpanded(id: string) {
    setExpanded((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function openCreate(presetType?: TransactionType, parentId?: string) {
    setEditing(null);
    setFormName('');

    const selectedParent = parentId
      ? normalizedCategories.find((category) => category.id === parentId)
      : null;

    setFormType(selectedParent?.type ?? presetType ?? 'INCOME');

    setFormParentId(parentId ?? 'none');
    setCategoryKind(parentId ? 'sub' : 'main');
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setFormName(cat.categoryName);
    setFormType(cat.type);
    setFormParentId(cat.parentId ?? 'none');
    setCategoryKind(cat.parentId ? 'sub' : 'main');
    setFormError('');
    setDialogOpen(true);
  }

  // Duplikat kategori: buka dialog "tambah baru" (bukan edit) yang sudah
  // ter-prefill dari kategori yang di-duplikat — tipe & induk (kalau ada)
  // ikut disalin, nama diberi akhiran " (Salinan)" supaya jelas ini kategori
  // baru dan tidak bentrok nama dengan yang asli. `editing` sengaja tetap
  // null supaya submit-nya jadi CREATE, bukan UPDATE — kategori asli tidak
  // tersentuh sama sekali.
  function openDuplicate(cat: Category) {
    setEditing(null);
    setFormName(`${cat.categoryName} (Salinan)`);
    setFormType(cat.type);
    setFormParentId(cat.parentId ?? 'none');
    setCategoryKind(cat.parentId ? 'sub' : 'main');
    setFormError('');
    setDialogOpen(true);
  }

  function handleKindChange(kind: CategoryKind) {
    if (kind === 'sub' && !anyParentAvailable) {
      return;
    }

    setCategoryKind(kind);

    if (kind === 'main') {
      setFormParentId('none');
    }
  }

  function handleTypeChange(value: TransactionType) {
    setFormType(value);

    // Kategori induk yang sudah terpilih bisa jadi sudah tidak sesuai
    // dengan Type yang baru, jadi minta user pilih ulang.
    if (categoryKind === 'sub') {
      setFormParentId('none');
    }
  }

  function handleParentChange(value: string) {
    setFormParentId(value);
  }

  async function handleSave() {
    setFormError('');

    if (!formName.trim()) {
      setFormError(t('categories.nameRequired'));
      return;
    }

    if (categoryKind === 'sub' && formParentId === 'none') {
      setFormError('Pilih kategori induk terlebih dahulu.');
      return;
    }

    const parentId =
      categoryKind === 'main' || formParentId === 'none'
        ? null
        : formParentId;

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            categoryName: formName.trim(),
            type: formType,
            parentId,
          },
        });
      } else {
        await createMutation.mutateAsync({
          categoryName: formName.trim(),
          type: formType,
          parentId,
        });
      }

      setDialogOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t('categories.saveFailed'),
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t('categories.deleteFailed'),
      );
    }
  }

  if (user && user.role !== 'ADMIN') {
    return null;
  }

  /*
   * Menampilkan subkategori.
   */
  function renderChildren(cat: Category) {
    const children = cat.children ?? [];

    if (!expanded[cat.id] || children.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 ml-5 border-l-2 border-border pl-3 sm:ml-9">
        <div className={SUB_CATEGORY_GRID}>
          {children.map((child) => {
            const kind = child.type === 'INCOME' ? 'income' : 'expense';
            const childTone = tone[kind];
            return (
              <Card key={child.id} className="border-border/60 transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-3.5">
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                      childTone.chip,
                    )}
                  >
                    {child.type === 'INCOME' ? (
                      <ArrowUpCircle className={cn('h-4 w-4', childTone.text)} />
                    ) : (
                      <ArrowDownCircle className={cn('h-4 w-4', childTone.text)} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {child.categoryName}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Duplikat subkategori"
                      aria-label={`Duplikat subkategori ${child.categoryName}`}
                      onClick={() => openDuplicate(child)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Edit subkategori"
                      aria-label={`Edit subkategori ${child.categoryName}`}
                      onClick={() => openEdit(child)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Hapus subkategori"
                      aria-label={`Hapus subkategori ${child.categoryName}`}
                      onClick={() => setDeleteTarget(child)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  /*
   * Card kategori utama.
   *
   * Catatan: badge tipe (Pemasukan/Pengeluaran) sengaja tidak ditampilkan lagi
   * di sini karena kartu ini sudah berada di bawah section "Pemasukan" atau
   * "Pengeluaran" — menampilkannya lagi cuma mengulang info yang sama dan
   * bikin kartu terasa ramai tanpa manfaat tambahan.
   */
  function renderCategory(cat: Category) {
    const children = cat.children ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = !!expanded[cat.id];
    const kind = cat.type === 'INCOME' ? 'income' : 'expense';
    const catTone = tone[kind];

    return (
      <div key={cat.id}>
        <Card className={cn('group border-border/60 shadow-sm ring-1 transition-all hover:shadow-md', catTone.ring)}>
          <CardContent className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-4">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 rounded-full"
                onClick={() => toggleExpanded(cat.id)}
                aria-label={
                  isExpanded ? 'Collapse category' : 'Expand category'
                }
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isExpanded && 'rotate-90',
                  )}
                />
              </Button>
            ) : (
              <div className="w-8 flex-shrink-0" />
            )}

            <div
              className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10',
                catTone.chip,
              )}
            >
              {cat.type === 'INCOME' ? (
                <ArrowUpCircle className={cn('h-4 w-4 sm:h-5 sm:w-5', catTone.text)} />
              ) : (
                <ArrowDownCircle className={cn('h-4 w-4 sm:h-5 sm:w-5', catTone.text)} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">
                  {cat.categoryName}
                </p>

                {hasChildren && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {children.length} sub
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 sm:gap-1">
              {/* Tambah subkategori */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Tambah subkategori"
                aria-label={`Tambah subkategori untuk ${cat.categoryName}`}
                onClick={() => openCreate(cat.type, cat.id)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>

              {/* Duplikat */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Duplikat kategori"
                aria-label={`Duplikat kategori ${cat.categoryName}`}
                onClick={() => openDuplicate(cat)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>

              {/* Edit */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Edit kategori"
                aria-label={`Edit kategori ${cat.categoryName}`}
                onClick={() => openEdit(cat)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Hapus kategori"
                aria-label={`Hapus kategori ${cat.categoryName}`}
                onClick={() => setDeleteTarget(cat)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {renderChildren(cat)}
      </div>
    );
  }

  function EmptyState({
    kind,
    onAdd,
  }: {
    kind: 'income' | 'expense';
    onAdd: () => void;
  }) {
    const emptyTone = tone[kind];
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', emptyTone.chip)}>
            <Tags className={cn('h-5 w-5', emptyTone.text)} />
          </div>

          <p className="text-sm text-muted-foreground">
            {kind === 'income'
              ? t('categories.noIncomeCategories')
              : t('categories.noExpenseCategories')}
          </p>

          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('categories.addCategory')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={t('categories.title')}
        description={t('categories.subtitle')}
      >
        <Button onClick={() => openCreate()} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('categories.addCategory')}
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-8">
          <div>
            <Skeleton className="mb-3 h-8 w-40 rounded-xl" />

            <div className={CATEGORY_GRID}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] rounded-xl sm:h-[76px]" />
              ))}
            </div>
          </div>

          <div>
            <Skeleton className="mb-3 h-8 w-40 rounded-xl" />

            <div className={CATEGORY_GRID}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] rounded-xl sm:h-[76px]" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* INCOME */}
          <section>
            <SectionHeader
              icon={<ArrowUpCircle className={cn('h-4 w-4', tone.income.text)} />}
              label={t('categories.incomeCategories')}
              count={incomeCats.length}
              kind="income"
            />

            {incomeCats.length === 0 ? (
              <EmptyState
                kind="income"
                onAdd={() => openCreate('INCOME')}
              />
            ) : (
              <div className={CATEGORY_GRID}>
                {incomeCats.map(renderCategory)}
              </div>
            )}
          </section>

          {/* EXPENSE */}
          <section>
            <SectionHeader
              icon={<ArrowDownCircle className={cn('h-4 w-4', tone.expense.text)} />}
              label={t('categories.expenseCategories')}
              count={expenseCats.length}
              kind="expense"
            />

            {expenseCats.length === 0 ? (
              <EmptyState
                kind="expense"
                onAdd={() => openCreate('EXPENSE')}
              />
            ) : (
              <div className={CATEGORY_GRID}>
                {expenseCats.map(renderCategory)}
              </div>
            )}
          </section>
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('categories.editCategoryTitle')
                : t('categories.addCategoryTitle')}
            </DialogTitle>

            <DialogDescription>
              {editing
                ? t('categories.editCategoryDesc')
                : t('categories.addCategoryDesc')}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* NAME */}
            <div>
              <Label htmlFor="cat-name">
                {t('categories.categoryName')}
              </Label>

              <Input
                id="cat-name"
                placeholder={t('categories.categoryNamePlaceholder')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
                className="mt-1.5"
              />
            </div>

            {/* KIND TOGGLE: Kategori Utama vs Subkategori */}
            <div>
              <Label>Buat Sebagai</Label>

              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleKindChange('main')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all',
                    categoryKind === 'main'
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-secondary',
                  )}
                >
                  <Tags className="h-5 w-5" />
                  Kategori Utama
                </button>

                <button
                  type="button"
                  onClick={() => handleKindChange('sub')}
                  disabled={!anyParentAvailable}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all',
                    categoryKind === 'sub'
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-secondary',
                    !anyParentAvailable &&
                      'cursor-not-allowed opacity-50',
                  )}
                >
                  <ChevronRight className="h-5 w-5" />
                  Subkategori
                </button>
              </div>

              <p className="mt-1.5 text-xs text-muted-foreground">
                {categoryKind === 'main'
                  ? 'Kategori ini akan berdiri sendiri, tanpa induk.'
                  : !anyParentAvailable
                    ? 'Buat kategori utama dulu sebelum menambahkan subkategori.'
                    : 'Akan menjadi bagian dari kategori induk yang dipilih.'}
              </p>
            </div>

            {/* TYPE — dipilih duluan, ini yang menentukan filter kategori induk di bawah */}
            <div>
              <Label>{t('categories.type')}</Label>

              <Select
                value={formType}
                onValueChange={(value) =>
                  handleTypeChange(value as TransactionType)
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="INCOME">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                      {t('categories.income')}
                    </span>
                  </SelectItem>

                  <SelectItem value="EXPENSE">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-rose-500" />
                      {t('categories.expense')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PARENT + LIVE PREVIEW — hanya untuk Subkategori, otomatis terfilter sesuai Type */}
            {categoryKind === 'sub' && (
              <div>
                <Label>Kategori Induk</Label>

                {noParentForType ? (
                  <div className="mt-1.5 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                    Belum ada kategori utama bertipe{' '}
                    {formType === 'INCOME'
                      ? t('categories.income')
                      : t('categories.expense')}
                    . Buat kategori utama dengan tipe ini terlebih dahulu.
                  </div>
                ) : (
                  <Select
                    value={formParentId}
                    onValueChange={handleParentChange}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Pilih kategori induk" />
                    </SelectTrigger>

                    <SelectContent>
                      {selectableParents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                'h-2 w-2 flex-shrink-0 rounded-full',
                                parent.type === 'INCOME'
                                  ? 'bg-emerald-500'
                                  : 'bg-rose-500',
                              )}
                            />
                            {parent.categoryName}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Preview breadcrumb: muncul begitu parent sudah dipilih */}
                {formParentId !== 'none' && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs">
                    <Tags className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {
                        parentCategories.find(
                          (p) => p.id === formParentId,
                        )?.categoryName
                      }
                    </span>
                    <ChevronRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                    <span className="font-medium">
                      {formName.trim() || 'Nama kategori baru'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              {t('common.cancel')}
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              {editing
                ? t('categories.saveChanges')
                : t('categories.addCategoryAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('categories.deleteTitle')}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {t('categories.deleteDesc', {
                name: deleteTarget?.categoryName ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteTarget &&
            (deleteTarget.children?.length ?? 0) > 0 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  <span className="font-medium">Perhatian:</span> kategori ini
                  masih punya {deleteTarget.children?.length} subkategori.
                  Menghapusnya akan ikut menghapus semua subkategori di
                  dalamnya.
                </span>
              </div>
            )}

          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">
              {t('common.cancel')}
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}