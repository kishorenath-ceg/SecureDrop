import { Redis } from '@upstash/redis';
import { env } from './env.js';

const redisUrl = env.UPSTASH_REDIS_REST_URL;
const redisToken = env.UPSTASH_REDIS_REST_TOKEN;

function createRedisClient() {
  if (!redisUrl || !redisToken) {
    return null;
  }

  try {
    const url = new URL(redisUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Unsupported Redis protocol.');
    }

    return new Redis({ url: redisUrl, token: redisToken });
  } catch {
    console.warn('Upstash Redis configuration is invalid; continuing without Redis.');
    return null;
  }
}

export const redis = createRedisClient();

export const isRedisConfigured = Boolean(redis);
