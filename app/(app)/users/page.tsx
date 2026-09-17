'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { ROLE_LABELS, ROLE_BADGE_COLORS, type Role, type User, type ActivityLogEntry, type LoginActivityEntry } from '@/lib/types';
import {
  Plus,
  Trash2,
  Users,
  Activity,
  Loader as Loader2,
  ShieldCheck,
  Mail,
  CircleArrowUp as ArrowUpCircle,
  CircleArrowDown as ArrowDownCircle,
  LogIn,
  MonitorSmartphone,
  MapPin,
  TriangleAlert,
  KeyRound,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserWithCount = User & { transactionCount: number };

const USERS_PER_PAGE = 9;
const ACTIVITY_PER_PAGE = 8;
const LOGIN_ACTIVITY_PER_PAGE = 8;

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

function ListPagination({
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

export default function UsersPage() {
  const { user, getUsers, createUser, deleteUser, getActivityLog, getLoginActivity } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserWithCount | null>(null);
  const [formError, setFormError] = useState('');

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<Role>('STAFF');

  const [tab, setTab] = useState('users');

  const [usersPage, setUsersPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [loginActivityPage, setLoginActivityPage] = useState(1);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const {
    data: users = [],
    isLoading: loading,
    error: queryError,
  } = useQuery<UserWithCount[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: isAdmin,
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery<ActivityLogEntry[]>({
    queryKey: ['activity-log'],
    queryFn: () => getActivityLog(50),
    enabled: isAdmin,
  });

  const { data: loginActivity = [], isLoading: loginActivityLoading } = useQuery<LoginActivityEntry[]>({
    queryKey: ['login-activity'],
    queryFn: () => getLoginActivity(50),
    enabled: isAdmin,
  });

  const error = queryError instanceof Error ? queryError.message : '';

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const saving = createMutation.isPending || deleteMutation.isPending;

  const usersTotalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  const activityTotalPages = Math.max(1, Math.ceil(activity.length / ACTIVITY_PER_PAGE));
  const loginActivityTotalPages = Math.max(1, Math.ceil(loginActivity.length / LOGIN_ACTIVITY_PER_PAGE));

  // Kalau data berkurang sampai halaman aktif nggak ada lagi datanya, mundurin ke halaman terakhir yang valid
  useEffect(() => {
    if (usersPage > usersTotalPages) setUsersPage(usersTotalPages);
  }, [usersPage, usersTotalPages]);

  useEffect(() => {
    if (activityPage > activityTotalPages) setActivityPage(activityTotalPages);
  }, [activityPage, activityTotalPages]);

  useEffect(() => {
    if (loginActivityPage > loginActivityTotalPages) setLoginActivityPage(loginActivityTotalPages);
  }, [loginActivityPage, loginActivityTotalPages]);

  const paginatedUsers = users.slice((usersPage - 1) * USERS_PER_PAGE, usersPage * USERS_PER_PAGE);
  const paginatedActivity = activity.slice(
    (activityPage - 1) * ACTIVITY_PER_PAGE,
    activityPage * ACTIVITY_PER_PAGE,
  );
  const paginatedLoginActivity = loginActivity.slice(
    (loginActivityPage - 1) * LOGIN_ACTIVITY_PER_PAGE,
    loginActivityPage * LOGIN_ACTIVITY_PER_PAGE,
  );

  function openCreate() {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('STAFF');
    setFormError('');
    setDialogOpen(true);
  }

  async function handleCreate() {
    setFormError('');
    if (!formName.trim()) {
      setFormError(t('users.nameRequired'));
      return;
    }
    if (!formEmail.trim()) {
      setFormError(t('users.emailRequired'));
      return;
    }
    if (formPassword.length < 6) {
      setFormError(t('users.passwordTooShort'));
      return;
    }
    try {
      await createMutation.mutateAsync({ name: formName.trim(), email: formEmail.trim(), password: formPassword, role: formRole });
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('users.createFailed'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('users.deleteFailed'));
    }
  }

  if (user && user.role !== 'ADMIN') return null;

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
      <PageHeader title={t('users.title')} description={t('users.subtitle')}>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('users.addUser')}
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-5 grid w-full grid-cols-3 sm:mb-6 sm:inline-flex sm:w-auto">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            {t('users.usersTab')}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            {t('users.activityLogTab')}
          </TabsTrigger>
          <TabsTrigger value="loginActivity" className="gap-2">
            <KeyRound className="h-4 w-4" />
            {t('users.loginActivityTab')}
          </TabsTrigger>
        </TabsList>

        {/* Users tab */}
        <TabsContent value="users">
          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                {t('users.noUsersFound')}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {paginatedUsers.map((u, i) => (
                  <Card
                    key={u.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-foreground/10 text-foreground text-xs font-semibold">
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{u.name}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{u.email}</span>
                          </p>
                        </div>
                        <span
                          className={cn(
                            'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                            ROLE_BADGE_COLORS[u.role],
                          )}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t pt-3">
                        <span className="text-xs text-muted-foreground">
                          {u.transactionCount} {u.transactionCount !== 1 ? t('users.transactionPlural') : t('users.transactionSingular')}
                        </span>
                        {u.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {u.id === user?.id && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            <ShieldCheck className="h-3 w-3" />
                            {t('users.you')}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <ListPagination page={usersPage} totalPages={usersTotalPages} onChange={setUsersPage} />
            </>
          )}
        </TabsContent>

        {/* Activity log tab */}
        <TabsContent value="activity">
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                <Activity className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                {t('users.noActivityYet')}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 flex-shrink-0" />
                  {t('users.recentActivity')}
                </CardTitle>
                <CardDescription>{t('users.recentActivityDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0 sm:p-6 sm:pt-0">
                {paginatedActivity.map((entry) => (
                  <div
                    key={entry.transactionId}
                    className="flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-secondary/50 sm:gap-3 sm:p-3"
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9',
                        entry.transactionType === 'INCOME'
                          ? 'bg-emerald-500/10 dark:bg-emerald-400/10'
                          : 'bg-rose-500/10 dark:bg-rose-400/10',
                      )}
                    >
                      {entry.transactionType === 'INCOME' ? (
                        <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.categoryName}</p>
                      {entry.description && (
                        <p className="truncate text-xs text-muted-foreground">{entry.description}</p>
                      )}
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t('users.enteredBy', { name: entry.enteredBy, date: formatDateTime(entry.enteredAt) })}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p
                        className={cn(
                          'font-mono text-sm font-bold tabular-nums',
                          entry.transactionType === 'INCOME'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400',
                        )}
                      >
                        {entry.transactionType === 'INCOME' ? '+' : '-'}
                        {formatCurrency(entry.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(entry.date)}</p>
                    </div>
                  </div>
                ))}
                <ListPagination page={activityPage} totalPages={activityTotalPages} onChange={setActivityPage} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Login activity tab */}
        <TabsContent value="loginActivity">
          {loginActivityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : loginActivity.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                <KeyRound className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                {t('users.noLoginActivityYet')}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="h-4 w-4 flex-shrink-0" />
                  {t('users.recentLoginActivity')}
                </CardTitle>
                <CardDescription>{t('users.recentLoginActivityDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0 sm:p-6 sm:pt-0">
                {paginatedLoginActivity.map((entry) => {
                  const hasAnomaly =
                    entry.isNewDevice || entry.isNewLocation || entry.failedAttemptsBeforeSuccess > 0;
                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-2 rounded-lg border p-2.5 transition-colors hover:bg-secondary/50 sm:p-3"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9',
                            entry.status === 'SUCCESS' ? 'bg-secondary' : 'bg-foreground/5',
                          )}
                        >
                          <LogIn
                            className={cn(
                              'h-4 w-4',
                              entry.status === 'SUCCESS' ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {entry.userName ?? entry.emailAttempted}
                            </p>
                            <span
                              className={cn(
                                'flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                entry.status === 'SUCCESS'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400',
                              )}
                            >
                              {entry.status === 'SUCCESS' ? t('users.loginSuccess') : t('users.loginFailed')}
                            </span>
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 truncate text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {entry.city && entry.country
                                ? `${entry.city}, ${entry.country}`
                                : entry.ipAddress}
                            </span>
                            {(entry.browser || entry.os) && (
                              <span className="flex items-center gap-1">
                                <MonitorSmartphone className="h-3 w-3 flex-shrink-0" />
                                {[entry.browser, entry.os].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                        </div>
                      </div>

                      {hasAnomaly && (
                        <div className="flex flex-wrap gap-1.5 pl-[42px] sm:pl-12">
                          {entry.isNewDevice && (
                            <span className="flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <TriangleAlert className="h-2.5 w-2.5" />
                              {t('users.newDevice')}
                            </span>
                          )}
                          {entry.isNewLocation && (
                            <span className="flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <TriangleAlert className="h-2.5 w-2.5" />
                              {t('users.newLocation')}
                            </span>
                          )}
                          {entry.failedAttemptsBeforeSuccess > 0 && (
                            <span className="flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <TriangleAlert className="h-2.5 w-2.5" />
                              {t('users.failedAttemptsBeforeSuccess', { count: entry.failedAttemptsBeforeSuccess })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <ListPagination
                  page={loginActivityPage}
                  totalPages={loginActivityTotalPages}
                  onChange={setLoginActivityPage}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create user dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:w-full">
          <DialogHeader>
            <DialogTitle>{t('users.addNewUser')}</DialogTitle>
            <DialogDescription>{t('users.addNewUserDesc')}</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="user-name">{t('users.fullName')}</Label>
              <Input
                id="user-name"
                placeholder={t('users.fullNamePlaceholder')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="user-email">{t('users.email')}</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="name@company.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="user-password">{t('users.password')}</Label>
              <Input
                id="user-password"
                type="password"
                placeholder={t('users.passwordPlaceholder')}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>{t('users.role')}</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as Role)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t('users.roleAdmin')}</SelectItem>
                  <SelectItem value="STAFF">{t('users.roleStaff')}</SelectItem>
                  <SelectItem value="MANAGEMENT">{t('users.roleManagement')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('users.createUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.deleteDesc', { name: deleteTarget?.name ?? '' })}
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