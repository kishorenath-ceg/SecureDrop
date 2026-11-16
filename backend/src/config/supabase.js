import { createClient } from '@supabase/supabase-js';

function resolveSupabaseSecretKey(value) {
  if (value == null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseSecretKey = resolveSupabaseSecretKey(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ?? resolveSupabaseSecretKey(process.env.SUPABASE_SECRET_KEY);

export const supabaseAdmin = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'x-application-name': 'securedrop-backend',
        },
      },
    })
  : null;

export default supabaseAdmin;