const env = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? '',
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  VITE_API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
};

export const appEnv = {
  supabaseUrl: env.VITE_SUPABASE_URL,
  supabasePublishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
  supabaseAnonKey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
  apiUrl: env.VITE_API_URL,
};
