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

  const headers = new Headers(init.headers);
  if (init.body != null && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${appEnv.apiUrl}${endpoint}`, {
    ...init,
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'The server returned an unreadable response.',
      },
    };
  }

  const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  const serverError = body?.error && typeof body.error === 'object'
    ? (body.error as Record<string, unknown>)
    : null;

  if (!response.ok || body?.success !== true) {
    const message =
      (typeof serverError?.message === 'string' && serverError.message) ||
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.error === 'string' && body.error) ||
      `Request failed with status ${response.status}.`;
    const code =
      (typeof serverError?.code === 'string' && serverError.code) ||
      (typeof body?.code === 'string' && body.code) ||
      (typeof body?.statusCode === 'number' && `HTTP_${body.statusCode}`) ||
      `HTTP_${response.status}`;

    return {
      success: false,
      error: { code, message },
    };
  }

  return {
    success: true,
    data: body.data as T,
  };
}
