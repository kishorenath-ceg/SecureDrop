import type { FastifyReply, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../config/supabase.js';
import { normalizeProfileUpdate, isProfileOwner } from '../services/profileService.js';

export async function getProfileController(request: FastifyRequest, reply: FastifyReply) {
  if (!supabaseAdmin) {
    return reply.code(503).send({ success: false, error: { code: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase is not configured.' } });
  }

  const user = (request as { user?: { id: string; email: string; displayName?: string } }).user;

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return reply.code(500).send({
      success: false,
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Unable to load the user profile.',
      },
    });
  }

  if (!data) {
    const fallbackDisplayName = user.displayName ?? user.email.split('@')[0];
    const { data: created, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({ user_id: user.id, display_name: fallbackDisplayName })
      .select('*')
      .single();

    if (createError || !created) {
      return reply.code(500).send({
        success: false,
        error: {
          code: 'PROFILE_CREATE_FAILED',
          message: 'Unable to create the user profile.',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        id: created.id,
        userId: created.user_id,
        displayName: created.display_name,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      },
    });
  }

  return reply.send({
    success: true,
    data: {
      id: data.id,
      userId: data.user_id,
      displayName: data.display_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

export async function updateProfileController(request: FastifyRequest, reply: FastifyReply) {
  if (!supabaseAdmin) {
    return reply.code(503).send({ success: false, error: { code: 'SUPABASE_NOT_CONFIGURED', message: 'Supabase is not configured.' } });
  }

  const user = (request as { user?: { id: string; email: string; displayName?: string } }).user;

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  const result = normalizeProfileUpdate(request.body ?? {});
  if (!result.success) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_PROFILE_UPDATE',
        message: result.error,
      },
    });
  }

  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    return reply.code(500).send({
      success: false,
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Unable to load the user profile.',
      },
    });
  }

  if (!existingProfile || !isProfileOwner(existingProfile.user_id, user.id)) {
    return reply.code(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'You do not own this profile.',
      },
    });
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ display_name: result.data.display_name })
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error || !data) {
    return reply.code(500).send({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: 'Unable to update the profile.',
      },
    });
  }

  return reply.send({
    success: true,
    data: {
      id: data.id,
      userId: data.user_id,
      displayName: data.display_name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}
