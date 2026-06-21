import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,
});

export function setCookie(name: string, value: string, days = 7) {
  if (typeof window === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax;Secure`;
}

export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function eraseCookie(name: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=; Max-Age=-99999999;path=/;SameSite=Lax;Secure`;
}

api.interceptors.request.use((config) => {
  const token = getCookie('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function uploadPitchDeck(file: File) {
  try {
    const { data } = await api.get('/upload/presign', {
      params: {
        filename: file.name,
        mimeType: file.type,
        folder: 'pitch-decks',
      },
    });

    const { uploadUrl, key, downloadUrl } = data.data;

    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });

    return { url: downloadUrl, key, filename: file.name };
  } catch (err) {
    console.error('Presigned upload failed, falling back to server upload:', err);
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/upload/pitch-deck', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data.data as { url: string; key: string; filename: string };
  }
}

export async function uploadFinancials(file: File) {
  try {
    const { data } = await api.get('/upload/presign', {
      params: {
        filename: file.name,
        mimeType: file.type,
        folder: 'financials',
      },
    });

    const { uploadUrl, key, downloadUrl } = data.data;

    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });

    return { url: downloadUrl, key, filename: file.name };
  } catch (err) {
    console.error('Presigned upload failed, falling back to server upload:', err);
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/upload/financials', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data.data as { url: string; key: string; filename: string };
  }
}

export async function createJob(payload: {
  pitchDeckUrl?: string;
  websiteUrl?: string;
  financialCsvUrl?: string;
  startupStage?: string;
}) {
  const { data } = await api.post('/jobs', payload);
  return data.data as { jobId: string; status: string };
}

export async function getJob(jobId: string) {
  const { data } = await api.get(`/jobs/${jobId}`);
  return data.data;
}

export async function getReport(jobId: string) {
  const { data } = await api.get(`/report/${jobId}`);
  return data.data;
}

// -- Auth --
export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function login(payload: Record<string, unknown>) {
  const { data } = await api.post('/auth/login', payload);
  if (data.token) {
    setCookie('token', data.token, 7);
  }
  return data;
}

export async function register(payload: Record<string, unknown>) {
  const { data } = await api.post('/auth/register', payload);
  if (data.token) {
    setCookie('token', data.token, 7);
  }
  return data;
}

export async function logout() {
  const { data } = await api.post('/auth/logout');
  eraseCookie('token');
  return data;
}

// -- Analytics --
export async function getDashboardStats() {
  const { data } = await api.get('/analytics/dashboard');
  return data.data;
}

export async function getReportsList(page = 1, limit = 10) {
  const { data } = await api.get(`/report?page=${page}&limit=${limit}`);
  return data.data;
}

