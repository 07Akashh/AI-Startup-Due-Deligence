/**
 * AgentEvent Repository — persists and queries agent event logs.
 */
import { AgentEvent as PrismaEvent, Prisma } from '@prisma/client';
import { AgentEvent, AgentName, AgentEventType } from '@startupai/shared';
import { BaseRepository } from './baseRepository';

export class AgentEventRepository extends BaseRepository {

  async create(data: {
    jobId: string;
    agent: AgentName;
    eventType: AgentEventType;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<AgentEvent> {
    const event = await this.db.agentEvent.create({
      data: {
        jobId: data.jobId,
        agent: data.agent,
        eventType: data.eventType,
        message: data.message,
        metadata: data.metadata as Prisma.InputJsonValue ?? undefined,
      },
    });
    return this.map(event);
  }

  async findByJobId(jobId: string): Promise<AgentEvent[]> {
    const events = await this.db.agentEvent.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });
    return events.map(e => this.map(e));
  }

  async deleteByJobId(jobId: string): Promise<void> {
    await this.db.agentEvent.deleteMany({ where: { jobId } });
  }

  private map(raw: PrismaEvent): AgentEvent {
    return {
      id: raw.id,
      jobId: raw.jobId,
      agent: raw.agent as AgentName,
      eventType: raw.eventType as AgentEventType,
      message: raw.message,
      metadata: (raw.metadata as Record<string, unknown>) ?? undefined,
      createdAt: raw.createdAt.toISOString(),
    };
  }
}

export const agentEventRepository = new AgentEventRepository();
