import { createClient } from '@supabase/supabase-js';
import { appEnv } from './env';

export const supabase =
  appEnv.supabaseUrl && appEnv.supabasePublishableKey
    ? createClient(appEnv.supabaseUrl, appEnv.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function getSupabaseAccessToken() {
  return supabase?.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

export function isSupabaseConfigured() {
  return Boolean(appEnv.supabaseUrl && appEnv.supabasePublishableKey);
}
