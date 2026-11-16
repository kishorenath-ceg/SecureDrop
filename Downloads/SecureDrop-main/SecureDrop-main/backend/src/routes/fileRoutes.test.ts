import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fileRoutes } from './fileRoutes.js';

describe('file download route authorization', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
    await app.register(fileRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows a share token to reach share validation without an auth session', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/files/file-123/download?token=invalid-token',
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('INVALID_SHARE_TOKEN');
  });

  it('requires authentication for a download without a share token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/files/file-123/download',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('requires authentication to delete a file', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/files/file-123',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });
});
