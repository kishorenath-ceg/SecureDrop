import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/supabase.js', () => ({ supabaseAdmin: null }));
vi.mock('./supabaseService.js', () => ({
  buildSupabaseStoragePath: (userId: string, name: string) => `${userId}/${name}`,
  DEFAULT_STORAGE_BUCKET: 'files',
  isSupabaseConfigured: () => false,
}));

import { createUploadRecord, deleteOwnedFile, type StoredFileRecord, uploadedFiles, uploadFileSchema } from './fileService.js';
import { createShareRecord, getShareRecordBySlug, getShareRecordByToken } from './shareService.js';

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
    const share = createShareRecord({
      ownerId: file.ownerId,
      fileId: file.id,
      customSlug: 'delete-file-test',
    });

    await expect(deleteOwnedFile(file.id, file.ownerId)).resolves.toBe(true);

    expect(uploadedFiles.has(file.id)).toBe(false);
    expect(getShareRecordByToken(share.token)).toBeNull();
    expect(getShareRecordBySlug('delete-file-test')).toBeNull();
  });
});
