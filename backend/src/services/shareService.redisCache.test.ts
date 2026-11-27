import { beforeEach, describe, expect, it, vi } from 'vitest';

const cacheMocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  invalidateDashboard: vi.fn(),
}));

vi.mock('../config/supabase.js', () => ({ supabaseAdmin: null }));
vi.mock('./supabaseService.js', () => ({ isSupabaseConfigured: () => false }));
vi.mock('./redisCache.js', () => ({
  CACHE_TTL_SECONDS: { publicShareLookup: 15 },
  cacheGet: cacheMocks.get,
  cacheSet: cacheMocks.set,
  cacheDelete: cacheMocks.delete,
  invalidateDashboardStatsCache: cacheMocks.invalidateDashboard,
  publicShareLookupCacheKey: (identifier: string) => `share-lookup:${identifier}`,
}));

import {
  createShareRecord,
  evaluateShareAccess,
  getShareRecordByIdentifier,
  incrementShareDownload,
  revokeShareLinkById,
  shareLinkStore,
  shareSlugIndex,
} from './shareService.js';

beforeEach(() => {
  shareLinkStore.clear();
  shareSlugIndex.clear();
  cacheMocks.get.mockReset().mockResolvedValue(null);
  cacheMocks.set.mockReset().mockResolvedValue(true);
  cacheMocks.delete.mockReset().mockResolvedValue(true);
  cacheMocks.invalidateDashboard.mockReset().mockResolvedValue(undefined);
});

describe('share lookup Redis cache', () => {
  it('caches only the public identifier-to-record-ID hint', async () => {
    const share = await createShareRecord({
      ownerId: 'owner-one',
      customSlug: 'public-report',
      passwordHash: 'private-password-hash',
    });

    await expect(getShareRecordByIdentifier('public-report')).resolves.toMatchObject({
      token: share.token,
      passwordHash: 'private-password-hash',
    });

    expect(cacheMocks.set).toHaveBeenCalledWith(
      'share-lookup:public-report',
      share.id,
      15
    );
    expect(cacheMocks.set.mock.calls[0]).not.toContain('private-password-hash');
  });

  it('re-reads current share state before enforcing revocation and download limits', async () => {
    const share = await createShareRecord({
      ownerId: 'owner-one',
      customSlug: 'limited-report',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      maxDownloads: 1,
    });

    await expect(incrementShareDownload(share.token)).resolves.toMatchObject({ downloadCount: 1 });
    cacheMocks.get.mockResolvedValueOnce(share.id);

    const currentShare = await getShareRecordByIdentifier('limited-report');
    expect(currentShare?.downloadCount).toBe(1);
    await expect(evaluateShareAccess({
      expiresAt: currentShare?.expiresAt,
      isActive: currentShare?.isActive,
      isRevoked: currentShare?.isRevoked,
      passwordHash: currentShare?.passwordHash,
      downloadCount: currentShare?.downloadCount,
      maxDownloads: currentShare?.maxDownloads,
    })).resolves.toMatchObject({ allowed: false, reason: 'DOWNLOAD_LIMIT_REACHED' });
  });

  it('invalidates dashboard statistics after share creation and downloads', async () => {
    const share = await createShareRecord({
      ownerId: 'owner-downloads',
      customSlug: 'download-count',
    });

    expect(cacheMocks.invalidateDashboard).toHaveBeenCalledWith('owner-downloads');
    cacheMocks.invalidateDashboard.mockClear();

    await incrementShareDownload(share.token);

    expect(cacheMocks.invalidateDashboard).toHaveBeenCalledWith('owner-downloads');
  });

  it("prevents one user from revoking another user's share and invalidates the owner's dashboard cache", async () => {
    const share = await createShareRecord({
      ownerId: 'owner-one',
      customSlug: 'owner-share',
    });

    await expect(revokeShareLinkById(share.id, 'owner-two')).resolves.toBeNull();
    expect(share.isRevoked).toBe(false);

    await expect(revokeShareLinkById(share.id, 'owner-one')).resolves.toMatchObject({
      isRevoked: true,
    });
    expect(cacheMocks.invalidateDashboard).toHaveBeenCalledWith('owner-one');
    expect(cacheMocks.delete).toHaveBeenCalledWith('share-lookup:owner-share');
  });
});
