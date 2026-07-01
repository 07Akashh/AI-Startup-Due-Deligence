import * as cheerio from 'cheerio';
import { JsonLdEntry } from './types';
import { normalizeWhitespace } from './utils';

export function extractJsonLd($: cheerio.CheerioAPI, sourceUrl: string): JsonLdEntry[] {
  const entries: JsonLdEntry[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const text = normalizeWhitespace($(el).text());
    if (!text) return;

    const parsed = safeJsonParse(text);
    for (const item of parsed) {
      entries.push({
        sourceUrl,
        types: extractTypes(item),
        id: typeof item === 'object' && item !== null && '@id' in item ? String((item as Record<string, unknown>)['@id']) : undefined,
        raw: item,
      });
    }
  });

  return entries;
}

function safeJsonParse(text: string): unknown[] {
  try {
    const parsed = JSON.parse(text.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function extractTypes(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const type = (value as Record<string, unknown>)['@type'];
  if (Array.isArray(type)) return type.map(String);
  if (typeof type === 'string') return [type];
  return [];
}
