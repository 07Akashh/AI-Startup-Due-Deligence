/**
 * Optional JWT authentication middleware.
 * Verifies Bearer token from Authorization header.
 * If no token is provided, the request is allowed through (anonymous mode).
 * Use requireAuth() for protected routes.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../types/errors';

interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    (req as any).userId = decoded.userId;
  } catch {
    // Invalid token — continue without auth (not blocking)
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    (req as any).userId = decoded.userId;
    next();
  } catch (err: any) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
