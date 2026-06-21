/**
 * Validation middleware factory.
 * Validates req.body, req.params, or req.query against a Zod schema.
 * On failure, passes a ValidationError to the error handler middleware.
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../types/errors';

type ValidateTarget = 'body' | 'params' | 'query';

export function validateRequest<T>(
  schema: z.ZodType<T>,
  target: ValidateTarget = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
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

    // Attach parsed (and potentially transformed) data back to request
    (req as any)[`parsed${target.charAt(0).toUpperCase() + target.slice(1)}`] =
      result.data;

    next();
  };
}
