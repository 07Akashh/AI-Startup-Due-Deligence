'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    credits: number;
  };
}

export async function loginAction(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json.error ?? 'Login failed' };
    }

    if (json.token) {
      const cookieStore = await cookies();
      cookieStore.set('token', json.token, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return { success: true, user: json.user };
  } catch (err) {
    console.error('[loginAction]', err);
    return { success: false, error: 'Network error — please try again.' };
  }
}

export async function registerAction(
  name: string,
  email: string,
  password: string,
): Promise<AuthActionResult> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
      cache: 'no-store',
    });

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json.error ?? 'Registration failed' };
    }

    if (json.token) {
      const cookieStore = await cookies();
      cookieStore.set('token', json.token, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return { success: true, user: json.user };
  } catch (err) {
    console.error('[registerAction]', err);
    return { success: false, error: 'Network error — please try again.' };
  }
}
