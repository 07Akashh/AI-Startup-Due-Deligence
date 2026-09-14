import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { runDueDiligenceGraph } from '../agents/graph';
import { updateJobStatus } from '../services/jobService';
import { AgentState } from '../agents/state';

const QUEUE_NAME = 'due-diligence-jobs';

const redisClient = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const connection = redisClient as unknown as ConnectionOptions;

export const jobQueue = new Queue<Partial<AgentState>>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const worker = new Worker<Partial<AgentState>>(
  QUEUE_NAME,
  async (job: Job<Partial<AgentState>>) => {
    logger.info(`[JobQueue] Processing job ${job.id} for internal jobId ${job.data.jobId}`);
    try {
      await runDueDiligenceGraph(job.data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[JobQueue] Job ${job.id} failed:`, error);
      await updateJobStatus(job.data.jobId || '', 'FAILED', 'queue', errorMessage);

      // Auto-refund credit on failure
      try {
        if (job.data.jobId) {
          const { getJobOrNull } = await import('../services/jobService');
          const { CreditService } = await import('../services/creditService');
          const { prisma } = await import('../config/database');

          const dbJob = await getJobOrNull(job.data.jobId);
          if (dbJob && dbJob.userId) {
            await CreditService.grantCredits(dbJob.userId, 1, 'Auto-refund: Job failed');
            await prisma.user.update({
              where: { id: dbJob.userId },
              data: { totalReports: { decrement: 1 } },
            });
            logger.info(`[JobQueue] Refunded 1 credit to user ${dbJob.userId} due to job failure`);
          }
        }
      } catch (refundError: unknown) {
        logger.error(`[JobQueue] Failed to process auto-refund for job ${job.data.jobId}:`, refundError);
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on('completed', (job: Job) => {
  logger.info(`[JobQueue] Job ${job.id} completed successfully`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error(`[JobQueue] Job ${job?.id} failed with error ${err.message}`);
});

export async function enqueueJob(data: Partial<AgentState>) {
  logger.info(`[JobQueue] Enqueueing job for jobId: ${data.jobId}`);
  await jobQueue.add('due-diligence', data);
}
