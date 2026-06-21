import { Router, Request, Response } from 'express';
import { subscribeToJobEvents } from '../services/streamService';
import { getJob } from '../services/jobService';
import { prisma } from '../config/database';

const router = Router();

// GET /api/v1/stream/:jobId — SSE stream of agent events
router.get('/:jobId', async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string;

  // Validate job exists
  const job = await getJob(jobId);
  if (!job) {
    res.status(404).json({ success: false, error: 'Job not found' });
    return;
  }

  // Send any historical events first
  const pastEvents = await prisma.agentEvent.findMany({
    where: { jobId },
    orderBy: { createdAt: 'asc' },
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Replay historical events
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

  // If already complete, close
  if (job.status === 'COMPLETE' || job.status === 'FAILED') {
    res.write('event: done\ndata: {}\n\n');
    res.end();
    return;
  }

  // Subscribe to live events
  subscribeToJobEvents(jobId as string, res);
});

export default router;
