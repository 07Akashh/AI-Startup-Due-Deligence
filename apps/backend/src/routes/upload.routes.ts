import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  uploadStreamToStorage,
  getCloudinaryUploadSignature,
  getPresignedUploadUrl,
  downloadFromStorage,
} from '../services/storageService';
import { ApiResponse, UploadResponse } from '@startupai/shared';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * GET /api/v1/upload/file
 * Securely proxies and streams uploaded files (PDFs, CSVs) directly from Cloudinary storage.
 * Bypasses Cloudinary CDN 401 delivery restrictions.
 */
router.get('/file', async (req: Request, res: Response) => {
  try {
    const { key, url } = req.query as { key?: string; url?: string };
    const target = key || url;
    if (!target) {
      return res.status(400).json({ success: false, error: 'key or url parameter required' });
    }

    const buffer = await downloadFromStorage(target);
    const lower = target.toLowerCase();

    if (lower.includes('.pdf') || lower.includes('pitch-decks')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="pitch_deck.pdf"');
    } else if (lower.includes('.csv') || lower.includes('financial')) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'inline; filename="financials.csv"');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }

    return res.send(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/v1/upload/signature
 * Generates Cloudinary signed parameters for direct client streaming uploads.
 * This completely avoids hitting Vercel's 4.5MB serverless payload limit.
 */
router.get('/signature', async (req: Request, res: Response) => {
  try {
    const { folder, filename } = req.query as { folder?: string; filename?: string };
    const result = await getCloudinaryUploadSignature(folder || 'uploads', filename);
    return res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/v1/upload/presign (alias for signature)
 */
router.get('/presign', async (req: Request, res: Response) => {
  try {
    const { filename, mimeType, folder } = req.query as {
      filename?: string;
      mimeType?: string;
      folder?: string;
    };
    if (!filename) {
      return res.status(400).json({ success: false, error: 'filename is required' });
    }
    const result = await getPresignedUploadUrl(filename, mimeType || '', folder || 'uploads');
    return res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/v1/upload/pitch-deck
 * Streams pitch deck to Cloudinary using upload_stream.
 */
router.post(
  '/pitch-deck',
  upload.single('file'),
  async (req: Request, res: Response<ApiResponse<UploadResponse>>) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({ success: false, error: 'Only PDF files are accepted' });
      }

      const result = await uploadStreamToStorage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'pitch-decks'
      );

      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * POST /api/v1/upload/financials
 * Streams financial CSV to Cloudinary using upload_stream.
 */
router.post(
  '/financials',
  upload.single('file'),
  async (req: Request, res: Response<ApiResponse<UploadResponse>>) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
        return res.status(400).json({ success: false, error: 'Only CSV files are accepted' });
      }

      const result = await uploadStreamToStorage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'financials'
      );

      return res.json({ success: true, data: result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: msg });
    }
  }
);

export default router;
