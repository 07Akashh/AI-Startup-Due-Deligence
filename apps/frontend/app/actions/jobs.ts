'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface CreateJobPayload {
  pitchDeckUrl?: string;
  websiteUrl?: string;
  financialCsvUrl?: string;
  startupStage?: string;
}

export interface CreateJobResult {
  success: boolean;
  jobId?: string;
  status?: string;
  error?: string;
}

export async function createJobAction(
  payload: CreateJobPayload,
): Promise<CreateJobResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  try {
    const res = await fetch(`${API_URL}/api/v1/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const json = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: json.error ?? 'Failed to create job',
      };
    }

    return {
      success: true,
      jobId: json.data?.jobId,
      status: json.data?.status,
    };
  } catch (err) {
    console.error('[createJobAction]', err);
    return { success: false, error: 'Network error — please try again.' };
  }
}
