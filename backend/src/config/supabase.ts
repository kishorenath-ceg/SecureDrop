import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const supabaseSecretKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;

export const supabaseAdmin = env.SUPABASE_URL && supabaseSecretKey
  ? createClient(env.SUPABASE_URL, supabaseSecretKey, {
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
