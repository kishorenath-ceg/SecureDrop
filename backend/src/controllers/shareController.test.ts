import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fileStore = vi.hoisted(() => ({
  items: new Map<string, {
    id: string;
    ownerId: string;
    originalName: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    status: string;
    buffer: Buffer;
  }>(),
}));

vi.mock('../services/fileService.js', () => ({
  getFileById: vi.fn(async (id: string) => fileStore.items.get(id) ?? null),
  getOwnedFile: vi.fn(async (id: string) => fileStore.items.get(id) ?? null),
  readStoredFile: vi.fn(async (file: { buffer?: Buffer }) => file.buffer ?? Buffer.alloc(0)),
}));

import { createShareLinkController } from './shareController.js';
import { fileRoutes } from '../routes/fileRoutes.js';
import { shareRoutes } from '../routes/shareRoutes.js';
import { createShareRecord, deleteShareLinksForFile, hashPassword } from '../services/shareService.js';

describe('shared ZIP downloads', () => {
  let app: FastifyInstance;
  let fileIds: string[];

  beforeEach(async () => {
    fileIds = ['bundle-file-a', 'bundle-file-b'];
    fileStore.items.clear();
    fileStore.items.set(fileIds[0], {
      id: fileIds[0],
      ownerId: 'bundle-owner',
      originalName: 'report.txt',
      storagePath: 'report.txt',
      mimeType: 'text/plain',
      sizeBytes: 12,
      createdAt: new Date().toISOString(),
      status: 'uploaded',
      buffer: Buffer.from('report-content'),
    });
    fileStore.items.set(fileIds[1], {
      id: fileIds[1],
      ownerId: 'bundle-owner',
      originalName: 'report.txt',
      storagePath: 'report-copy.txt',
      mimeType: 'text/plain',
      sizeBytes: 11,
      createdAt: new Date().toISOString(),
      status: 'uploaded',
      buffer: Buffer.from('second-report'),
    });

    app = Fastify();
    await app.register(shareRoutes);
    await app.register(fileRoutes);
    app.post('/test/share-links', async (request, reply) => {
      (request as FastifyRequest & { user?: { id: string } }).user = { id: 'bundle-owner' };
      return createShareLinkController(request, reply);
    });
    await app.ready();
  });

  afterEach(async () => {
    deleteShareLinksForFile(fileIds[0]);
    await app.close();
    fileStore.items.clear();
    vi.clearAllMocks();
  });

  it('creates one share record from the complete owned file list', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/share-links',
      payload: { fileIds, customSlug: 'one-team-transfer' },
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body).data).toMatchObject({
      fileIds,
      fileCount: 2,
      shareUrl: expect.stringContaining('/SecureDrop/one-team-transfer-'),
    });
  });

  it('creates one authorized ZIP download for all files and consumes its ticket once', async () => {
    const share = createShareRecord({
      ownerId: 'bundle-owner',
      fileIds,
      customSlug: 'team-transfer',
    });

    const status = await app.inject({ method: 'GET', url: `/api/share/${share.token}` });
    expect(JSON.parse(status.body).data).toMatchObject({
      fileCount: 2,
      sizeBytes: 23,
      files: [{ name: 'report.txt' }, { name: 'report.txt' }],
    });

    const directFileDownload = await app.inject({
      method: 'GET',
      url: `/api/files/${fileIds[0]}/download?token=${share.token}`,
    });
    expect(directFileDownload.statusCode).toBe(403);

    const authorization = await app.inject({
      method: 'POST',
      url: `/api/share/${share.token}/download`,
      payload: {},
    });

    expect(authorization.statusCode).toBe(200);
    const authorizationBody = JSON.parse(authorization.body) as {
      data: { downloadUrl: string };
    };
    const downloadPath = new URL(authorizationBody.data.downloadUrl).pathname;

    const download = await app.inject({ method: 'GET', url: downloadPath });
    expect(download.statusCode, download.body).toBe(200);
    expect(download.headers['content-type']).toContain('application/zip');
    expect(download.headers['content-disposition']).toContain('SecureDrop-transfer.zip');
    expect(download.rawPayload.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(download.rawPayload.includes(Buffer.from('report (2).txt'))).toBe(true);
    expect(download.rawPayload.includes(Buffer.from('second-report'))).toBe(true);

    const reusedTicket = await app.inject({ method: 'GET', url: downloadPath });
    expect(reusedTicket.statusCode).toBe(403);
  });

  it('requires the share password before issuing a ZIP download ticket', async () => {
    const share = createShareRecord({
      ownerId: 'bundle-owner',
      fileIds,
      passwordHash: await hashPassword('BundlePass123!'),
    });

    const denied = await app.inject({
      method: 'POST',
      url: `/api/share/${share.token}/download`,
      payload: {},
    });
    expect(denied.statusCode).toBe(403);
    expect(JSON.parse(denied.body).error.code).toBe('INVALID_PASSWORD');

    const allowed = await app.inject({
      method: 'POST',
      url: `/api/share/${share.token}/download`,
      payload: { password: 'BundlePass123!' },
    });
    expect(allowed.statusCode).toBe(200);
  });
});
