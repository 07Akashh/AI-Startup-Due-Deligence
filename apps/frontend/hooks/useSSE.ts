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
  onError?: (err: unknown) => void;
}

/**
 * Vercel-compatible real-time agent event hook.
 * Uses Server-Sent Events (SSE) with an automatic resilient database-backed polling fallback
 * when running on Vercel serverless / Edge environments where long-lived TCP sockets are dropped.
 */
export function useSSE(jobId: string | null, options: UseSSEOptions) {
  const esRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isCompleteRef = useRef(false);
  const lastTimestampRef = useRef<string | null>(null);

  const { onEvent, onDone, onError } = options;

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (!jobId || isCompleteRef.current || pollTimerRef.current) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    const poll = async () => {
      if (isCompleteRef.current) {
        cleanup();
        return;
      }

      try {
        const query = lastTimestampRef.current ? `?after=${encodeURIComponent(lastTimestampRef.current)}` : '';
        const res = await fetch(`${API_URL}/api/v1/stream/${jobId}/events${query}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;

        const json = await res.json();
        if (json.success && json.data) {
          const { events, isComplete, isFailed } = json.data;

          if (Array.isArray(events)) {
            for (const ev of events as SSEEvent[]) {
              if (!seenIdsRef.current.has(ev.id)) {
                seenIdsRef.current.add(ev.id);
                lastTimestampRef.current = ev.createdAt;
                onEvent(ev);
              }
            }
          }

          if (isComplete || isFailed) {
            isCompleteRef.current = true;
            cleanup();
            onDone?.();
          }
        }
      } catch (e) {
        console.warn('[Realtime Polling] Error:', e);
      }
    };

    // Execute immediately and then poll every 1.5s
    poll();
    pollTimerRef.current = setInterval(poll, 1500);
  }, [jobId, onEvent, onDone, cleanup]);

  useEffect(() => {
    if (!jobId) return;

    seenIdsRef.current.clear();
    isCompleteRef.current = false;
    lastTimestampRef.current = null;

    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const url = `${API_URL}/api/v1/stream/${jobId}`;

    let sseConnected = false;

    try {
      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        sseConnected = true;
      };

      es.addEventListener('agent_update', (e: MessageEvent) => {
        try {
          const data: SSEEvent = JSON.parse(e.data);
          if (!seenIdsRef.current.has(data.id)) {
            seenIdsRef.current.add(data.id);
            lastTimestampRef.current = data.createdAt;
            onEvent(data);
          }
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener('done', () => {
        isCompleteRef.current = true;
        cleanup();
        onDone?.();
      });

      es.onerror = (err) => {
        // SSE disconnected / blocked / closed by Vercel serverless limit
        // Gracefully switch to database-backed polling fallback
        console.warn('[SSE] Connection closed or unavailable, switching to resilient polling fallback:', err);
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        if (!isCompleteRef.current) {
          startPolling();
        }
        onError?.(err);
      };
    } catch {
      // Fallback directly to polling if EventSource is not supported
      startPolling();
    }

    return cleanup;
  }, [jobId, onEvent, onDone, onError, cleanup, startPolling]);

  return { close: cleanup };
}
