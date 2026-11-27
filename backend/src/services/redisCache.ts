import { createHash } from 'node:crypto';
import { isRedisConfigured, redis } from '../config/redis.js';

const CACHE_SCHEMA_VERSION = 1;

export const CACHE_TTL_SECONDS = {
  dashboardStats: 30,
  fileList: 45,
  publicShareLookup: 15,
} as const;

type CacheEnvelope = {
  version: number;
  value: unknown;
};

function isCacheEnvelope(value: unknown): value is CacheEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === CACHE_SCHEMA_VERSION &&
    'value' in value
  );
}

function logCacheFailure(operation: string) {
  console.warn(`Redis cache ${operation} failed; continuing without cached data.`);
}

export function createScopedCacheKey(namespace: string, scope: string) {
  const digest = createHash('sha256').update(scope).digest('hex');
  return `securedrop:${namespace}:${digest}`;
}

export function dashboardStatsCacheKey(userId: string) {
  return createScopedCacheKey('dashboard:stats', userId);
}

export function fileListCacheKey(userId: string) {
  return createScopedCacheKey('files:list', userId);
}

export function publicShareLookupCacheKey(identifier: string) {
  return createScopedCacheKey('share:lookup', identifier);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisConfigured || !redis) {
    return null;
  }

  try {
    const stored = await redis.get<unknown>(key);
    if (stored === null || stored === undefined) {
      return null;
    }

    const decoded = typeof stored === 'string' ? JSON.parse(stored) as unknown : stored;
    return isCacheEnvelope(decoded) ? decoded.value as T : null;
  } catch {
    logCacheFailure('read');
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  if (!isRedisConfigured || !redis) {
    return false;
  }

  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new RangeError('Redis cache TTL must be a positive whole number of seconds.');
  }

  try {
    const serialized = JSON.stringify({ version: CACHE_SCHEMA_VERSION, value });
    if (serialized === undefined) {
      return false;
    }

    await redis.set(key, serialized, { ex: ttlSeconds });
    return true;
  } catch {
    logCacheFailure('write');
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  if (!isRedisConfigured || !redis) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch {
    logCacheFailure('delete');
    return false;
  }
}

export async function invalidateUserDataCaches(userId: string) {
  await Promise.all([
    cacheDelete(dashboardStatsCacheKey(userId)),
    cacheDelete(fileListCacheKey(userId)),
  ]);
}

export async function invalidateDashboardStatsCache(userId: string) {
  await cacheDelete(dashboardStatsCacheKey(userId));
}
