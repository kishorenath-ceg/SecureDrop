import { describe, expect, it } from 'vitest';
import {
  buildSupabaseStoragePath,
  isPersistentStorageAvailable,
  isSupabaseConfigured,
} from './supabaseService.js';

describe('supabase service', () => {
  it('builds a storage path inside the configured bucket', () => {
    const key = buildSupabaseStoragePath('user-123', 'project-report.pdf');

    expect(key).toMatch(/^user-123\/uploads\/[0-9a-f-]+-/);
    expect(key).toContain('project-report.pdf');
  });

  it('treats a real Supabase URL as configured', () => {
    expect(isSupabaseConfigured('https://abc123.supabase.co')).toBe(true);
    expect(isSupabaseConfigured('https://example.supabase.co')).toBe(false);
  });

  it('requires both a Supabase client and a real project URL for persistent storage', () => {
    expect(isPersistentStorageAvailable({}, 'https://abc123.supabase.co')).toBe(true);
    expect(isPersistentStorageAvailable(null, 'https://abc123.supabase.co')).toBe(false);
    expect(isPersistentStorageAvailable({}, 'https://example.supabase.co')).toBe(false);
  });
});
