/**
 * Job Service — business logic for job lifecycle management.
 * Depends on JobRepository (never Prisma directly).
 */
import { Job, JobStatus } from '@startupai/shared';
import { jobRepository } from '../repositories/jobRepository';
import { JobFilters, PaginatedResult } from '../types/api';
import { NotFoundError } from '../types/errors';
import { logger } from '../utils/logger';

class JobService {
  private readonly log = logger.child({ service: 'JobService' });

  async createJob(data: {
    pitchDeckUrl?: string;
    websiteUrl?: string;
    financialCsvUrl?: string;
    contentHash?: string;
    userId?: string;
    startupStage?: string;
  }): Promise<Job> {
    this.log.info('Creating new job', {
      hasDecк: !!data.pitchDeckUrl,
      hasWebsite: !!data.websiteUrl,
      hasCsv: !!data.financialCsvUrl,
    });

    const job = await jobRepository.create({
      pitchDeckUrl: data.pitchDeckUrl,
      websiteUrl: data.websiteUrl,
      financialCsvUrl: data.financialCsvUrl,
      contentHash: data.contentHash,
      startupStage: data.startupStage,
      userId: data.userId,
    });

    this.log.info('Job created', { jobId: job.id });
    return job;
  }

  async getJob(id: string): Promise<Job> {
    return jobRepository.findByIdOrThrow(id);
  }

  async getJobOrNull(id: string): Promise<Job | null> {
    return jobRepository.findById(id);
  }

  async listJobs(filters: JobFilters, page: number, limit: number): Promise<PaginatedResult<Job>> {
    return jobRepository.findMany(filters, page, limit);
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    currentAgent?: string,
    errorMessage?: string
  ): Promise<Job> {
    this.log.debug('Updating job status', { jobId: id, status, currentAgent });
    return jobRepository.updateStatus(id, status, currentAgent, errorMessage);
  }

  async markJobFailed(id: string, agentName: string, reason: string): Promise<Job> {
    this.log.error('Job failed', { jobId: id, agentName, reason });
    return jobRepository.updateStatus(id, 'FAILED', agentName, reason);
  }

  async findJobByContentHash(hash: string): Promise<Job | null> {
    return jobRepository.findByContentHash(hash);
  }
}

export const jobService = new JobService();
export const createJob = jobService.createJob.bind(jobService);
export const getJob = jobService.getJob.bind(jobService);
export const getJobOrNull = jobService.getJobOrNull.bind(jobService);
export const listJobs = jobService.listJobs.bind(jobService);
export const updateJobStatus = jobService.updateJobStatus.bind(jobService);
export const markJobFailed = jobService.markJobFailed.bind(jobService);
export const findJobByContentHash = jobService.findJobByContentHash.bind(jobService);

