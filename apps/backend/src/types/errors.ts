/**
 * Domain-specific error classes for structured error handling throughout
 * the application. Every error maps to an HTTP status code and error code.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'UPLOAD_ERROR'
  | 'STORAGE_ERROR'
  | 'AGENT_ERROR'
  | 'GRAPH_ERROR'
  | 'LLM_ERROR'
  | 'EMBEDDING_ERROR'
  | 'VECTOR_DB_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCode = 'INTERNAL_ERROR',
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class UploadError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'UPLOAD_ERROR', details);
  }
}

export class StorageError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, 'STORAGE_ERROR', details);
  }
}

export class AgentError extends AppError {
  constructor(agentName: string, message: string, details?: unknown) {
    super(`[${agentName}] ${message}`, 500, 'AGENT_ERROR', details);
  }
}

export class LLMError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, 'LLM_ERROR', details);
  }
}

export class VectorDBError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 502, 'VECTOR_DB_ERROR', details);
  }
}
