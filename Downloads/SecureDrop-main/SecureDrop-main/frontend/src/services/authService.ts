import { supabase } from '../lib/supabase';

export type AuthApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type AuthUser = {
  id: string;
  email: string;
  displayName?: string;
};

export type AuthResult = {
  user: AuthUser;
  token?: string;
  message: string;
};

function normalizeUser(user: { id?: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!user || !user.id || !user.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName:
      typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : user.email.split('@')[0],
  };
}

function mapSupabaseError(code: string, message: string) {
  return {
    success: false as const,
    error: {
      code,
      message,
    },
  };
}

export async function registerUser(payload: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthApiResponse<AuthResult>> {
  if (!supabase) {
    return mapSupabaseError('SUPABASE_NOT_CONFIGURED', 'Supabase Auth is not configured yet.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        display_name: payload.displayName ?? payload.email.split('@')[0],
      },
    },
  });

  if (error) {
    return mapSupabaseError(error.name ?? 'SIGNUP_FAILED', error.message ?? 'Unable to create the account.');
  }

  const user = normalizeUser(data.user);
  if (!user) {
    return mapSupabaseError('SIGNUP_FAILED', 'Account created but user details were unavailable.');
  }

  return {
    success: true,
    data: {
      user,
      token: data.session?.access_token,
      message: 'Account created successfully.',
    },
  };
}

export async function loginUser(payload: { email: string; password: string }): Promise<AuthApiResponse<AuthResult>> {
  if (!supabase) {
    return mapSupabaseError('SUPABASE_NOT_CONFIGURED', 'Supabase Auth is not configured yet.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    return mapSupabaseError(error.name ?? 'LOGIN_FAILED', error.message ?? 'Unable to sign in.');
  }

  const user = normalizeUser(data.user);
  if (!user) {
    return mapSupabaseError('LOGIN_FAILED', 'Authenticated user data was not returned.');
  }

  return {
    success: true,
    data: {
      user,
      token: data.session?.access_token,
      message: 'Signed in successfully.',
    },
  };
}

export async function signOut(): Promise<AuthApiResponse<{ loggedOut: true }>> {
  if (!supabase) {
    return { success: false, error: { code: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Auth is not configured yet.' } };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: {
        code: error.name ?? 'LOGOUT_FAILED',
        message: error.message ?? 'Unable to sign out.',
      },
    };
  }

  return { success: true, data: { loggedOut: true } };
}

export async function getSession(): Promise<AuthApiResponse<{ user: AuthUser }>> {
  if (!supabase) {
    return { success: false, error: { code: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase Auth is not configured yet.' } };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { success: false, error: { code: error.name ?? 'SESSION_ERROR', message: error.message ?? 'Unable to load session.' } };
  }

  const user = normalizeUser(data.session?.user ?? null);
  if (!user) {
    return { success: false, error: { code: 'NO_SESSION', message: 'Authentication required.' } };
  }

  return { success: true, data: { user } };
}

export function onAuthStateChange(callback: (event: string, session: { user?: AuthUser | null } | null) => void) {
  if (!supabase) {
    return () => undefined;
  }

  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(_event, session ? { user: normalizeUser(session.user) ?? null } : null);
  });
}
