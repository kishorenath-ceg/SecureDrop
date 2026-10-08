import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

export const DEFAULT_STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET || 'files';

export function isSupabaseConfigured(url?: string) {
  const candidate = (url ?? env.SUPABASE_URL ?? '').trim();
  return Boolean(candidate) && candidate.includes('supabase.co') && !candidate.includes('example.supabase.co');
}

export function buildSupabaseStoragePath(userId: string, originalName: string) {
  const safeName = (originalName || 'file')
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);

  const normalizedName = safeName && safeName.length > 0 ? safeName : 'file';
  return `${userId}/uploads/${randomUUID()}-${normalizedName}`;
}
