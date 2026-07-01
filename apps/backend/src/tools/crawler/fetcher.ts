import axios from 'axios';
import http from 'node:http';
import https from 'node:https';
import { CrawlOptions, FetchResult } from './types';
import { sleep } from './utils';

function decodeBody(buffer: Buffer, contentType: string): string {
  const charsetMatch = /charset=([^;]+)/i.exec(contentType);
  const charset = charsetMatch?.[1]?.trim().toLowerCase() ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return buffer.toString('utf8');
  }
}

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  const code = error.code ?? '';
  return (
    status === 429 ||
    (typeof status === 'number' && status >= 500) ||
    ['ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNABORTED', 'DEPTH_ZERO_SELF_SIGNED_CERT'].includes(code)
  );
}

export async function fetchPage(url: string, options: CrawlOptions): Promise<FetchResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      const response = await axios.get<ArrayBuffer>(url, {
        timeout: options.timeoutMs,
        responseType: 'arraybuffer',
        maxRedirects: 8,
        validateStatus: () => true,
        headers: {
          'User-Agent': options.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true }),
        decompress: true,
      });

      const rawBody = Buffer.from(response.data);
      const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
      const finalUrl = String((response.request as { res?: { responseUrl?: string } } | undefined)?.res?.responseUrl ?? url);

      if (response.status >= 400) {
        const error = new Error(`HTTP ${response.status} while fetching ${url}`);
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      return {
        url,
        finalUrl,
        status: response.status,
        headers: normalizeHeaders(response.headers),
        contentType,
        body: decodeBody(rawBody, contentType),
        rawBody,
        redirected: finalUrl !== url,
      };
    } catch (error) {
      lastError = error;
      if (attempt >= options.retries || !isRetryable(error)) break;
      await sleep(options.backoffMs * Math.pow(2, attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value)])
  );
}
