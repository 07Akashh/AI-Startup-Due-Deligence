/**
 * Global error handling middleware — the single source of truth for
 * mapping errors to HTTP responses. Must be the last middleware registered.
 */
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as any).requestId ?? 'unknown';

  if (err instanceof AppError) {
    // Operational errors — expected, log at warn level
    logger.warn('Operational error', {
      requestId,
      errorCode: err.errorCode,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method,
      details: err.details,
    });

    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.errorCode,
      requestId,
      details: err.details,
    });
    return;
  }

  // Non-operational errors — programming bugs, unknown failures
  logger.error('Unexpected error', {
    requestId,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
    requestId,
  });
}

/**
 * 404 handler — registered AFTER all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}
