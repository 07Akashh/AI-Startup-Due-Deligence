/**
 * Multer file upload middleware with strict type and size guards.
 * Returns typed UploadError on invalid inputs.
 */
import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { UploadError } from '../types/errors';

const ALLOWED_PDF_TYPES  = ['application/pdf'];
const ALLOWED_CSV_TYPES  = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'];
const MAX_PDF_SIZE_BYTES  = 50 * 1024 * 1024; // 50 MB
const MAX_CSV_SIZE_BYTES  = 10 * 1024 * 1024; // 10 MB

// Memory storage — we stream directly to S3, no disk I/O
const memoryStorage = multer.memoryStorage();

function createUploader(maxSize: number) {
  return multer({
    storage: memoryStorage,
    limits: { fileSize: maxSize, files: 1 },
  });
}

export const pdfUploader = createUploader(MAX_PDF_SIZE_BYTES).single('file');
export const csvUploader = createUploader(MAX_CSV_SIZE_BYTES).single('file');

/**
 * Post-multer validation for PDF files.
 */
export function validatePdfUpload(req: Request, _res: Response, next: NextFunction): void {
  if (!req.file) {
    next(new UploadError('No file uploaded. Expected field name: "file"'));
    return;
  }
  if (!req.file.originalname.toLowerCase().endsWith('.pdf') &&
      !ALLOWED_PDF_TYPES.includes(req.file.mimetype)) {
    next(new UploadError('Only PDF files are accepted'));
    return;
  }
  if (req.file.size > MAX_PDF_SIZE_BYTES) {
    next(new UploadError(`PDF must be under ${MAX_PDF_SIZE_BYTES / 1024 / 1024} MB`));
    return;
  }
  next();
}

/**
 * Post-multer validation for CSV files.
 */
export function validateCsvUpload(req: Request, _res: Response, next: NextFunction): void {
  if (!req.file) {
    next(new UploadError('No file uploaded. Expected field name: "file"'));
    return;
  }
  const name = req.file.originalname.toLowerCase();
  if (!name.endsWith('.csv') && !ALLOWED_CSV_TYPES.includes(req.file.mimetype)) {
    next(new UploadError('Only CSV files are accepted'));
    return;
  }
  next();
}

/**
 * Multer-specific error handler — must be used after upload middleware.
 */
export function multerErrorHandler(
  err: any,
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new UploadError('File exceeds maximum allowed size'));
      return;
    }
    next(new UploadError(`Upload error: ${err.message}`));
    return;
  }
  next(err);
}
