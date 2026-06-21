import { Pinecone } from '@pinecone-database/pinecone';
import { env } from './env';

export const pinecone = new Pinecone({
      apiKey: env.PINECONE_API_KEY,
    });

export const getPineconeIndex = () => {
  return pinecone.index(env.PINECONE_INDEX_NAME);
};
