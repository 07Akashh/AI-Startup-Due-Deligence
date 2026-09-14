import { Router, Response } from 'express';
import { createJob, getJob } from '../services/jobService';
import { enqueueJob } from '../queue/jobQueue';
import { ApiResponse, CreateJobResponse, Job } from '@startupai/shared';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { CreditService } from '../services/creditService';

const router = Router();

// POST /api/v1/jobs — Create and start a due diligence job
router.post('/', authenticate, async (req: AuthRequest, res: Response<ApiResponse<CreateJobResponse>>) => {
  try {
    const { pitchDeckUrl, websiteUrl, financialCsvUrl, startupStage } = req.body;
    const userId = req.user!.id;

    if (!pitchDeckUrl && !websiteUrl && !financialCsvUrl) {
      res.status(400).json({
        success: false,
        error: 'At least one input (pitchDeckUrl, websiteUrl, or financialCsvUrl) is required',
      });
      return;
    }

    // Check credits
    const hasCredits = await CreditService.hasSufficientCredits(userId, 1);
    if (!hasCredits) {
      res.status(403).json({
        success: false,
        error: 'Insufficient credits. Please upgrade or purchase more credits to generate a report.',
      });
      return;
    }

    // Extract storage key or public ID from URLs if provided
    const extractKey = (url?: string): string | undefined => {
      if (!url) return undefined;
      try {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return url;
        }
        const u = new URL(url);
        // If Cloudinary URL
        if (u.hostname.includes('cloudinary.com')) {
          const parts = u.pathname.split('/');
          const uploadIdx = parts.findIndex(p => p === 'upload');
          if (uploadIdx !== -1 && uploadIdx + 1 < parts.length) {
            const subParts = parts.slice(uploadIdx + 1);
            if (subParts[0]?.startsWith('v') && /^\d+$/.test(subParts[0].slice(1))) {
              subParts.shift();
            }
            return subParts.join('/');
          }
        }
        return u.pathname.slice(1); // Fallback: remove leading /
      } catch {
        return url;
      }
    };

    // Deduct 1 credit
    await CreditService.deductCredits(userId, 1, 'Due Diligence Report Generation');

    const job = await createJob({
      pitchDeckUrl,
      websiteUrl,
      financialCsvUrl,
      startupStage,
      userId,
    });

    // Kick off the agent graph asynchronously
    setImmediate(async () => {
      try {
        await enqueueJob({
          jobId: job.id,
          pitchDeckStorageKey: extractKey(pitchDeckUrl),
          pitchDeckUrl,
          pitchDeckSignedUrl: pitchDeckUrl,
          websiteUrl,
          financialCsvStorageKey: extractKey(financialCsvUrl),
          financialCsvUrl,
          startupStage,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[jobs] Graph failed for job ${job.id}:`, msg);
      }
    });

    res.status(201).json({
      success: true,
      data: { jobId: job.id, status: job.status },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/v1/jobs/:jobId — Get job status
router.get('/:jobId', authenticate, async (req: AuthRequest, res: Response<ApiResponse<Job>>) => {
  try {
    const job = await getJob(req.params.jobId as string);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    
    // Ensure the job belongs to the authenticated user
    if (job.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Forbidden: You do not have access to this job' });
      return;
    }

    res.json({ success: true, data: job });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
