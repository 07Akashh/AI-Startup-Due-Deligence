import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

if (env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
  });

  redisClient.on('connect', () => logger.info('Connected to Redis'));
  redisClient.on('error', (err) => logger.error('Redis error:', err));
}

export { redisClient };
