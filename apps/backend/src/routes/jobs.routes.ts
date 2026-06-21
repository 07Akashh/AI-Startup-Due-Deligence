import { Router, Request, Response } from 'express';
import { createJob, getJob } from '../services/jobService';
import { enqueueJob } from '../queue/jobQueue';
import { ApiResponse, CreateJobRequest, CreateJobResponse, Job } from '@startupai/shared';
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

    // Extract S3 keys from URLs if provided
    const extractKey = (url?: string) => {
      if (!url) return undefined;
      try {
        const u = new URL(url);
        return u.pathname.slice(1); // Remove leading /
      } catch {
        return undefined;
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
          pitchDeckS3Key: extractKey(pitchDeckUrl),
          pitchDeckSignedUrl: pitchDeckUrl,
          websiteUrl,
          financialCsvS3Key: extractKey(financialCsvUrl),
          startupStage,
        });
      } catch (err: any) {
        console.error(`[jobs] Graph failed for job ${job.id}:`, err);
      }
    });

    res.status(201).json({
      success: true,
      data: { jobId: job.id, status: job.status },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
