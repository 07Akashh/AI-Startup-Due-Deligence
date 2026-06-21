import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { pinecone } from '../config/pinecone';
import { env } from '../config/env';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  // DB check
  try {
    await prisma.job.findFirst();
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Pinecone check
  try {
    await pinecone.listIndexes();
    checks.pinecone = 'ok';
  } catch {
    checks.pinecone = 'error';
  }

  const healthy = Object.values(checks).every((v) => v === 'ok');

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    environment: env.NODE_ENV,
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
