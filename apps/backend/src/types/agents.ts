/**
 * Agent-layer types: tool results, agent configs, and graph payload types.
 */
import { AgentName, AgentEventType } from '@startupai/shared';

// ─── Agent config ─────────────────────────────────────────────────────────────

export interface AgentConfig {
  name: AgentName;
  maxRetries: number;
  timeoutMs: number;
}

// ─── Agent result ─────────────────────────────────────────────────────────────

export interface AgentResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}

// ─── Tool outputs ─────────────────────────────────────────────────────────────

export interface PdfExtractionResult {
  rawText: string;
  pages: number;
  sections: Record<string, string>;
  source: 'text' | 'vision';
  charCount: number;
}

export interface CsvExtractionResult {
  rawRows: Record<string, string>[];
  columns: string[];
  metrics: {
    revenue?: number[];
    expenses?: number[];
    burnRate?: number[];
    runway?: number;
    grossMargin?: number;
    months?: string[];
  };
  summary: string;
  chartData: Array<{ month: string; revenue: number; expenses: number }>;
}

export interface WebExtractionResult {
  url: string;
  normalizedUrl?: string;
  finalUrl?: string;
  title: string;
  description: string;
  markdownContent: string;
  metadata?: Record<string, unknown>;
  company?: Record<string, unknown>;
  products?: unknown[];
  pricing?: unknown[];
  features?: unknown[];
  technologies?: unknown[];
  integrations?: unknown[];
  faqs?: unknown[];
  blogs?: unknown[];
  team?: unknown[];
  contacts?: Record<string, unknown>;
  socialLinks?: Record<string, unknown>;
  jsonLd?: unknown[];
  pages?: unknown[];
  crawl?: Record<string, unknown>;
  extractedSections: {
    about?: string;
    product?: string;
    pricing?: string;
    team?: string;
    contact?: string;
    faq?: string;
    blog?: string;
    security?: string;
    integrations?: string;
    investors?: string;
  };
}

// ─── RAG ─────────────────────────────────────────────────────────────────────

export interface VectorChunk {
  id: string;
  text: string;
  embedding?: number[];
  metadata: {
    jobId: string;
    source: 'pitch_deck' | 'website' | 'financials';
    section?: string;
    chunkIndex: number;
  };
}

export interface RAGQueryResult {
  chunks: string[];
  scores: number[];
  totalChunksIndexed: number;
}

// ─── LLM ─────────────────────────────────────────────────────────────────────

export type LLMTier = 'mini' | 'full';

export interface LLMCallMetrics {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  cost: number;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
