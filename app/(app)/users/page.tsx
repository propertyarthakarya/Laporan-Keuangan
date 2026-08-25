'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/app-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { ROLE_LABELS, ROLE_BADGE_COLORS, type Role, type User, type ActivityLogEntry } from '@/lib/types';
import { Plus, Trash2, Users, Activity, Loader as Loader2, ShieldCheck, Mail, CircleArrowUp as ArrowUpCircle, CircleArrowDown as ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UsersPage() {
  const { user, getUsers, createUser, deleteUser, getActivityLog } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<(User & { transactionCount: number })[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<(User & { transactionCount: number }) | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<Role>('STAFF');

  const [tab, setTab] = useState('users');

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getUsers();
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [getUsers]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const log = await getActivityLog(50);
      setActivity(log);
    } catch {
      // ignore
    } finally {
      setActivityLoading(false);
    }
  }, [getActivityLog]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers();
      loadActivity();
    }
  }, [user, loadUsers, loadActivity]);

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
      setFormError('Name is required.');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('Email is required.');
      return;
    }
    if (formPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      await createUser({ name: formName.trim(), email: formEmail.trim(), password: formPassword, role: formRole });
      setDialogOpen(false);
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to delete user.');
    } finally {
      setSaving(false);
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
    <div className="p-6 lg:p-8 animate-fade-in">
      <PageHeader title="User Management" description="Manage team members and view activity">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
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
                No users found
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {users.map((u, i) => (
                <Card
                  key={u.id}
                  className="overflow-hidden transition-all hover:shadow-md animate-fade-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{u.name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {u.email}
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
                        {u.transactionCount} transaction{u.transactionCount !== 1 ? 's' : ''}
                      </span>
                      {u.id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {u.id === user?.id && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                          <ShieldCheck className="h-3 w-3" />
                          You
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
                No activity recorded yet
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest transactions entered by team members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {activity.map((entry) => (
                  <div
                    key={entry.transactionId}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50"
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                        entry.transactionType === 'INCOME' ? 'bg-success/10' : 'bg-destructive/10',
                      )}
                    >
                      {entry.transactionType === 'INCOME' ? (
                        <ArrowUpCircle className="h-4.5 w-4.5 text-success" />
                      ) : (
                        <ArrowDownCircle className="h-4.5 w-4.5 text-destructive" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {entry.categoryName}
                        {entry.description && (
                          <span className="font-normal text-muted-foreground"> — {entry.description}</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        Entered by {entry.enteredBy} on {formatDateTime(entry.enteredAt)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p
                        className={cn(
                          'text-sm font-bold',
                          entry.transactionType === 'INCOME' ? 'text-success' : 'text-destructive',
                        )}
                      >
                        {entry.transactionType === 'INCOME' ? '+' : '-'}
                        {formatCurrency(entry.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(entry.date)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create user dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new team member account</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="user-name">Full Name</Label>
              <Input
                id="user-name"
                placeholder="e.g. Jane Smith"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="name@company.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="user-password">Password</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="At least 6 characters"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v as Role)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="STAFF">Finance Staff</SelectItem>
                  <SelectItem value="MANAGEMENT">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the account for {deleteTarget?.name}. If they have entered
              any transactions, you will need to reassign or remove those first.
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
