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

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.userId = decoded.userId;
  } catch {
    // Invalid token — continue without auth (not blocking)
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.userId = decoded.userId;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
