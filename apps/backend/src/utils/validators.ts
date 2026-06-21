/**
 * Validation schemas using Zod for all incoming request bodies and params.
 * Centralises validation logic, decoupled from controllers.
 */
import { z } from 'zod';

// ─── Job validators ───────────────────────────────────────────────────────────

export const createJobSchema = z.object({
  pitchDeckUrl: z.string().url('pitchDeckUrl must be a valid URL').optional(),
  websiteUrl: z
    .string()
    .optional()
    .transform(v => (v && !v.startsWith('http') ? `https://${v}` : v)),
  financialCsvUrl: z.string().url('financialCsvUrl must be a valid URL').optional(),
}).refine(
  data => data.pitchDeckUrl || data.websiteUrl || data.financialCsvUrl,
  { message: 'At least one input (pitchDeckUrl, websiteUrl, or financialCsvUrl) is required' }
);

export const jobIdParamSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
});

// ─── Pagination validator ─────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
}).transform(data => ({
  ...data,
  offset: (data.page - 1) * data.limit,
}));

// ─── Type exports ─────────────────────────────────────────────────────────────

export type CreateJobInput   = z.infer<typeof createJobSchema>;
export type PaginationInput  = z.infer<typeof paginationSchema>;

// ─── Validator helper ─────────────────────────────────────────────────────────

import { ValidationError } from '../types/errors';

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      'Request validation failed',
      result.error.flatten().fieldErrors
    );
  }
  return result.data;
}
