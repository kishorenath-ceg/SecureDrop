import { Ratelimit } from '@upstash/ratelimit';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { isRedisConfigured, redis } from '../config/redis.js';
import { createScopedCacheKey } from './redisCache.js';

type RateLimitPolicy = {
  name: string;
  limit: number;
  window: `${number} ${'s' | 'm' | 'h'}`;
  identifier: (request: FastifyRequest) => string;
};

type RateLimitHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

const limiters = new Map<string, Ratelimit>();

function getLimiter(policy: RateLimitPolicy) {
  if (!redis || !isRedisConfigured) {
    return null;
  }

  const key = `${policy.name}:${policy.limit}:${policy.window}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(policy.limit, policy.window),
      prefix: `securedrop:rate-limit:${policy.name}`,
      analytics: false,
    });
    limiters.set(key, limiter);
  }

  return limiter;
}

export function createRedisRateLimit(policy: RateLimitPolicy): RateLimitHandler {
  return async (request, reply) => {
    try {
      const limiter = getLimiter(policy);
      if (!limiter) {
        return;
      }

      const identifier = policy.identifier(request);
      const result = await limiter.limit(createScopedCacheKey(`rate-limit:${policy.name}`, identifier));

      reply
        .header('RateLimit-Limit', String(result.limit))
        .header('RateLimit-Remaining', String(result.remaining));

      if (!result.success) {
        const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
        reply.header('Retry-After', String(retryAfter));
        return reply.code(429).send({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please retry shortly.',
          },
        });
      }
    } catch {
      request.log.warn('Redis rate limiting failed; the existing global rate limit remains active.');
    }
  };
}

function requestIp(request: FastifyRequest) {
  return request.ip || 'unknown';
}

function shareIdentifier(request: FastifyRequest) {
  const params = request.params as { token?: string };
  const query = request.query as { token?: string };
  const token = params.token ?? query.token;
  const userId = (request as FastifyRequest & { user?: { id: string } }).user?.id;
  return token ? `share:${token}` : userId ? `user:${userId}` : `ip:${requestIp(request)}`;
}

export const authSessionRateLimit = createRedisRateLimit({
  name: 'auth-session',
  limit: 120,
  window: '1 m',
  identifier: (request) => `ip:${requestIp(request)}`,
});

export const shareCreationRateLimit = createRedisRateLimit({
  name: 'share-create',
  limit: 20,
  window: '1 m',
  identifier: (request) => {
    const userId = (request as FastifyRequest & { user?: { id: string } }).user?.id;
    return userId ? `user:${userId}` : `ip:${requestIp(request)}`;
  },
});

export const publicDownloadRateLimit = createRedisRateLimit({
  name: 'public-download',
  limit: 30,
  window: '1 m',
  identifier: shareIdentifier,
});

export const sharePasswordRateLimit = createRedisRateLimit({
  name: 'share-password',
  limit: 8,
  window: '1 m',
  identifier: (request) => {
    const token = (request.params as { token?: string }).token;
    return token ? `share:${token}` : `ip:${requestIp(request)}`;
  },
});
