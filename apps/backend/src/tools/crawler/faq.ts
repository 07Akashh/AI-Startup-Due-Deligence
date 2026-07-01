import { FaqItem } from './types';

export function extractFaqs(text: string, sourcePage: string): FaqItem[] {
  const result: FaqItem[] = [];
  const blocks = text.split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const question = lines[0];
    const answer = lines.slice(1).join(' ');
    if (!/\?$/.test(question) && question.length < 20) continue;

    result.push({
      question,
      answer,
      category: inferCategory(question + ' ' + answer),
      sourcePage,
    });
  }

  return dedupe(result);
}

function inferCategory(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('price') || lower.includes('plan') || lower.includes('trial')) return 'pricing';
  if (lower.includes('security') || lower.includes('compliance')) return 'security';
  if (lower.includes('integration') || lower.includes('api')) return 'product';
  if (lower.includes('company') || lower.includes('team')) return 'company';
  return undefined;
}

function dedupe(items: FaqItem[]): FaqItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.question}|${item.answer}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
