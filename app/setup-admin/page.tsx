'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, CircleAlert as AlertCircle, Loader as Loader2 } from 'lucide-react';
import Image from 'next/image';
import loadingGif from '@/app/img/Gift.gif';
import logo from '@/app/img/Logo.svg';

export default function SetupAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    apiClient
      .checkSetupStatus()
      .then((setupComplete) => {
        if (setupComplete) {
          router.replace('/login');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiClient.setupAdmin({ name, email, password });
      // Cookie sesi sudah otomatis di-set oleh server (auto-login),
      // jadi langsung arahkan ke dashboard.
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin account.');
      setSubmitting(false);
    }
  }

  // Shared background layers (gradient lighting + noise) so both the
  // checking-spinner state and the form state look consistent.
  const BackgroundLayers = (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 15%, rgba(99, 102, 241, 0.18), transparent 60%), ' +
            'radial-gradient(ellipse 70% 60% at 85% 85%, rgba(56, 189, 248, 0.14), transparent 60%), ' +
            'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(168, 85, 247, 0.10), transparent 60%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </>
  );

  if (checking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f]">
        {BackgroundLayers}
        <Loader2 className="relative z-10 h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f]">
      {BackgroundLayers}

      {submitting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Image src={loadingGif} alt="Loading..." width={80} height={80} unoptimized />
        </div>
      )}

      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <Image src={logo} alt="ArthaKarya Flow" className="h-8 w-8 invert" unoptimized />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ArthaKarya Flow</h1>
          <p className="mt-1 text-sm text-white/60">Corporate Financial Reporting</p>
        </div>

        <Card className="border border-white/20 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
          <CardHeader>
            <CardTitle className="text-xl text-white">Create admin account</CardTitle>
            <CardDescription className="text-white/60">Set up the first administrator account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-md px-3 py-2.5 text-sm text-white animate-scale-in">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/80">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  autoFocus
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/40 backdrop-blur-sm focus-visible:ring-white/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/40 backdrop-blur-sm focus-visible:ring-white/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="pr-10 border-white/20 bg-white/5 text-white placeholder:text-white/40 backdrop-blur-sm focus-visible:ring-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-white/90 text-[#0a0a0f] hover:bg-white"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create admin account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}