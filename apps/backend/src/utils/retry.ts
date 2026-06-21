/**
 * Async retry with exponential backoff and jitter.
 * Used for LLM calls, Pinecone operations, and S3 uploads.
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    factor = 2,
    jitter = true,
    onRetry,
  } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts) break;

      // Calculate delay
      let delay = Math.min(initialDelayMs * Math.pow(factor, attempt - 1), maxDelayMs);
      if (jitter) {
        delay = delay * (0.75 + Math.random() * 0.5);
      }

      onRetry?.(attempt, lastError);
      await sleep(delay);
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Promise.allSettled wrapper that extracts fulfilled values and
 * logs/ignores rejected ones.
 */
export async function settleAll<T>(
  promises: Promise<T>[],
  onRejected?: (reason: unknown, index: number) => void
): Promise<T[]> {
  const results = await Promise.allSettled(promises);
  const fulfilled: T[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      fulfilled.push(result.value);
    } else {
      onRejected?.(result.reason, i);
    }
  }

  return fulfilled;
}
