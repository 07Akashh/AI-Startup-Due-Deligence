/**
 * Token counting utilities using a simple character-based approximation
 * (4 chars ≈ 1 token). For production accuracy, integrate tiktoken.
 */

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateCost(
  tokens: number,
  model: 'gpt-4o' | 'gpt-4o-mini' | 'text-embedding-3-small'
): number {
  const rates: Record<typeof model, { input: number; output: number }> = {
    'gpt-4o':                 { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
    'gpt-4o-mini':            { input: 0.15 / 1_000_000, output: 0.60  / 1_000_000 },
    'text-embedding-3-small': { input: 0.02 / 1_000_000, output: 0 },
  };
  const rate = rates[model];
  return tokens * rate.input;
}

/**
 * Truncates text to fit within a token budget.
 */
export function truncateToTokenBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + '...';
}

/**
 * Splits text into chunks of approximately `chunkTokens` size
 * with `overlapTokens` overlap between consecutive chunks.
 */
export function chunkTextByTokens(
  text: string,
  chunkTokens: number = 512,
  overlapTokens: number = 50
): string[] {
  const chunkChars = chunkTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkChars, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    if (end >= text.length) break;
    start = end - overlapChars;
  }

  return chunks;
}
