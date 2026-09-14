/**
 * Response helper utilities — standard success/error envelope builders
 * used by all controllers.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiSuccessResponse, ApiErrorResponse, ResponseMeta } from '../types/api';
import { AppError, ErrorCode } from '../types/errors';
import { logger } from './logger';

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: ResponseMeta
): void {
  const body: ApiSuccessResponse<T> = { success: true, data, ...(meta && { meta }) };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  code: ErrorCode = 'INTERNAL_ERROR',
  details?: unknown
): void {
  const body: ApiErrorResponse = { success: false, error: message, code, ...(details !== undefined && { details }) };
  res.status(statusCode).json(body);
}

export function sendAppError(res: Response, error: AppError): void {
  if (!error.isOperational) {
    logger.error('Non-operational error', { error: error.message, stack: error.stack });
  }
  sendError(res, error.message, error.statusCode, error.errorCode, error.details);
}

/**
 * Wraps an async controller function and catches all errors,
 * forwarding them to the Express error handler via next().
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response | unknown>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
