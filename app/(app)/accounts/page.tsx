'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  AlertTriangle,
  X,
  Loader as Loader2,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { apiClient } from '@/lib/api-client';
import { Account } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AccountAvatar } from '@/lib/account-logos';
import { Button } from '@/components/ui/button';

type AccountForm = {
  accountName: string;
  initialBalance: string;
};

// Class glass yang dipakai berulang — samain persis sama card di dashboard
// (bg-white/60 + blur di light mode, bg-white/[0.05] di dark mode).
const GLASS_CARD =
  'border-white/60 bg-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] [backdrop-filter:blur(20px)_saturate(150%)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4)]';

export default function AccountsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Modal konfirmasi hapus — ganti window.confirm() bawaan browser dengan
  // popup custom yang senada dengan desain glass di halaman ini.
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<AccountForm>({
    accountName: '',
    initialBalance: '',
  });

  const isAdmin = user?.role === 'ADMIN';

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.getAccounts();

      setAccounts(response || []);
    } catch (err: any) {
      setError(err?.message || t('accounts.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAccounts();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setForm({
      accountName: '',
      initialBalance: '',
    });

    setEditingAccount(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingAccount(null);

    setForm({
      accountName: '',
      initialBalance: '',
    });

    setShowForm(true);
  };

  const openEditForm = (account: Account) => {
    setEditingAccount(account);

    setForm({
      accountName: account.accountName,
      initialBalance: String(account.initialBalance),
    });

    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const accountName = form.accountName.trim();
    const initialBalance = Number(form.initialBalance);

    if (!accountName) {
      setError(t('accounts.nameRequired'));
      return;
    }

    if (Number.isNaN(initialBalance) || initialBalance < 0) {
      setError(t('accounts.balanceInvalid'));
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        accountName,
        initialBalance,
      };

      if (editingAccount) {
        await apiClient.updateAccount(editingAccount.id, payload);
      } else {
        await apiClient.createAccount(payload);
      }

      resetForm();
      await loadAccounts();
    } catch (err: any) {
      setError(err?.message || t('accounts.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (account: Account) => {
    try {
      setError('');

      await apiClient.updateAccountStatus(account.id, !account.isActive);

      await loadAccounts();
    } catch (err: any) {
      setError(err?.message || t('accounts.statusFailed'));
    }
  };

  const openDeleteConfirm = (account: Account) => {
    setError('');
    setAccountToDelete(account);
  };

  const closeDeleteConfirm = () => {
    if (deleting) return; // jangan bisa ditutup di tengah proses hapus
    setAccountToDelete(null);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    try {
      setDeleting(true);
      setError('');

      await apiClient.deleteAccount(accountToDelete.id);

      setAccountToDelete(null);
      await loadAccounts();
    } catch (err: any) {
      setError(err?.message || t('accounts.deleteFailed'));
      setAccountToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-300/40 bg-red-500/10 p-5 text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
          {t('accounts.noAccessTitle')}
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-400/10">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {t('accounts.title')}
              </h1>

              <p className="text-sm text-muted-foreground">
                {t('accounts.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
        >
          <Plus className="h-4 w-4" />
          {t('accounts.addAccount')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className={cn('rounded-xl border p-6', GLASS_CARD)}>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">
              {editingAccount ? t('accounts.editAccountTitle') : t('accounts.addAccountTitle')}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t('accounts.addAccountDesc')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('accounts.accountName')}
                </label>

                <input
                  type="text"
                  value={form.accountName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      accountName: e.target.value,
                    }))
                  }
                  placeholder={t('accounts.accountNamePlaceholder')}
                  className="w-full rounded-lg border border-border bg-white/50 px-3 py-2.5 text-sm text-foreground outline-none backdrop-blur-xl transition placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-white/[0.03]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {t('accounts.initialBalance')}
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.initialBalance}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      initialBalance: e.target.value,
                    }))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-white/50 px-3 py-2.5 text-sm text-foreground outline-none backdrop-blur-xl transition placeholder:text-muted-foreground focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-white/[0.03]"
                />

                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t('accounts.initialBalanceHint')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary dark:hover:bg-white/[0.05]"
              >
                {t('common.cancel')}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                {saving
                  ? t('accounts.saving')
                  : editingAccount
                    ? t('accounts.saveChanges')
                    : t('accounts.addAccountAction')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Accounts */}
      {loading ? (
        <div className={cn('rounded-xl border p-10 text-center text-sm text-muted-foreground', GLASS_CARD)}>
          {t('accounts.loadingAccounts')}
        </div>
      ) : accounts.length === 0 ? (
        <div className={cn('rounded-xl border border-dashed p-10 text-center', GLASS_CARD)}>
          <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />

          <h3 className="font-medium text-foreground">
            {t('accounts.noAccounts')}
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {t('accounts.noAccountsDesc')}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={cn(
                'group relative overflow-hidden rounded-lg border p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
                GLASS_CARD,
                !account.isActive && 'opacity-60',
              )}
            >
              {/* Highlight tipis di tepi atas, samain kayak card dashboard */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/25" />

              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* Logo bank asli kalau nama akun cocok (BCA/Mandiri/BRI/BNI/BTN/CIMB/Bank
                      Papua); fallback ke ikon dompet/bank generik untuk akun lain (mis. Kas). */}
                  <AccountAvatar
                    accountName={account.accountName}
                    boxClassName="h-10 w-10 flex-shrink-0"
                    iconClassName="h-5 w-5"
                  />

                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {account.accountName}
                  </h3>
                </div>

                <span
                  className={cn(
                    'flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                    account.isActive
                      ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400'
                      : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {account.isActive ? t('accounts.active') : t('accounts.inactive')}
                </span>
              </div>

              <div className="mt-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t('accounts.initialBalance')}
                  </span>

                  <span className="text-xs font-medium text-foreground">
                    {formatCurrency(account.initialBalance)}
                  </span>
                </div>

                <div className="border-t border-border pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t('accounts.currentBalance')}
                    </span>

                    <span
                    className={cn(
                        'text-sm font-bold',
                        account.currentBalance < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400',
                    )}
                    >
                    {formatCurrency(account.currentBalance)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-shrink-0 items-center justify-end gap-0.5 border-t border-border pt-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={t('common.edit')}
                  aria-label={`${t('common.edit')} ${account.accountName}`}
                  onClick={() => openEditForm(account)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={account.isActive ? t('accounts.deactivate') : t('accounts.activate')}
                  aria-label={`${account.isActive ? t('accounts.deactivate') : t('accounts.activate')} ${account.accountName}`}
                  onClick={() => handleToggleStatus(account)}
                >
                  {account.isActive ? (
                    <PowerOff className="h-3.5 w-3.5" />
                  ) : (
                    <Power className="h-3.5 w-3.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title={t('common.delete')}
                  aria-label={`${t('common.delete')} ${account.accountName}`}
                  onClick={() => openDeleteConfirm(account)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal konfirmasi hapus akun */}
      {accountToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={closeDeleteConfirm}
          />

          {/* Card modal */}
          <div
            className={cn(
              'relative z-10 mx-auto w-full max-w-sm overflow-hidden rounded-2xl border p-6 shadow-2xl animate-fade-in',
              'border-white/60 bg-white backdrop-blur-xl backdrop-saturate-150',
              'dark:border-white/10 dark:bg-neutral-900',
            )}
          >
            <button
              type="button"
              onClick={closeDeleteConfirm}
              disabled={deleting}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40 dark:hover:bg-white/[0.08]"
              aria-label={t('common.cancel')}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 dark:bg-red-400/10">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>

            <h2 id="delete-account-title" className="mt-4 text-lg font-semibold text-foreground">
              Hapus Akun
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {t('accounts.deleteConfirm').replace('{{name}}', accountToDelete.accountName)}
            </p>

            <p className="mt-3 rounded-lg bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:bg-red-400/5 dark:text-red-400">
              Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={closeDeleteConfirm}
                disabled={deleting}
              >
                {t('common.cancel')}
              </Button>

              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
                className="gap-2"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? 'Menghapus...' : t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}