'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMe, logout as apiLogout } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      const { user } = await getMe();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line
    fetchUser();
  // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Only redirect to login if an unauthenticated user actively visits a protected /dashboard route
    if (!loading && !user && pathname?.startsWith('/dashboard')) {
      router.push(`/?from=${encodeURIComponent(pathname)}`);
    }
    // If authenticated user visits login or signup, redirect them to dashboard
    if (!loading && user && (pathname === '/login' || pathname === '/signup')) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const logout = async () => {
    try {
      await apiLogout();
      setUser(null);
      router.push('/');
    } catch (err) {
      console.error('Logout failed', err);
      setUser(null);
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
