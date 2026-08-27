'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/i18n/language-context';
import { useRouteLoading } from '@/components/route-loading-provider';
import { ROLE_LABELS, ROLE_BADGE_COLORS, type Role } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
import { Wallet, LayoutDashboard, ArrowLeftRight, Tags, ChartBar as FileBarChart, Users, LogOut, Menu, Loader as Loader2, Languages, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/lib/i18n/translations';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import loadingGif from '@/app/img/Gift.gif';

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF', 'MANAGEMENT'] },
  { href: '/transactions', labelKey: 'nav.transactions', icon: ArrowLeftRight, roles: ['ADMIN', 'STAFF'] },
  { href: '/categories', labelKey: 'nav.categories', icon: Tags, roles: ['ADMIN'] },
  { href: '/reports', labelKey: 'nav.reports', icon: FileBarChart, roles: ['ADMIN', 'STAFF', 'MANAGEMENT'] },
  { href: '/users', labelKey: 'nav.users', icon: Users, roles: ['ADMIN'] },
];

function LanguageToggle({ className }: { className?: string }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={cn('gap-1.5 text-xs font-semibold', className)}
      title={language === 'en' ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
    >
      <Languages className="h-3.5 w-3.5" />
      {language === 'en' ? 'EN' : 'ID'}
    </Button>
  );
}

function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="outline" size="icon" className={cn('h-9 w-9', className)} disabled />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn('h-9 w-9', className)}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t, language } = useLanguage();
  const { start } = useRouteLoading();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  function handleLogout() {
    setLoggingOut(true);
    logout();
  }

  // `showToggles`: the mobile top header already shows the theme/language
  // toggles, so the drawer (Sheet) version of the sidebar hides them to
  // avoid showing the same controls twice. The desktop sidebar has no
  // separate header, so it keeps showing them.
  const SidebarContent = ({ showToggles = true }: { showToggles?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-2 border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-foreground">
            <Wallet className="h-4 w-4 text-background" />
          </div>
          <span className="truncate text-base font-bold tracking-tight">FinTrack</span>
        </div>
        {showToggles && (
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <ThemeToggle className="h-8 w-8" />
            <LanguageToggle className="h-8 gap-1 px-2" />
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4 scrollbar-thin">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('nav.menu')}
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (pathname !== item.href) start();
                setMobileOpen(false);
              }}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2.5">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-foreground/10 text-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <span
              className={cn(
                'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold',
                ROLE_BADGE_COLORS[user.role],
              )}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => setLogoutConfirmOpen(true)}
          className="mt-2 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t('common.signOut')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {loggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Image src={loadingGif} alt="Loading..." width={80} height={80} unoptimized />
        </div>
      )}

      <aside className="hidden w-64 flex-shrink-0 border-r bg-card lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <span className="font-bold">FinTrack</span>
            </div>
                   <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-foreground/10 text-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
        </div>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent showToggles={false} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'en' ? 'Sign out?' : 'Keluar dari akun?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'en'
                ? 'You will need to log in again to access your account.'
                : 'Anda perlu login kembali untuk mengakses akun ini.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="w-full sm:w-auto">
              {t('common.signOut')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', ROLE_BADGE_COLORS[role])}>
      {ROLE_LABELS[role]}
    </span>
  );
}