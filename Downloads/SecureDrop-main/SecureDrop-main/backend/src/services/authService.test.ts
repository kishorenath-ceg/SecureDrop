import { describe, expect, it } from 'vitest';
import { extractBearerToken, getSessionUser } from './authService.js';

describe('Supabase bearer authentication', () => {
  it('extracts the bearer token cleanly for Supabase JWT verification', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('abc.def.ghi')).toBeNull();
  });

  it('rejects requests without a bearer token', async () => {
    expect(await getSessionUser(undefined)).toBeNull();
  });
});
