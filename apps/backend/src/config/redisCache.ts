import { BaseCache } from '@langchain/core/caches';
import { Generation } from '@langchain/core/outputs';
import { redisClient } from './redis';

export class RedisLangChainCache extends BaseCache {
  private prefix = 'langchain:cache:';

  async lookup(prompt: string, llmKey: string): Promise<Generation[] | null> {
    if (!redisClient) return null;
    
    const key = this.prefix + this.hash(prompt, llmKey);
    const result = await redisClient.get(key);
    
    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        return null;
      }
    }
    return null;
  }

  async update(prompt: string, llmKey: string, value: Generation[]): Promise<void> {
    if (!redisClient) return;
    
    const key = this.prefix + this.hash(prompt, llmKey);
    // Cache for 24 hours
    await redisClient.set(key, JSON.stringify(value), 'EX', 86400);
  }

  private hash(prompt: string, llmKey: string): string {
    // Basic hash function
    let hash = 0;
    const str = prompt + llmKey;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(16);
  }
}
