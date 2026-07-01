import { createHash } from 'node:crypto';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.map((value) => normalizeWhitespace(String(value ?? ''))).filter(Boolean))];
}

export function ensureHttpProtocol(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

export function safeUrl(input: string): URL | null {
  try {
    return new URL(ensureHttpProtocol(input));
  } catch {
    return null;
  }
}

export function extractDomainRoot(hostname: string): string {
  const host = hostname.toLowerCase();
  return host.startsWith('www.') ? host.slice(4) : host;
}

export function looksLikeInternalHost(candidateHost: string, rootHost: string): boolean {
  const candidate = extractDomainRoot(candidateHost);
  const root = extractDomainRoot(rootHost);
  return candidate === root || candidate.endsWith(`.${root}`) || root.endsWith(`.${candidate}`);
}

export function stripTrackingParams(url: URL): void {
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid']) {
    url.searchParams.delete(key);
  }
}
