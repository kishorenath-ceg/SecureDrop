import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./env', () => ({ appEnv: { apiUrl: 'http://api.test' } }));
vi.mock('./supabase', () => ({ supabase: null }));

import { apiFetch } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch error handling', () => {
  it('preserves application errors returned with a successful HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          error: { code: 'FILE_DELETE_FAILED', message: 'Storage removal failed.' },
        }),
      })
    );

    await expect(apiFetch('/api/files/file-123', { method: 'DELETE' })).resolves.toEqual({
      success: false,
      error: { code: 'FILE_DELETE_FAILED', message: 'Storage removal failed.' },
    });
  });

  it('shows Fastify route errors instead of hiding them behind a generic message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          statusCode: 404,
          error: 'Not Found',
          message: 'Route DELETE:/api/files/file-123 not found',
        }),
      })
    );

    await expect(apiFetch('/api/files/file-123', { method: 'DELETE' })).resolves.toEqual({
      success: false,
      error: {
        code: 'HTTP_404',
        message: 'Route DELETE:/api/files/file-123 not found',
      },
    });
  });

  it('does not send a JSON content type for bodyless delete requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { deleted: true } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/files/file-123', { method: 'DELETE' });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(requestInit.headers).has('Content-Type')).toBe(false);
  });

  it('sets JSON content type when a JSON request body exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/test', { method: 'POST', body: JSON.stringify({ value: 1 }) });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(requestInit.headers).get('Content-Type')).toBe('application/json');
  });
});
