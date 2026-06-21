import { Response } from 'express';
import { EventEmitter } from 'events';
import { AgentName, AgentEventType } from '@startupai/shared';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// Global emitter for SSE — keyed by jobId
const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(200);

export interface SSEEvent {
  id: string;
  jobId: string;
  agent: AgentName;
  eventType: AgentEventType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export async function emitAgentEvent(
  jobId: string,
  agent: AgentName,
  eventType: AgentEventType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const event: SSEEvent = {
    id: uuidv4(),
    jobId,
    agent,
    eventType,
    message,
    metadata,
    createdAt: new Date().toISOString(),
  };

  // Persist to DB
  await prisma.agentEvent.create({
    data: {
      jobId,
      agent,
      eventType,
      message,
      metadata: (metadata as any) ?? undefined,
    },
  });

  // Broadcast to SSE listeners
  sseEmitter.emit(`job:${jobId}`, event);
}

export function subscribeToJobEvents(
  jobId: string,
  res: Response
): () => void {
  // Headers are already set and flushed by stream.routes.ts

  // Send a heartbeat comment every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  const listener = (event: SSEEvent) => {
    res.write(`id: ${event.id}\n`);
    res.write(`event: agent_update\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);

    if (
      (event.agent === 'action' && event.eventType === 'complete') ||
      event.eventType === 'error'
    ) {
      res.write('event: done\ndata: {}\n\n');
      res.end();
      cleanup();
    }
  };

  sseEmitter.on(`job:${jobId}`, listener);

  // Cleanup
  const cleanup = () => {
    clearInterval(heartbeat);
    sseEmitter.off(`job:${jobId}`, listener);
  };

  res.on('close', cleanup);
  res.on('error', cleanup);

  return cleanup;
}
