import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export function resolveSupabaseSecretKey(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

const resolvedEnv = {
  ...process.env,
  SUPABASE_SECRET_KEY:
    resolveSupabaseSecretKey(process.env.SUPABASE_SECRET_KEY) ??
    resolveSupabaseSecretKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
  SUPABASE_SERVICE_ROLE_KEY:
    resolveSupabaseSecretKey(process.env.SUPABASE_SERVICE_ROLE_KEY) ??
    resolveSupabaseSecretKey(process.env.SUPABASE_SECRET_KEY),
};

const envSchema = z.object({
  SUPABASE_URL: z.string().url().or(z.literal('')).default(''),
  SUPABASE_SECRET_KEY: z.preprocess(
    (value) => resolveSupabaseSecretKey(value),
    z.string().min(10).optional()
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    (value) => resolveSupabaseSecretKey(value),
    z.string().min(10).optional()
  ),
  SUPABASE_STORAGE_BUCKET: z.string().default('files'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
});

export const env = envSchema.parse(resolvedEnv);
