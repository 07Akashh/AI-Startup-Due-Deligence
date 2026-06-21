/**
 * API-layer types: request/response envelopes, pagination, and
 * Express-level augmentations.
 */
import { Request } from 'express';
import { ErrorCode } from './errors';
import { JobStatus, InvestmentRecommendation } from '@startupai/shared';

// ─── Generic API response envelope ───────────────────────────────────────────

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: unknown;
  requestId?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  requestId?: string;
  duration?: number;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateJobDto {
  pitchDeckUrl?: string;
  websiteUrl?: string;
  financialCsvUrl?: string;
}

export interface GetJobParams {
  jobId: string;
}

// ─── Express augmentations ────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  userId?: string;
  requestId: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Job filter ───────────────────────────────────────────────────────────────

export interface JobFilters {
  status?: JobStatus;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadedFile {
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

// ─── Report query ─────────────────────────────────────────────────────────────

export interface ReportQueryResult {
  jobId: string;
  investmentScore: number;
  recommendation: InvestmentRecommendation;
  confidenceScore: number;
  createdAt: string;
  startupName?: string;
}
