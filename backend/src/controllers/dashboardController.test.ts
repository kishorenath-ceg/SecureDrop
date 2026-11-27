import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dashboardState = vi.hoisted(() => ({
  filesByUser: new Map<string, Array<{ sizeBytes: number; id: string; createdAt: string; originalName: string }>>(),
  sharesByUser: new Map<string, Array<{
    isActive: boolean;
    isRevoked: boolean;
    expiresAt: string | null;
    downloadCount: number;
    maxDownloads: number | null;
    fileId: string | null;
    fileIds: string[];
    customSlug: string | null;
  }>>(),
  cache: new Map<string, unknown>(),
  writes: [] as Array<{ key: string; value: unknown; ttl: number }>,
  listFiles: vi.fn(),
  listShares: vi.fn(),
}));

vi.mock('../config/env.js', () => ({ env: { APP_URL: 'https://securedrop.example' } }));
vi.mock('../services/fileService.js', () => ({
  listFilesForOwner: dashboardState.listFiles,
}));
vi.mock('../services/shareService.js', () => ({
  buildPublicShareUrl: (_baseUrl: string, slug?: string | null) => `https://securedrop.example/${slug ?? 'file'}`,
  getShareFileIds: (share: { fileId: string | null; fileIds: string[] }) => share.fileIds.length ? share.fileIds : share.fileId ? [share.fileId] : [],
  listShareLinksForOwner: dashboardState.listShares,
}));
vi.mock('../services/redisCache.js', () => ({
  CACHE_TTL_SECONDS: { dashboardStats: 30 },
  cacheGet: async (key: string) => dashboardState.cache.get(key) ?? null,
  cacheSet: async (key: string, value: unknown, ttl: number) => {
    dashboardState.cache.set(key, value);
    dashboardState.writes.push({ key, value, ttl });
    return true;
  },
  dashboardStatsCacheKey: (userId: string) => `dashboard:${userId}`,
}));

import { dashboardStatsController } from './dashboardController.js';

describe('dashboard stats Redis cache', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    dashboardState.cache.clear();
    dashboardState.writes.length = 0;
    dashboardState.filesByUser.clear();
    dashboardState.sharesByUser.clear();
    dashboardState.listFiles.mockReset().mockImplementation(async (userId: string) => dashboardState.filesByUser.get(userId) ?? []);
    dashboardState.listShares.mockReset().mockImplementation(async (userId: string) => dashboardState.sharesByUser.get(userId) ?? []);

    dashboardState.filesByUser.set('user-one', [{
      id: 'file-one',
      originalName: 'one.txt',
      sizeBytes: 1024,
      createdAt: new Date().toISOString(),
    }]);
    dashboardState.filesByUser.set('user-two', [
      { id: 'file-two-a', originalName: 'two-a.txt', sizeBytes: 2048, createdAt: new Date().toISOString() },
      { id: 'file-two-b', originalName: 'two-b.txt', sizeBytes: 2048, createdAt: new Date().toISOString() },
    ]);
    dashboardState.sharesByUser.set('user-one', [{
      isActive: true,
      isRevoked: false,
      expiresAt: null,
      downloadCount: 2,
      maxDownloads: null,
      fileId: 'file-one',
      fileIds: ['file-one'],
      customSlug: 'one',
    }]);
    dashboardState.sharesByUser.set('user-two', [{
      isActive: true,
      isRevoked: false,
      expiresAt: null,
      downloadCount: 9,
      maxDownloads: null,
      fileId: 'file-two-a',
      fileIds: ['file-two-a'],
      customSlug: 'two',
    }]);

    app = Fastify();
    app.get('/stats/:userId', async (request, reply) => {
      const { userId } = request.params as { userId: string };
      (request as FastifyRequest & { user?: { id: string } }).user = { id: userId };
      return dashboardStatsController(request, reply);
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('scopes cached statistics to each authenticated user and uses a 30-second TTL', async () => {
    const firstUserResponse = await app.inject({ method: 'GET', url: '/stats/user-one' });
    const cachedFirstUserResponse = await app.inject({ method: 'GET', url: '/stats/user-one' });
    const secondUserResponse = await app.inject({ method: 'GET', url: '/stats/user-two' });

    expect(firstUserResponse.json().data).toMatchObject({ totalFiles: 1, totalDownloads: 2 });
    expect(cachedFirstUserResponse.json().data).toEqual(firstUserResponse.json().data);
    expect(secondUserResponse.json().data).toMatchObject({ totalFiles: 2, totalDownloads: 9 });
    expect(dashboardState.listFiles).toHaveBeenCalledTimes(2);
    expect(dashboardState.listShares).toHaveBeenCalledTimes(2);
    expect(dashboardState.writes.map(({ key, ttl }) => ({ key, ttl }))).toEqual([
      { key: 'dashboard:user-one', ttl: 30 },
      { key: 'dashboard:user-two', ttl: 30 },
    ]);
  });
});
