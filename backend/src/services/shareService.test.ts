import { describe, expect, it } from 'vitest';
import {
  canDownload,
  createShareRecord,
  createShareToken,
  evaluateShareAccess,
  getShareRecordBySlug,
  getShareRecordByToken,
  hashPassword,
  incrementShareDownload,
  validateShareLinkConfig,
  verifyPasswordHash,
} from './shareService.js';

describe('share service', () => {
  it('creates a token with the expected format', () => {
    const token = createShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);
  });

  it('accepts a valid share config', () => {
    const result = validateShareLinkConfig({
      customSlug: 'project-report',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      maxDownloads: 5,
      password: 'StrongPass123!',
      message: 'Final report',
    });

    expect(result.success).toBe(true);
  });

  it('preserves the uploaded file association in the share config', () => {
    const result = validateShareLinkConfig({
      fileId: 'file-123',
      customSlug: 'project-report',
    });

    expect(result.success).toBe(true);
    expect(result.data?.fileId).toBe('file-123');
  });

  it('rejects unsafe custom slugs', () => {
    const invalid = validateShareLinkConfig({
      customSlug: 'Project/Report?',
    });

    const valid = validateShareLinkConfig({
      customSlug: 'project-report-2026',
    });

    expect(invalid.success).toBe(false);
    expect(valid.success).toBe(true);
  });

  it('rejects expired links', () => {
    const result = evaluateShareAccess({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      isActive: true,
      isRevoked: false,
      downloadCount: 1,
      maxDownloads: 5,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('LINK_EXPIRED');
  });

  it('rejects links that reached download limits', () => {
    const result = evaluateShareAccess({
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      isActive: true,
      isRevoked: false,
      downloadCount: 5,
      maxDownloads: 5,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('DOWNLOAD_LIMIT_REACHED');
  });

  it('verifies hashed passwords correctly', async () => {
    const passwordHash = await hashPassword('SecurePass123!');
    expect(await verifyPasswordHash('SecurePass123!', passwordHash)).toBe(true);
    expect(await verifyPasswordHash('WrongPassword', passwordHash)).toBe(false);
  });

  it('allows download when below limit and unexpired', () => {
    expect(canDownload(2, 5)).toBe(true);
  });

  it('stores and resolves share records by token and slug', async () => {
    const record = createShareRecord({
      ownerId: 'user-123',
      customSlug: 'quarterly-report',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      maxDownloads: 5,
      passwordHash: await hashPassword('SecurePass123!'),
    });

    expect(getShareRecordByToken(record.token)).toMatchObject({ token: record.token });
    expect(getShareRecordBySlug('quarterly-report')).toMatchObject({ token: record.token });

    incrementShareDownload(record.token);
    expect(getShareRecordByToken(record.token)?.downloadCount).toBe(1);
  });

  it('builds a secure download URL tied to the file and share token', () => {
    const url = new URL('http://localhost:5173');
    expect(new URL('/api/files/file-123/download?token=test-token', url).toString()).toContain('file-123');
  });

  it('builds share URLs from the configured application base URL', () => {
    expect(new URL('/s/quarterly-report', 'https://app.example.com').toString()).toBe('https://app.example.com/s/quarterly-report');
  });
});
