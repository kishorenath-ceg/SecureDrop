import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redisState = vi.hoisted(() => ({
  configured: true,
  client: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('../config/redis.js', () => ({
  get redis() {
    return redisState.configured ? redisState.client : null;
  },
  get isRedisConfigured() {
    return redisState.configured;
  },
}));

import {
  CACHE_TTL_SECONDS,
  cacheDelete,
  cacheGet,
  cacheSet,
  createScopedCacheKey,
  dashboardStatsCacheKey,
  fileListCacheKey,
  invalidateUserDataCaches,
} from './redisCache.js';

beforeEach(() => {
  redisState.configured = true;
  redisState.client.get.mockReset();
  redisState.client.set.mockReset();
  redisState.client.del.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Redis cache utility', () => {
  it('round-trips JSON values with the requested TTL', async () => {
    redisState.client.get.mockResolvedValue({ version: 1, value: { count: 4 } });
    redisState.client.set.mockResolvedValue('OK');

    await expect(cacheGet('stats:user-a')).resolves.toEqual({ count: 4 });
    await expect(cacheSet('stats:user-a', { count: 4 }, 30)).resolves.toBe(true);

    expect(redisState.client.set).toHaveBeenCalledWith(
      'stats:user-a',
      JSON.stringify({ version: 1, value: { count: 4 } }),
      { ex: 30 }
    );
  });

  it('returns cache misses and keeps requests running when Redis is not configured', async () => {
    redisState.configured = false;

    await expect(cacheGet('missing')).resolves.toBeNull();
    await expect(cacheSet('missing', { value: 1 }, 30)).resolves.toBe(false);
    await expect(cacheDelete('missing')).resolves.toBe(false);

    expect(redisState.client.get).not.toHaveBeenCalled();
    expect(redisState.client.set).not.toHaveBeenCalled();
    expect(redisState.client.del).not.toHaveBeenCalled();
  });

  it('treats Redis failures and malformed JSON as cache misses', async () => {
    redisState.client.get.mockRejectedValueOnce(new Error('offline'));
    await expect(cacheGet('offline')).resolves.toBeNull();

    redisState.client.get.mockResolvedValueOnce('{invalid');
    await expect(cacheGet('malformed')).resolves.toBeNull();

    redisState.client.set.mockRejectedValueOnce(new Error('offline'));
    await expect(cacheSet('offline', { value: 1 }, 30)).resolves.toBe(false);

    redisState.client.del.mockRejectedValueOnce(new Error('offline'));
    await expect(cacheDelete('offline')).resolves.toBe(false);
  });

  it('hashes private scopes into cache keys', () => {
    expect(createScopedCacheKey('dashboard:stats', 'user-a')).not.toContain('user-a');
    expect(createScopedCacheKey('dashboard:stats', 'user-a')).not.toBe(
      createScopedCacheKey('dashboard:stats', 'user-b')
    );
    expect(dashboardStatsCacheKey('user-a')).not.toBe(fileListCacheKey('user-a'));
  });

  it('invalidates dashboard and file-list entries only for the selected user', async () => {
    redisState.client.del.mockResolvedValue(1);

    await invalidateUserDataCaches('user-a');

    expect(redisState.client.del).toHaveBeenCalledTimes(2);
    expect(redisState.client.del).toHaveBeenCalledWith(dashboardStatsCacheKey('user-a'));
    expect(redisState.client.del).toHaveBeenCalledWith(fileListCacheKey('user-a'));
    expect(CACHE_TTL_SECONDS).toMatchObject({ dashboardStats: 30, fileList: 45 });
  });
});
