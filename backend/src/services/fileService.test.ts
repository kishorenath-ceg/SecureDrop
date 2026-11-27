import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cacheMocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  invalidateUser: vi.fn(),
  invalidateDashboard: vi.fn(),
}));

vi.mock('../config/supabase.js', () => ({ supabaseAdmin: null }));
vi.mock('./supabaseService.js', () => ({
  buildSupabaseStoragePath: (userId: string, name: string) => `${userId}/${name}`,
  DEFAULT_STORAGE_BUCKET: 'files',
  isSupabaseConfigured: () => false,
}));
vi.mock('./redisCache.js', () => ({
  CACHE_TTL_SECONDS: { fileList: 45, publicShareLookup: 15 },
  cacheGet: cacheMocks.get,
  cacheSet: cacheMocks.set,
  cacheDelete: cacheMocks.delete,
  fileListCacheKey: (userId: string) => `files:${userId}`,
  publicShareLookupCacheKey: (identifier: string) => `share:${identifier}`,
  invalidateUserDataCaches: cacheMocks.invalidateUser,
  invalidateDashboardStatsCache: cacheMocks.invalidateDashboard,
}));

import {
  createUploadRecord,
  deleteOwnedFile,
  listFilesForOwner,
  storeUploadedFile,
  type StoredFileRecord,
  uploadedFiles,
  uploadFileSchema,
} from './fileService.js';
import { createShareRecord, getShareRecordBySlug, getShareRecordByToken } from './shareService.js';

beforeEach(() => {
  cacheMocks.get.mockReset().mockResolvedValue(null);
  cacheMocks.set.mockReset().mockResolvedValue(true);
  cacheMocks.delete.mockReset().mockResolvedValue(true);
  cacheMocks.invalidateUser.mockReset().mockResolvedValue(undefined);
  cacheMocks.invalidateDashboard.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  uploadedFiles.clear();
});

describe('upload file schema', () => {
  it('accepts a valid upload file payload', () => {
    const result = uploadFileSchema.safeParse({
      originalName: 'project-report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1048576,
    });

    expect(result.success).toBe(true);
  });

  it('rejects files over the configured size limit', () => {
    const result = uploadFileSchema.safeParse({
      originalName: 'large.bin',
      mimeType: 'application/octet-stream',
      sizeBytes: 200 * 1024 * 1024,
    });

    expect(result.success).toBe(false);
  });

  it('normalizes Windows ZIP MIME types for storage', async () => {
    const record = await createUploadRecord({
      originalName: 'archive.zip',
      mimeType: 'application/x-zip-compressed',
      sizeBytes: 1024,
      userId: 'owner-1',
    });

    expect(record.mimeType).toBe('application/zip');
  });

  it('only deletes a file when the authenticated owner matches', async () => {
    const file: StoredFileRecord = {
      id: 'file-owned',
      ownerId: 'owner-1',
      originalName: 'report.pdf',
      storagePath: 'owner-1/report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      createdAt: new Date().toISOString(),
      status: 'uploaded',
    };
    uploadedFiles.set(file.id, file);

    await expect(deleteOwnedFile(file.id, 'owner-2')).resolves.toBe(false);
    expect(uploadedFiles.has(file.id)).toBe(true);
  });

  it('caches owner-scoped file metadata without including file contents', async () => {
    const firstOwnerFile: StoredFileRecord = {
      id: 'file-owner-one',
      ownerId: 'owner-1',
      originalName: 'one.txt',
      storagePath: 'owner-1/one.txt',
      mimeType: 'text/plain',
      sizeBytes: 4,
      createdAt: new Date().toISOString(),
      status: 'uploaded',
      buffer: Buffer.from('secret contents'),
    };
    const secondOwnerFile: StoredFileRecord = {
      ...firstOwnerFile,
      id: 'file-owner-two',
      ownerId: 'owner-2',
      originalName: 'two.txt',
      storagePath: 'owner-2/two.txt',
    };
    uploadedFiles.set(firstOwnerFile.id, firstOwnerFile);
    uploadedFiles.set(secondOwnerFile.id, secondOwnerFile);

    const files = await listFilesForOwner('owner-1');

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({ id: 'file-owner-one', ownerId: 'owner-1' });
    expect(files[0]).not.toHaveProperty('buffer');
    expect(cacheMocks.set).toHaveBeenCalledWith('files:owner-1', files, 45);
  });

  it('invalidates owner caches after a successful upload', async () => {
    const record = await createUploadRecord({
      originalName: 'new-file.txt',
      mimeType: 'text/plain',
      sizeBytes: 10,
      userId: 'owner-upload',
    });

    await storeUploadedFile(record, Buffer.from('contents'));

    expect(cacheMocks.invalidateUser).toHaveBeenCalledWith('owner-upload');
  });

  it('removes the owned file and its in-memory share link', async () => {
    const file: StoredFileRecord = {
      id: 'file-delete',
      ownerId: 'owner-1',
      originalName: 'report.pdf',
      storagePath: 'owner-1/report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      createdAt: new Date().toISOString(),
      status: 'uploaded',
    };
    uploadedFiles.set(file.id, file);
    const share = await createShareRecord({
      ownerId: file.ownerId,
      fileId: file.id,
      customSlug: 'delete-file-test',
    });

    await expect(deleteOwnedFile(file.id, file.ownerId)).resolves.toBe(true);

    expect(uploadedFiles.has(file.id)).toBe(false);
    await expect(getShareRecordByToken(share.token)).resolves.toBeNull();
    await expect(getShareRecordBySlug('delete-file-test')).resolves.toBeNull();
    expect(cacheMocks.invalidateUser).toHaveBeenCalledWith('owner-1');
  });
});
