import { OpenAI } from 'openai';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
import { env } from './env';
import { logger } from '../utils/logger';

// ─── Native OpenAI Client (Used for Vision & raw calls) ─────────────────────────
export const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  ...(env.OPENAI_ORG_ID && { organization: env.OPENAI_ORG_ID }),
});

// ─── Swappable Embeddings ───────────────────────────────────────────────────
let embeddingsInstance: OpenAIEmbeddings;

if (env.EMBEDDING_PROVIDER === 'jina') {
  logger.info('Using Jina AI for embeddings');
  embeddingsInstance = new OpenAIEmbeddings({
    modelName: env.JINA_EMBEDDING_MODEL,
    openAIApiKey: env.JINA_API_KEY,
    configuration: {
      baseURL: 'https://api.jina.ai/v1',
    },
  });
} else {
  logger.info('Using OpenAI for embeddings');
  embeddingsInstance = new OpenAIEmbeddings({
    modelName: env.OPENAI_EMBEDDING_MODEL,
    openAIApiKey: env.OPENAI_API_KEY,
    dimensions: 1536,
  });
}

export const embeddings = embeddingsInstance;

// ─── Swappable Chat Models ──────────────────────────────────────────────────
let miniModelInstance: ChatOpenAI | ChatGroq;
let fullModelInstance: ChatOpenAI | ChatGroq;

import { RedisLangChainCache } from './redisCache';

const cache = new RedisLangChainCache();

if (env.AI_PROVIDER === 'groq') {
  logger.info('Using Groq as the AI Provider');
  if (!env.GROQ_API_KEY || env.GROQ_API_KEY.includes('test')) {
    logger.warn('Groq API Key looks like a test/dummy key. Inference will fail.');
  }
  
  miniModelInstance = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_MINI_MODEL,
    temperature: 0.3,
    cache,
  });

  fullModelInstance = new ChatGroq({
    apiKey: env.GROQ_API_KEY,
    model: env.GROQ_FULL_MODEL,
    temperature: 0.2,
    cache,
  });
} else {
  logger.info('Using OpenAI as the AI Provider');
  
  miniModelInstance = new ChatOpenAI({
    model: env.OPENAI_MINI_MODEL,
    temperature: 0.3,
    openAIApiKey: env.OPENAI_API_KEY,
    cache,
  });

  fullModelInstance = new ChatOpenAI({
    model: env.OPENAI_FULL_MODEL,
    temperature: 0.2,
    openAIApiKey: env.OPENAI_API_KEY,
    cache,
  });
}

export const miniModel = miniModelInstance;
export const fullModel = fullModelInstance;
