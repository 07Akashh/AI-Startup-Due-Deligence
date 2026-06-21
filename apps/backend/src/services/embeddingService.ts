import { embeddings } from '../config/llm';
import { getPineconeIndex } from '../config/pinecone';
import { v4 as uuidv4 } from 'uuid';

export interface TextChunk {
  id: string;
  text: string;
  metadata: {
    jobId: string;
    source: 'pitch_deck' | 'website' | 'financials' | 'synthetic_research';
    section?: string;
    chunkIndex: number;
  };
}

const CHUNK_SIZE = 512;      // tokens approx (chars * 0.75 ≈ tokens)
const CHUNK_OVERLAP = 50;
const CHARS_PER_TOKEN = 4;   // rough estimate

export function chunkText(
  text: string,
  jobId: string,
  source: TextChunk['metadata']['source'],
  section?: string
): TextChunk[] {
  const chunkChars = CHUNK_SIZE * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP * CHARS_PER_TOKEN;
  const chunks: TextChunk[] = [];

  if (!text) return chunks;

  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkChars, text.length);
    const chunkText = text.slice(start, end).trim();

    if (chunkText.length > 50) {
      chunks.push({
        id: uuidv4(),
        text: chunkText,
        metadata: { jobId, source, section, chunkIndex: index++ },
      });
    }

    if (end >= text.length) break;
    start = end - overlapChars;
  }

  return chunks;
}

export async function upsertChunks(chunks: TextChunk[], namespace: string): Promise<void> {
  if (!chunks.length) return;

  const index = getPineconeIndex().namespace(namespace);

  // Batch embed in groups of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);
    const embeddingVectors = await embeddings.embedDocuments(texts);

    const vectors = batch.map((chunk, idx) => ({
      id: chunk.id,
      values: embeddingVectors[idx],
      metadata: {
        ...chunk.metadata,
        text: chunk.text.slice(0, 1000), // Store truncated text for retrieval
      },
    }));

    await index.upsert(vectors);
  }
}

export async function queryChunks(
  query: string,
  namespace: string,
  topK: number = 8
): Promise<string[]> {
  const index = getPineconeIndex().namespace(namespace);
  const queryEmbedding = await embeddings.embedQuery(query);

  const results = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  return results.matches
    .filter((m) => (m.score ?? 0) > 0.4)
    .map((m) => (m.metadata?.text as string) ?? '')
    .filter(Boolean);
}

export async function deleteNamespace(namespace: string): Promise<void> {
  try {
    const index = getPineconeIndex().namespace(namespace);
    await index.deleteAll();
  } catch (err) {
    console.warn(`[pinecone] Failed to delete namespace ${namespace}:`, err);
  }
}
