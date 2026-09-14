/**
 * Validation middleware factory.
 * Validates req.body, req.params, or req.query against a Zod schema.
 * On failure, passes a ValidationError to the error handler middleware.
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../types/errors';

type ValidateTarget = 'body' | 'params' | 'query';

export interface ValidatedRequest<TBody = unknown, TQuery = unknown, TParams = unknown> extends Request {
  parsedBody?: TBody;
  parsedQuery?: TQuery;
  parsedParams?: TParams;
}

export function validateRequest<T>(
  schema: z.ZodType<T>,
  target: ValidateTarget = 'body'
) {
  return (req: ValidatedRequest, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(
        new ValidationError(
          'Request validation failed',
          result.error.flatten().fieldErrors
        )
      );
      return;
    }

    if (target === 'body') req.parsedBody = result.data;
    if (target === 'query') req.parsedQuery = result.data;
    if (target === 'params') req.parsedParams = result.data;

    next();
  };
}
