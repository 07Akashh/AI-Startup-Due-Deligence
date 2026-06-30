'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { loginAction } from '@/app/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [isPending, startTransition] = useTransition();
  const [optimisticLabel, setOptimisticLabel] = useOptimistic<string>('Sign In');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      setOptimisticLabel('Signing you in…');

      const result = await loginAction(email, password);

      if (!result.success) {
        setError(result.error ?? 'Login failed. Please check your credentials.');
        return;
      }

      await refreshUser();
      router.push('/dashboard');
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-sm border border-border">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your credentials to access your VentureLens AI dashboard.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="investor@fund.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              id="login-submit-btn"
              className="w-full gap-2"
              type="submit"
              disabled={isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {optimisticLabel}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
