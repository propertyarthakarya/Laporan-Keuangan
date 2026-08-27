'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Loader as Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    apiClient
      .checkSetupStatus()
      .then((setupComplete) => {
        if (setupComplete) {
          router.replace('/login');
        } else {
          router.replace('/setup-admin');
        }
      })
      .catch(() => {
        // Kalau backend belum siap/error, arahkan ke login sebagai default aman.
        router.replace('/login');
      })
      .finally(() => setChecked(true));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
    </div>
  );
}