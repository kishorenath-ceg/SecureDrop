import { appEnv } from './env';
import { supabase } from './supabase';

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

export async function apiFetch<T>(
  endpoint: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const session = supabase ? await supabase.auth.getSession() : null;
  const token = session?.data.session?.access_token ?? null;

  const response = await fetch(`${appEnv.apiUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    return {
      success: false,
      error: payload.error ?? {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      },
    };
  }

  return {
    success: true,
    data: payload.data as T,
  };
}
