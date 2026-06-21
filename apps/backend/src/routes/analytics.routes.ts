import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

const router = Router();

// GET /api/v1/analytics/dashboard (User specific)
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, totalReports: true },
    });

    const recentJobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        report: { select: { investmentScore: true, recommendation: true } },
      },
    });

    const totalRuntimes = await prisma.report.aggregate({
      where: { job: { userId } },
      _avg: { runtimeMs: true },
      _sum: { tokenUsage: true, creditsConsumed: true },
    });

    res.json({
      success: true,
      data: {
        credits: user?.credits || 0,
        totalReports: user?.totalReports || 0,
        averageRuntimeMs: totalRuntimes._avg.runtimeMs || 0,
        totalTokens: totalRuntimes._sum.tokenUsage || 0,
        creditsConsumed: totalRuntimes._sum.creditsConsumed || 0,
        recentJobs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/analytics/admin (Admin only)
router.get('/admin', authenticate, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalJobs = await prisma.job.count();
    const systemTokens = await prisma.report.aggregate({
      _sum: { tokenUsage: true },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalJobs,
        totalSystemTokens: systemTokens._sum.tokenUsage || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
