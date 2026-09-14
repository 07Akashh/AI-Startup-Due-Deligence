// Backend environment schema — validated at startup via Zod. Process exits if any required var is missing.
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Auth (optional JWT for production)
  JWT_SECRET: z.string().default('dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // AI Settings
  AI_PROVIDER: z.enum(['openai', 'groq', 'openrouter']).default('openrouter'),
  EMBEDDING_PROVIDER: z.enum(['openai', 'jina']).default('openai'),

  // OpenRouter (Multi-Model Agent Routing)
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENROUTER_REASONING_MODEL: z.string().default('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'),
  OPENROUTER_EXTRACTION_MODEL: z.string().default('nex-agi/nex-n2.5-mini:free'),
  OPENROUTER_KNOWLEDGE_MODEL: z.string().default('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'),
  OPENROUTER_VALIDATOR_MODEL: z.string().default('nex-agi/nex-n2.5-mini:free'),
  OPENROUTER_MINI_MODEL: z.string().default('liquid/lfm-2.5-2.6b:free'),
  OPENROUTER_FULL_MODEL: z.string().default('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ORG_ID: z.string().optional(),
  OPENAI_MINI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_FULL_MODEL: z.string().default('gpt-4o'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Groq
  GROQ_API_KEY: z.string().optional(),
  GROQ_MINI_MODEL: z.string().default('qwen/qwen3.8-27b'),
  GROQ_FULL_MODEL: z.string().default('openai/gpt-oss-120b'),

  // Jina AI
  JINA_API_KEY: z.string().optional(),
  JINA_EMBEDDING_MODEL: z.string().default('jina-embeddings-v3'),

  // Pinecone
  PINECONE_API_KEY: z.string().min(1, 'PINECONE_API_KEY is required'),
  PINECONE_INDEX_NAME: z.string().default('startupai-due-diligence'),
  PINECONE_ENVIRONMENT: z.string().default('us-east-1'),

  // Cloudinary Storage
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  // CORS
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  JOB_RATE_LIMIT_MAX: z.coerce.number().default(10),

  // Agent settings
  MAX_VALIDATOR_RETRIES: z.coerce.number().default(2),
  RAG_TOP_K: z.coerce.number().default(8),
  CHUNK_SIZE_TOKENS: z.coerce.number().default(512),
  CHUNK_OVERLAP_TOKENS: z.coerce.number().default(50),
  PINECONE_NAMESPACE_TTL_HOURS: z.coerce.number().default(48),

  // Optional: Resend email
  RESEND_API_KEY: z.string().optional(),

  // Redis (optional caching)
  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

// Derived helpers
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
