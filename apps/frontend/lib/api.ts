import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,
});

export async function uploadPitchDeck(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/upload/pitch-deck', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data.data as { url: string; key: string; filename: string };
}

export async function uploadFinancials(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/upload/financials', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data.data as { url: string; key: string; filename: string };
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
  return data;
}

export async function register(payload: Record<string, unknown>) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function logout() {
  const { data } = await api.post('/auth/logout');
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

