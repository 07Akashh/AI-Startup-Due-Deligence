import { Router, Request, Response } from 'express';
import { subscribeToJobEvents } from '../services/streamService';
import { getJob } from '../services/jobService';
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

const router = Router();

/**
 * GET /api/v1/stream/:jobId/events
 * Vercel-compatible polling endpoint to fetch agent events directly from database.
 * Used as a zero-failure fallback for environments where persistent WebSocket/SSE
 * connections are closed or restricted by serverless execution limits.
 */
router.get('/:jobId/events', async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;
  const after = req.query.after as string | undefined;

  try {
    const job = await getJob(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const whereClause: Prisma.AgentEventWhereInput = { jobId };
    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        whereClause.createdAt = { gt: afterDate };
      }
    }

    const events = await prisma.agentEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      success: true,
      data: {
        jobId,
        status: job.status,
        currentAgent: job.currentAgent,
        errorMessage: job.errorMessage,
        isComplete: job.status === 'COMPLETE',
        isFailed: job.status === 'FAILED',
        events: events.map((event) => ({
          id: event.id,
          jobId: event.jobId,
          agent: event.agent,
          eventType: event.eventType,
          message: event.message,
          metadata: event.metadata as Record<string, unknown> | undefined,
          createdAt: event.createdAt.toISOString(),
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * GET /api/v1/stream/:jobId — SSE stream of agent events with keep-alive heartbeats
 */
router.get('/:jobId', async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;

  const job = await getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  const pastEvents = await prisma.agentEvent.findMany({
    where: { jobId },
    orderBy: { createdAt: 'asc' },
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  for (const event of pastEvents) {
    res.write(`id: ${event.id}\n`);
    res.write(`event: agent_update\n`);
    res.write(
      `data: ${JSON.stringify({
        id: event.id,
        jobId: event.jobId,
        agent: event.agent,
        eventType: event.eventType,
        message: event.message,
        metadata: event.metadata,
        createdAt: event.createdAt.toISOString(),
      })}\n\n`
    );
  }

  if (job.status === 'COMPLETE' || job.status === 'FAILED') {
    res.write('event: done\ndata: {}\n\n');
    res.end();
    return;
  }

  subscribeToJobEvents(jobId as string, res);
});

export default router;
