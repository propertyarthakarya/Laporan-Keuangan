import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { LanguageProvider } from '@/lib/i18n/language-context';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'ArthaKarya Flow',
  description: 'Corporate financial reporting and transaction management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* bg-background / text-foreground follow the CSS variables from
         globals.css (:root vs .dark), so this now actually flips color
         with the theme instead of being hardcoded dark. */}
      <body suppressHydrationWarning className="relative min-h-screen bg-background text-foreground transition-colors duration-500">
        {/* Ambient lighting + noise texture are dark-mode-only effects —
           the light theme is intentionally flat/plain, so these are gated
           behind `dark:block` instead of rendering unconditionally. */}
        <div className="pointer-events-none fixed inset-0 z-0 hidden dark:block">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 20% 15%, rgba(99, 102, 241, 0.18), transparent 60%), ' +
                'radial-gradient(ellipse 70% 60% at 85% 85%, rgba(56, 189, 248, 0.14), transparent 60%), ' +
                'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(168, 85, 247, 0.10), transparent 60%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              {/* Page content sits above the background layers */}
              <div className="relative z-10">{children}</div>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}