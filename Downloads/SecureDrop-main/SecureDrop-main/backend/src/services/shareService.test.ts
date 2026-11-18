import { describe, expect, it } from 'vitest';
import {
  canDownload,
  buildPublicShareUrl,
  buildShareDownloadUrl,
  buildShareTicketUrl,
  createShareRecord,
  createShareDownloadTicket,
  createShareToken,
  consumeShareDownloadTicket,
  deleteShareLinksForFile,
  evaluateShareAccess,
  getShareRecordBySlug,
  getShareRecordByIdentifier,
  getShareRecordByToken,
  getShareFileIds,
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
      fileIds: ['file-123', 'file-456'],
      customSlug: 'project-report',
    });

    expect(result.success).toBe(true);
    expect(result.data?.fileIds).toEqual(['file-123', 'file-456']);
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

  it('rejects expired links', async () => {
    const result = await evaluateShareAccess({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      isActive: true,
      isRevoked: false,
      downloadCount: 1,
      maxDownloads: 5,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('LINK_EXPIRED');
  });

  it('rejects links that reached download limits', async () => {
    const result = await evaluateShareAccess({
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
    expect(getShareRecordByIdentifier('quarterly-report')).toMatchObject({ token: record.token });
    expect(getShareRecordByIdentifier(`quarterly-report-${record.token}`)).toMatchObject({
      token: record.token,
    });

    incrementShareDownload(record.token);
    expect(getShareRecordByToken(record.token)?.downloadCount).toBe(1);
  });

  it('removes a deleted file share and its slug index', () => {
    const record = createShareRecord({
      ownerId: 'user-delete-test',
      fileId: 'file-delete-test',
      customSlug: 'delete-test-share',
    });

    deleteShareLinksForFile('file-delete-test');

    expect(getShareRecordByToken(record.token)).toBeNull();
    expect(getShareRecordBySlug('delete-test-share')).toBeNull();
  });

  it('associates one share record with every file in a ZIP transfer', () => {
    const record = createShareRecord({
      ownerId: 'user-bundle-test',
      fileIds: ['file-bundle-a', 'file-bundle-b'],
      customSlug: 'bundle-test-share',
    });

    expect(getShareFileIds(record)).toEqual(['file-bundle-a', 'file-bundle-b']);
    deleteShareLinksForFile('file-bundle-b');
    expect(getShareRecordByToken(record.token)).toBeNull();
  });

  it('allows a download ticket only once and only for its share token', () => {
    const ticket = createShareDownloadTicket('share-token');
    expect(consumeShareDownloadTicket(ticket, 'different-token')).toBe(false);
    expect(consumeShareDownloadTicket(ticket, 'share-token')).toBe(true);
    expect(consumeShareDownloadTicket(ticket, 'share-token')).toBe(false);
  });

  it('builds a secure download URL tied to the file and share token', () => {
    expect(buildShareDownloadUrl('http://localhost:3001', 'file-123', 'test-token')).toBe(
      'http://localhost:3001/api/files/file-123/download?token=test-token'
    );
  });

  it('builds an authorized download URL without exposing the password', () => {
    expect(buildShareTicketUrl('https://api.example.com', 'share-token', 'short-lived-ticket')).toBe(
      'https://api.example.com/api/share/share-token/download/short-lived-ticket'
    );
  });

  it('builds a short share URL from the configured application base URL and slug', () => {
    expect(buildPublicShareUrl('https://app.example.com/', 'quarterly-report')).toBe(
      'https://app.example.com/SecureDrop/quarterly-report'
    );
  });
});
