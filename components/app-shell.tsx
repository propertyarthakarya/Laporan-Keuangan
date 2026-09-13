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
import { LayoutDashboard, ArrowLeftRight, Tags, ChartBar as FileBarChart, Users, LogOut, Menu, Loader as Loader2, Languages, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/lib/i18n/translations';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import loadingGif from '@/app/img/Gift.gif';
import logo from '@/app/img/Logo.svg';

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
      className={cn(
        'gap-1.5 text-xs font-semibold dark:border-white/10 dark:bg-white/[0.04] dark:[backdrop-filter:blur(16px)] dark:hover:bg-white/[0.1]',
        className,
      )}
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
      className={cn(
        'relative h-9 w-9 overflow-hidden transition-colors duration-500 active:scale-90 dark:border-white/10 dark:bg-white/[0.04] dark:[backdrop-filter:blur(16px)] dark:hover:bg-white/[0.1] dark:shadow-[0_0_0_0_rgba(255,255,255,0)] dark:hover:shadow-[0_0_16px_-2px_rgba(255,255,255,0.25)]',
        className,
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun & Moon selalu ke-mount bareng, ditumpuk absolute — yang animasi
         cuma transform/opacity-nya, dipicu oleh isDark. Ini yang bikin
         transisinya kelihatan cross-fade + rotate, bukan snap ganti icon. */}
      <Sun
        className={cn(
          'absolute h-4 w-4 transition-all duration-500 ease-out',
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
        )}
      />
      <Moon
        className={cn(
          'absolute h-4 w-4 transition-all duration-500 ease-out',
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
        )}
      />
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
      <div className="flex h-16 items-center justify-between gap-1.5 border-b px-3 dark:border-white/10">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-foreground dark:ring-1 dark:ring-white/15 dark:shadow-[0_0_20px_-4px_rgba(255,255,255,0.2)]">
            {/* bg-foreground flips color with the theme (dark box in light mode,
               light box in dark mode). Logo.svg is a dark-colored mark, so it
               needs to invert to white when the box is dark, and revert back
               to its own color when the box is light — otherwise it disappears
               into the box in light mode. Kept solid (not glassed) so this
               contrast logic still holds; only a soft ring/glow was added. */}
            <Image src={logo} alt="ArthaKarya Flow" className="h-6 w-6 invert dark:invert-0" unoptimized />
          </div>
          <span className="truncate text-base font-bold tracking-tight">
            ArthaKarya<span className="hidden xl:inline"> Flow</span>
          </span>
        </div>
        {showToggles && (
          <div className="flex flex-shrink-0 items-center gap-1">
            <ThemeToggle className="h-8 w-8" />
            <LanguageToggle className="h-8 gap-1 px-1.5" />
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
                  ? // Glass pill for the active item — toned down: thinner gradient,
                    // softer border, and the outward glow removed so it reads as a
                    // subtle frosted pill instead of a glowing highlight.
                    'border border-black/10 bg-gradient-to-br from-black/[0.08] via-black/[0.04] to-transparent text-foreground [backdrop-filter:blur(16px)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3)] dark:border-white/10 dark:bg-gradient-to-br dark:from-white/[0.08] dark:via-white/[0.04] dark:to-transparent dark:text-white dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground dark:hover:border dark:hover:border-white/10 dark:hover:bg-white/[0.05]',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 dark:border-white/10">
        <div className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2.5 dark:border dark:border-white/10 dark:bg-white/[0.05] dark:[backdrop-filter:blur(16px)]">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-foreground/10 text-foreground text-xs font-semibold dark:border dark:border-white/10">
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
          className="mt-2 w-full justify-start gap-2 text-muted-foreground hover:text-foreground dark:hover:bg-white/[0.05]"
        >
          <LogOut className="h-4 w-4" />
          {t('common.signOut')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      {/* Ambient glow blobs behind the whole shell — cuma dark mode, jadi sidebar/header
         kaca beneran nembus liat cahaya di belakangnya, bukan cuma abu-abu transparan */}
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
  {/* Glow — dark mode only */}
  <div className="absolute -top-32 -left-20 hidden h-[420px] w-[420px] rounded-full bg-indigo-500/10 blur-[160px] dark:block" />

  {/* Noise / grain — konsisten kedua mode biar keliatan "berpasir" kayak metal brushed */}
  <div
    className="absolute inset-0 opacity-[0.06] mix-blend-multiply dark:opacity-[0.08] dark:mix-blend-overlay"
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      backgroundRepeat: 'repeat',
    }}
  />
</div>
      {loggingOut && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Image src={loadingGif} alt="Loading..." width={80} height={80} unoptimized />
        </div>
      )}

      <aside className="relative z-10 hidden w-72 flex-shrink-0 border-r bg-card dark:border-white/[0.12] dark:bg-white/[0.05] dark:[backdrop-filter:blur(24px)_saturate(160%)] dark:shadow-[8px_0_40px_-12px_rgba(0,0,0,0.5)] lg:flex lg:flex-col">
        {/* Garis highlight di tepi kanan sidebar, cuma dark mode */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-transparent via-white/20 to-transparent dark:block" />
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="relative z-10 flex flex-1 flex-col min-w-0">
          <header className="relative flex h-16 items-center justify-between border-b bg-card px-4 dark:border-white/[0.12] dark:bg-white/[0.05] dark:[backdrop-filter:blur(24px)_saturate(160%)] lg:hidden">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-px bg-gradient-to-r from-transparent via-white/20 to-transparent dark:block" />
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="dark:hover:bg-white/[0.08]">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <div className="flex items-center gap-2">
              {/* No wrapping box here — the logo sits directly on bg-card, which
                 follows the theme normally (light card in light mode, dark card
                 in dark mode). So it only needs to invert in dark mode, unlike
                 the sidebar version above which sits inside an inverted box. */}
              <Image src={logo} alt="ArthaKarya Flow" className="h-7 w-7 dark:invert" unoptimized />
              <span className="font-bold">ArthaKarya</span>
            </div>
                   <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-foreground/10 text-foreground text-xs font-semibold dark:border dark:border-white/10">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="relative z-10 flex-1 overflow-y-auto scrollbar-thin">{children}</main>
        </div>
        <SheetContent
          side="left"
          className="w-72 p-0 dark:border-white/10 dark:bg-zinc-950/90 dark:[backdrop-filter:blur(24px)_saturate(160%)]"
        >
          <SidebarContent showToggles={false} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl sm:w-full dark:border-white/10 dark:bg-zinc-950/90 dark:[backdrop-filter:blur(24px)_saturate(160%)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
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