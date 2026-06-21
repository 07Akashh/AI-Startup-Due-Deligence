import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { runDueDiligenceGraph } from '../agents/graph';
import { updateJobStatus } from '../services/jobService';
import { AgentState } from '../agents/state';

const QUEUE_NAME = 'due-diligence-jobs';

// BullMQ requires maxRetriesPerRequest: null
const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
}) as any;

export const jobQueue = new Queue<Partial<AgentState>>(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true, // Keep it clean
    removeOnFail: false,    // Keep failed jobs for Dead Letter Queue analysis
  },
});

export const worker = new Worker<Partial<AgentState>>(
  QUEUE_NAME,
  async (job: Job) => {
    logger.info(`[JobQueue] Processing job ${job.id} for internal jobId ${job.data.jobId}`);
    try {
      await runDueDiligenceGraph(job.data);
    } catch (error: any) {
      logger.error(`[JobQueue] Job ${job.id} failed:`, error);
      await updateJobStatus(job.data.jobId!, 'FAILED', 'queue', error.message);
      
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
              data: { totalReports: { decrement: 1 } }
            });
            logger.info(`[JobQueue] Refunded 1 credit to user ${dbJob.userId} due to job failure`);
          }
        }
      } catch (refundError) {
        logger.error(`[JobQueue] Failed to process auto-refund for job ${job.data.jobId}:`, refundError);
      }

      throw error; // Let BullMQ handle the retry/failure logic
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

worker.on('completed', (job) => {
  logger.info(`[JobQueue] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`[JobQueue] Job ${job?.id} failed with error ${err.message}`);
});

export async function enqueueJob(data: Partial<AgentState>) {
  logger.info(`[JobQueue] Enqueueing job for jobId: ${data.jobId}`);
  await jobQueue.add('due-diligence', data);
}
