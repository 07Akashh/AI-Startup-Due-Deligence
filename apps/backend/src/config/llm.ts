import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatGroq } from '@langchain/groq';
import { env } from './env';
import { logger } from '../utils/logger';
import { RedisLangChainCache } from './redisCache';

const cache = new RedisLangChainCache();

// ─── ChatOpenRouter LangChain Class ──────────────────────────────────────────
export class ChatOpenRouter extends ChatOpenAI {
  constructor(
    fields?:
      | string
      | {
          model?: string;
          modelName?: string;
          apiKey?: string;
          openAIApiKey?: string;
          temperature?: number;
          maxTokens?: number;
          streaming?: boolean;
        },
    options?: { temperature?: number; apiKey?: string }
  ) {
    if (typeof fields === 'string') {
      super({
        model: fields,
        modelName: fields,
        temperature: options?.temperature ?? 0.2,
        apiKey: options?.apiKey || env.OPENROUTER_API_KEY || 'dummy-key',
        configuration: {
          baseURL: env.OPENROUTER_BASE_URL,
          defaultHeaders: {
            'HTTP-Referer': 'https://startupai.local',
            'X-Title': 'StartupAI Multi-Agent Due Diligence',
          },
        },
        cache,
      });
    } else {
      const targetModel = fields?.model || fields?.modelName || env.OPENROUTER_FULL_MODEL;
      super({
        model: targetModel,
        modelName: targetModel,
        temperature: fields?.temperature ?? 0.2,
        apiKey: fields?.apiKey || fields?.openAIApiKey || env.OPENROUTER_API_KEY || 'dummy-key',
        maxTokens: fields?.maxTokens,
        streaming: fields?.streaming ?? false,
        configuration: {
          baseURL: env.OPENROUTER_BASE_URL,
          defaultHeaders: {
            'HTTP-Referer': 'https://startupai.local',
            'X-Title': 'StartupAI Multi-Agent Due Diligence',
          },
        },
        cache,
      });
    }
  }
}

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

// ─── Swappable Specialized Agent Chat Models ────────────────────────────────
let reasoningModelInstance: ChatOpenRouter | ChatOpenAI | ChatGroq;
let knowledgeModelInstance: ChatOpenRouter | ChatOpenAI | ChatGroq;
let validatorModelInstance: ChatOpenRouter | ChatOpenAI | ChatGroq;
let extractionModelInstance: ChatOpenRouter | ChatOpenAI | ChatGroq;
let miniModelInstance: ChatOpenRouter | ChatOpenAI | ChatGroq;
let fullModelInstance: ChatOpenRouter | ChatOpenAI | ChatGroq;

if (env.AI_PROVIDER === 'openrouter') {
  logger.info('Using OpenRouter as the AI Provider with Multi-Model Agent Routing');

  const createOpenRouterChat = (modelName: string, temperature = 0.2) =>
    new ChatOpenRouter({
      model: modelName,
      apiKey: env.OPENROUTER_API_KEY || 'dummy-key',
      temperature,
    });

  reasoningModelInstance = createOpenRouterChat(env.OPENROUTER_REASONING_MODEL, 0.2);
  knowledgeModelInstance = createOpenRouterChat(env.OPENROUTER_KNOWLEDGE_MODEL, 0.3);
  validatorModelInstance = createOpenRouterChat(env.OPENROUTER_VALIDATOR_MODEL, 0.0);
  extractionModelInstance = createOpenRouterChat(env.OPENROUTER_EXTRACTION_MODEL, 0.1);
  miniModelInstance = createOpenRouterChat(env.OPENROUTER_MINI_MODEL, 0.3);
  fullModelInstance = createOpenRouterChat(env.OPENROUTER_FULL_MODEL, 0.2);

} else if (env.AI_PROVIDER === 'groq') {
  logger.info('Using Groq as the AI Provider');
  if (!env.GROQ_API_KEY || env.GROQ_API_KEY.includes('test')) {
    logger.warn('Groq API Key looks like a test/dummy key. Inference will fail.');
  }

  const createGroqChat = (modelName: string, temperature = 0.2) =>
    new ChatGroq({
      apiKey: env.GROQ_API_KEY,
      model: modelName,
      temperature,
      cache,
    });

  reasoningModelInstance = createGroqChat(env.GROQ_FULL_MODEL, 0.2);
  knowledgeModelInstance = createGroqChat(env.GROQ_MINI_MODEL, 0.3);
  validatorModelInstance = createGroqChat(env.GROQ_FULL_MODEL, 0.0);
  extractionModelInstance = createGroqChat(env.GROQ_MINI_MODEL, 0.1);
  miniModelInstance = createGroqChat(env.GROQ_MINI_MODEL, 0.3);
  fullModelInstance = createGroqChat(env.GROQ_FULL_MODEL, 0.2);

} else {
  logger.info('Using OpenAI as the AI Provider');

  const createOpenAIChat = (modelName: string, temperature = 0.2) =>
    new ChatOpenAI({
      model: modelName,
      temperature,
      openAIApiKey: env.OPENAI_API_KEY,
      cache,
    });

  reasoningModelInstance = createOpenAIChat(env.OPENAI_FULL_MODEL, 0.2);
  knowledgeModelInstance = createOpenAIChat(env.OPENAI_MINI_MODEL, 0.3);
  validatorModelInstance = createOpenAIChat(env.OPENAI_FULL_MODEL, 0.0);
  extractionModelInstance = createOpenAIChat(env.OPENAI_MINI_MODEL, 0.1);
  miniModelInstance = createOpenAIChat(env.OPENAI_MINI_MODEL, 0.3);
  fullModelInstance = createOpenAIChat(env.OPENAI_FULL_MODEL, 0.2);
}

// Export specialized models for agent-based execution
export const reasoningModel = reasoningModelInstance;
export const knowledgeModel = knowledgeModelInstance;
export const validatorModel = validatorModelInstance;
export const extractionModel = extractionModelInstance;
export const miniModel = miniModelInstance;
export const fullModel = fullModelInstance;
