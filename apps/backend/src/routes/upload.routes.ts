import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadFileToStorage } from '../services/storageService';
import { ApiResponse, UploadResponse } from '@startupai/shared';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

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

      const result = await uploadFileToStorage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'pitch-decks'
      );

      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

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

      const result = await uploadFileToStorage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'financials'
      );

      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
);

export default router;
