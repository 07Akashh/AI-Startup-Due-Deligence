import { Router, Response } from 'express';
import { getReportOrNull } from '../services/reportService';
import { getJobOrNull } from '../services/jobService';
import { ApiResponse, DueDiligenceReport } from '@startupai/shared';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

const router = Router();

// GET /api/v1/report (Paginated list of completed reports for user)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10')));
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: { userId, status: 'COMPLETE' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          report: {
            select: {
              investmentScore: true,
              recommendation: true,
              startupName: true,
              startupTagline: true,
            },
          },
        },
      }),
      prisma.job.count({
        where: { userId, status: 'COMPLETE' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        reports: jobs.map((job) => ({
          id: job.id,
          createdAt: job.createdAt.toISOString(),
          status: job.status,
          startupName: job.report?.startupName || 'Unknown Startup',
          startupTagline: job.report?.startupTagline || '',
          report: job.report
            ? {
                investmentScore: job.report.investmentScore,
                recommendation: job.report.recommendation,
              }
            : undefined,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/v1/report/:jobId
router.get('/:jobId', authenticate, async (req: AuthRequest, res: Response<ApiResponse<DueDiligenceReport>>) => {
  try {
    const job = await getJobOrNull(req.params.jobId as string);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    if (job.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const report = await getReportOrNull(req.params.jobId as string);
    if (!report) {
      res.status(404).json({ success: false, error: 'Report not found or not yet complete' });
      return;
    }

    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/report/:jobId
// Archive a completed report by removing the job and its dependent records.
router.delete('/:jobId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId as string;
    const job = await getJobOrNull(jobId);

    if (job && job.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.agentEvent.deleteMany({ where: { jobId } });
      await tx.report.deleteMany({ where: { jobId } });
      await tx.job.deleteMany({ where: { id: jobId } });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
