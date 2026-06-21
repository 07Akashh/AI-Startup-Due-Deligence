/**
 * Job Repository — all Prisma queries for the Job model.
 * Services depend on this interface, never on Prisma directly.
 */
import { Job as PrismaJob, Prisma } from '@prisma/client';
import { Job, JobStatus } from '@startupai/shared';
import { BaseRepository } from './baseRepository';
import { JobFilters, PaginatedResult } from '../types/api';
import { NotFoundError } from '../types/errors';

export class JobRepository extends BaseRepository {

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(data: Prisma.JobUncheckedCreateInput): Promise<Job> {
    const job = await this.db.job.create({ data });
    return this.map(job);
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<Job | null> {
    const job = await this.db.job.findUnique({ where: { id } });
    return job ? this.map(job) : null;
  }

  async findByIdOrThrow(id: string): Promise<Job> {
    const job = await this.findById(id);
    if (!job) throw new NotFoundError('Job', id);
    return job;
  }

  async findByContentHash(hash: string): Promise<Job | null> {
    const job = await this.db.job.findFirst({
      where: { contentHash: hash, status: 'COMPLETE' },
      orderBy: { createdAt: 'desc' },
    });
    return job ? this.map(job) : null;
  }

  async findMany(
    filters: JobFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<Job>> {
    const where: Prisma.JobWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.fromDate && { createdAt: { gte: filters.fromDate } }),
      ...(filters.toDate && { createdAt: { lte: filters.toDate } }),
    };

    const [items, total] = await Promise.all([
      this.db.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.job.count({ where }),
    ]);

    return {
      items: items.map(j => this.map(j)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    status: JobStatus,
    currentAgent?: string,
    errorMessage?: string
  ): Promise<Job> {
    const job = await this.db.job.update({
      where: { id },
      data: {
        status,
        ...(currentAgent !== undefined && { currentAgent }),
        ...(errorMessage !== undefined && { errorMessage }),
      },
    });
    return this.map(job);
  }

  async update(id: string, data: Prisma.JobUpdateInput): Promise<Job> {
    const job = await this.db.job.update({ where: { id }, data });
    return this.map(job);
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    await this.db.job.delete({ where: { id } });
  }

  // ─── Mapper ──────────────────────────────────────────────────────────────────

  private map(raw: PrismaJob): Job {
    return {
      id: raw.id,
      status: raw.status as JobStatus,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
      pitchDeckUrl: raw.pitchDeckUrl ?? undefined,
      websiteUrl: raw.websiteUrl ?? undefined,
      financialCsvUrl: raw.financialCsvUrl ?? undefined,
      currentAgent: raw.currentAgent ?? undefined,
      errorMessage: raw.errorMessage ?? undefined,
      startupStage: raw.startupStage ?? undefined,
      userId: raw.userId ?? undefined,
    };
  }
}

// Singleton export
export const jobRepository = new JobRepository();
