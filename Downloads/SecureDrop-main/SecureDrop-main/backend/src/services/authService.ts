import type { FastifyReply, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../config/supabase.js';

export type SessionUser = {
  id: string;
  email: string;
  displayName?: string;
};

export function extractBearerToken(authHeader?: string | string[]) {
  if (!authHeader) {
    return null;
  }

  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }

  const matches = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return matches ? matches[1].trim() || null : null;
}

export async function verifySupabaseJwt(token: string): Promise<SessionUser | null> {
  if (!token || !supabaseAdmin) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user || !data.user.email) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      displayName:
        typeof data.user.user_metadata?.display_name === 'string'
          ? data.user.user_metadata.display_name
          : data.user.email.split('@')[0],
    };
  } catch {
    return null;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request.headers.authorization);
  if (!token) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  const user = await verifySupabaseJwt(token);
  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'INVALID_SESSION',
        message: 'Your Supabase session is invalid or expired.',
      },
    });
  }

  (request as { user?: SessionUser }).user = user;
  return;
}

export async function getSessionUser(authHeader?: string | string[]) {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }

  return verifySupabaseJwt(token);
}
