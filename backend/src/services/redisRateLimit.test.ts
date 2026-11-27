import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rateLimitState = vi.hoisted(() => ({
  limit: vi.fn(),
  redis: {},
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow(limit: number, window: string) {
      return { limit, window };
    }

    limit(identifier: string) {
      return rateLimitState.limit(identifier);
    }
  },
}));

vi.mock('../config/redis.js', () => ({
  redis: rateLimitState.redis,
  isRedisConfigured: true,
}));

import { publicDownloadRateLimit } from './redisRateLimit.js';
import { createScopedCacheKey } from './redisCache.js';

describe('Redis rate limit handler', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    rateLimitState.limit.mockReset();
    app = Fastify();
    app.get('/limited', { preHandler: [publicDownloadRateLimit] }, async () => ({ success: true }));
    app.get('/limited/:token', { preHandler: [publicDownloadRateLimit] }, async () => ({ success: true }));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects requests over the Redis limit', async () => {
    rateLimitState.limit.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 5000,
    });

    const response = await app.inject({ method: 'GET', url: '/limited' });

    expect(response.statusCode).toBe(429);
    expect(response.headers['retry-after']).toBe('5');
    expect(response.json().error.code).toBe('RATE_LIMITED');
  });

  it('fails open when Redis is unavailable so the existing global limiter can continue', async () => {
    rateLimitState.limit.mockRejectedValue(new Error('offline'));

    const response = await app.inject({ method: 'GET', url: '/limited' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
  });

  it('uses a hashed share-specific identifier for public download limits', async () => {
    rateLimitState.limit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      reset: Date.now() + 60_000,
    });

    const response = await app.inject({ method: 'GET', url: '/limited/share-token' });

    expect(response.statusCode).toBe(200);
    expect(rateLimitState.limit).toHaveBeenCalledWith(
      createScopedCacheKey('rate-limit:public-download', 'share:share-token')
    );
  });
});
