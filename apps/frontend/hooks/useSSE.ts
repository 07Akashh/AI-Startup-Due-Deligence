import { useEffect, useRef, useCallback } from 'react';

export interface SSEEvent {
  id: string;
  jobId: string;
  agent: string;
  eventType: 'start' | 'progress' | 'complete' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface UseSSEOptions {
  onEvent: (event: SSEEvent) => void;
  onDone?: () => void;
  onError?: (err: Event) => void;
}

export function useSSE(jobId: string | null, options: UseSSEOptions) {
  const esRef = useRef<EventSource | null>(null);
  const { onEvent, onDone, onError } = options;

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const url = `${API_URL}/api/v1/stream/${jobId}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('agent_update', (e: MessageEvent) => {
      try {
        const data: SSEEvent = JSON.parse(e.data);
        onEvent(data);
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener('done', () => {
      cleanup();
      onDone?.();
    });

    es.onerror = (err) => {
      console.warn('[SSE] Error:', err);
      cleanup();
      onError?.(err);
    };

    return cleanup;
  }, [jobId, onEvent, onDone, onError, cleanup]);

  return { close: cleanup };
}
