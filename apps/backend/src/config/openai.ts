import { OpenAI } from 'openai';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { env } from './env';

// Raw OpenAI client
export const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY || 'dummy-key',
  ...(env.OPENAI_ORG_ID && { organization: env.OPENAI_ORG_ID }),
});

// LangChain chat models — tiered by cost
export const gpt4oMini = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0.3,
  openAIApiKey: env.OPENAI_API_KEY,
});

export const gpt4o = new ChatOpenAI({
  model: 'gpt-4o',
  temperature: 0.2,
  openAIApiKey: env.OPENAI_API_KEY,
});

// Embeddings — text-embedding-3-small for cost efficiency
export const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
  openAIApiKey: env.OPENAI_API_KEY,
  dimensions: 1536,
});
