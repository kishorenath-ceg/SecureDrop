import { describe, expect, it } from 'vitest';
import { resolveSupabaseSecretKey } from './env.js';

describe('backend environment config', () => {
  it('accepts the legacy secret key and the service-role alias', () => {
    expect(resolveSupabaseSecretKey('legacy-secret-key-value')).toBe('legacy-secret-key-value');
    expect(resolveSupabaseSecretKey('service-role-key-value')).toBe('service-role-key-value');
    expect(resolveSupabaseSecretKey('')).toBeUndefined();
    expect(resolveSupabaseSecretKey(undefined)).toBeUndefined();
  });
});
