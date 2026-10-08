import { describe, expect, it } from 'vitest';
import { uploadFileSchema } from './fileService.js';

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
});
