'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface CompletedReport {
  id: string;
  createdAt: string;
  status: string;
  startupName: string;
  startupTagline: string;
  report?: {
    investmentScore?: number;
    recommendation?: string;
  };
}

export interface ReportsListResult {
  success: boolean;
  reports?: CompletedReport[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface DashboardStats {
  totalReports: number;
  totalTokens: number;
  averageRuntimeMs: number;
  recentJobs: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
}


export async function getReportsListAction(
  page = 1,
  limit = 10,
): Promise<ReportsListResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  try {
    const res = await fetch(
      `${API_URL}/api/v1/report?page=${page}&limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
      },
    );

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json.error ?? 'Failed to load reports' };
    }

    return {
      success: true,
      reports: json.data?.reports ?? [],
      pagination: json.data?.pagination,
    };
  } catch (err) {
    console.error('[getReportsListAction]', err);
    return { success: false, error: 'Network error — please try again.' };
  }
}

export async function archiveReportAction(
  reportId: string,
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  try {
    const res = await fetch(`${API_URL}/api/v1/report/${reportId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok && res.status !== 404) {
      const json = await res.json().catch(() => ({}));
      return { success: false, error: json.error ?? 'Could not archive report' };
    }

    return { success: true };
  } catch (err) {
    console.error('[archiveReportAction]', err);
    return { success: false, error: 'Network error.' };
  }
}


export async function getDashboardStatsAction(): Promise<DashboardStats> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const res = await fetch(`${API_URL}/api/v1/analytics/dashboard`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: 10 },
  });

  if (!res.ok) {
    return { totalReports: 0, totalTokens: 0, averageRuntimeMs: 0, recentJobs: [] };
  }

  const json = await res.json();
  return json.data as DashboardStats;
}
