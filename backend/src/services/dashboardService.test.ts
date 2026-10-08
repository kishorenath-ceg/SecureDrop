import { describe, expect, it } from 'vitest';
import { buildDashboardStats, formatBytes, summarizeDashboard } from './dashboardService.js';

describe('dashboard service', () => {
  it('formats storage bytes into human readable values', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('builds summary stats from file and link data', () => {
    const stats = buildDashboardStats({
      totalFiles: 18,
      activeLinks: 9,
      expiredLinks: 3,
      totalDownloads: 284,
      storageUsedBytes: 1800000000,
    });

    expect(stats.totalFiles).toBe(18);
    expect(stats.activeLinks).toBe(9);
    expect(stats.expiredLinks).toBe(3);
    expect(stats.totalDownloads).toBe(284);
    expect(stats.storageUsed).toBe('1.7 GB');
  });

  it('aggregates real file and share metrics from the user workspace', () => {
    const stats = summarizeDashboard({
      files: [
        { sizeBytes: 2 * 1024 * 1024 },
        { sizeBytes: 5 * 1024 * 1024 },
      ],
      shareLinks: [
        { isActive: true, isRevoked: false, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), downloadCount: 2, maxDownloads: 5 },
        { isActive: true, isRevoked: false, expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), downloadCount: 4, maxDownloads: 4 },
        { isActive: false, isRevoked: false, expiresAt: null, downloadCount: 0, maxDownloads: 10 },
      ],
    });

    expect(stats.totalFiles).toBe(2);
    expect(stats.activeLinks).toBe(1);
    expect(stats.expiredLinks).toBe(2);
    expect(stats.totalDownloads).toBe(6);
    expect(stats.storageUsed).toBe('7 MB');
  });
});
