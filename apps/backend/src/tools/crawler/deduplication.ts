import { hashText, normalizeWhitespace } from './utils';

export class DeduplicationIndex {
  private readonly urls = new Set<string>();
  private readonly paragraphs = new Set<string>();

  hasUrl(url: string): boolean {
    return this.urls.has(url);
  }

  addUrl(url: string): void {
    this.urls.add(url);
  }

  isDuplicateParagraph(text: string): boolean {
    const normalized = normalizeWhitespace(text).toLowerCase();
    if (!normalized) return true;
    const digest = hashText(normalized);
    if (this.paragraphs.has(digest)) return true;
    this.paragraphs.add(digest);
    return false;
  }
}