import { AppShell } from '@/components/app-shell';
import { RouteLoadingProvider } from '@/components/route-loading-provider';
import { QueryProvider } from '@/lib/query-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <RouteLoadingProvider>
        <AppShell>{children}</AppShell>
      </RouteLoadingProvider>
    </QueryProvider>
  );
}