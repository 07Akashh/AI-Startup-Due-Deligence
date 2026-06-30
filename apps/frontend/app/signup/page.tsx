'use client';

import { useState, useTransition, useOptimistic } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { registerAction } from '@/app/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('FOUNDER');
  const [error, setError] = useState('');
  const router = useRouter();
  const { refreshUser } = useAuth();


  const [isPending, startTransition] = useTransition();

  const [optimisticLabel, setOptimisticLabel] = useOptimistic<string>('Create Account');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    startTransition(async () => {
      setOptimisticLabel('Creating your account…');

      const result = await registerAction(name, email, password);

      if (!result.success) {
        setError(result.error ?? 'Failed to sign up. Please try again.');
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
            Create an account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Get started with VentureLens AI and get 10 free reports.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSignup}>
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={isPending}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="FOUNDER">Founder</option>
                <option value="INVESTOR">Investor</option>
                <option value="ANALYST">Analyst</option>
              </select>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              id="signup-submit-btn"
              className="w-full gap-2"
              type="submit"
              disabled={isPending}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {optimisticLabel}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
