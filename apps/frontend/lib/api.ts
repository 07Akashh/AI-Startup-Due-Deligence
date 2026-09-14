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

/**
 * Helper to upload a file directly to Cloudinary using signed signature.
 * Completely avoids Vercel's 4.5MB serverless payload limit.
 */
async function uploadToCloudinaryDirect(
  file: File,
  folder: string,
  fallbackRoute: string
): Promise<{ url: string; key: string; filename: string }> {
  try {
    // 1. Get signed credentials from backend
    const { data } = await api.get('/upload/signature', {
      params: {
        filename: file.name,
        folder,
      },
    });

    const { signature, timestamp, apiKey, cloudName, publicId, uploadUrl, uploadPreset } =
      data.data;

    // 2. Direct upload to Cloudinary API
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);
    if (publicId) formData.append('public_id', publicId);
    if (uploadPreset) formData.append('upload_preset', uploadPreset);

    const targetUrl =
      uploadUrl || `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const cloudinaryRes = await axios.post(targetUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });

    return {
      url: cloudinaryRes.data.secure_url || cloudinaryRes.data.url,
      key: cloudinaryRes.data.public_id,
      filename: file.name,
    };
  } catch (err) {
    console.error('Direct Cloudinary upload failed, falling back to server stream upload:', err);
    // Fallback: stream through backend route
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(fallbackRoute, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data.data as { url: string; key: string; filename: string };
  }
}

export async function uploadPitchDeck(file: File) {
  return uploadToCloudinaryDirect(file, 'pitch-decks', '/upload/pitch-deck');
}

export async function uploadFinancials(file: File) {
  return uploadToCloudinaryDirect(file, 'financials', '/upload/financials');
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

