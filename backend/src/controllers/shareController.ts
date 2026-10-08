import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { getSessionUser } from '../services/authService.js';
import {
  buildPublicShareUrl,
  buildShareDownloadUrl,
  createShareRecord,
  createShareToken,
  evaluateShareAccess,
  getShareRecordBySlug,
  getShareRecordByToken,
  hashPassword,
  incrementShareDownload,
  listShareLinksForOwner,
  normalizeCustomSlug,
  revokeShareLinkById,
  validateShareLinkConfig,
  verifyPasswordHash,
} from '../services/shareService.js';

export async function listShareLinksController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request as { user?: { id: string } }).user;

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required to list share links.',
      },
    });
  }

  const links = listShareLinksForOwner(user.id);

  return reply.send({
    success: true,
    data: {
      links: links.map((link) => ({
        id: link.id,
        token: link.token,
        customSlug: link.customSlug ?? null,
        shareUrl: buildPublicShareUrl('http://localhost:5173', link.customSlug ?? link.token),
        status: link.isActive && !link.isRevoked ? 'active' : 'revoked',
        expiresAt: link.expiresAt ?? null,
        maxDownloads: link.maxDownloads ?? null,
        passwordProtected: Boolean(link.passwordHash),
      })),
    },
  });
}

export async function revokeShareLinkController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request as { user?: { id: string } }).user;

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required to revoke a share link.',
      },
    });
  }

  const id = (request.params as { id?: string }).id ?? '';
  const revoked = revokeShareLinkById(id);

  if (!revoked) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'SHARE_NOT_FOUND',
        message: 'The share link could not be found.',
      },
    });
  }

  return reply.send({
    success: true,
    data: {
      id,
      revoked: true,
    },
  });
}

export async function createShareLinkController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const user = (request as { user?: { id: string } }).user;

    if (!user) {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to create a share link.',
        },
      });
    }

    const result = validateShareLinkConfig(request.body ?? {});

    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? 'Invalid share link configuration.');
    }

    const payload = result.data;
    const fileId = payload.fileId?.trim() || null;
    const token = createShareToken();
    const slug = normalizeCustomSlug(payload.customSlug ?? null) ?? token;
    const passwordHash = payload.password ? await hashPassword(payload.password) : null;
    const record = createShareRecord({
      ownerId: user.id,
      token,
      customSlug: slug,
      fileId,
      passwordHash,
      expiresAt: payload.expiresAt ?? null,
      maxDownloads: payload.maxDownloads ?? null,
      ownerMessage: payload.message ?? null,
    });
    const shareUrl = buildPublicShareUrl(env.APP_URL, slug);

    return reply.code(201).send({
      success: true,
      data: {
        id: record.id,
        token,
        fileId: record.fileId ?? null,
        shareUrl,
        customSlug: record.customSlug ?? null,
        expiresAt: record.expiresAt ?? null,
        maxDownloads: record.maxDownloads ?? null,
        passwordProtected: Boolean(record.passwordHash),
        message: record.ownerMessage ?? null,
      },
    });
  } catch (error) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_SHARE_CONFIG',
        message: error instanceof Error ? error.message : 'Invalid share link configuration.',
      },
    });
  }
}

export async function publicShareStatusController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = (request.params as { token?: string }).token ?? '';

  if (!token) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'A valid share token is required.',
      },
    });
  }

  const share = getShareRecordByToken(token) ?? getShareRecordBySlug(token);

  if (!share) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'SHARE_NOT_FOUND',
        message: 'The requested share link does not exist.',
      },
    });
  }

  const evaluation = evaluateShareAccess({
    expiresAt: share.expiresAt,
    isActive: share.isActive,
    isRevoked: share.isRevoked,
    passwordHash: share.passwordHash,
    downloadCount: share.downloadCount,
    maxDownloads: share.maxDownloads,
  });

  return reply.send({
    success: true,
    data: {
      token: share.token,
      expiresAt: share.expiresAt,
      expired: evaluation.expired,
      downloadLimit: share.maxDownloads ?? 0,
      downloadCount: share.downloadCount,
      passwordRequired: evaluation.passwordRequired,
      active: evaluation.allowed,
      status: evaluation.allowed ? 'open' : (evaluation.reason ?? 'closed'),
    },
  });
}

export async function downloadShareController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = (request.params as { token?: string }).token ?? '';
  const body = (request.body ?? {}) as { password?: string };

  if (!token) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'A valid share token is required.',
      },
    });
  }

  const share = getShareRecordByToken(token) ?? getShareRecordBySlug(token);

  if (!share) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'SHARE_NOT_FOUND',
        message: 'The requested share link does not exist.',
      },
    });
  }

  const evaluation = evaluateShareAccess({
    expiresAt: share.expiresAt,
    isActive: share.isActive,
    isRevoked: share.isRevoked,
    passwordHash: share.passwordHash,
    password: body.password ?? null,
    downloadCount: share.downloadCount,
    maxDownloads: share.maxDownloads,
  });

  if (!evaluation.allowed) {
    return reply.code(evaluation.reason === 'LINK_EXPIRED' ? 410 : 403).send({
      success: false,
      error: {
        code: evaluation.reason ?? 'DOWNLOAD_FORBIDDEN',
        message:
          evaluation.reason === 'LINK_EXPIRED'
            ? 'This sharing link has expired.'
            : evaluation.reason === 'DOWNLOAD_LIMIT_REACHED'
              ? 'This sharing link has reached its download limit.'
              : 'This download is not permitted.',
      },
    });
  }

  incrementShareDownload(share.token);

  return reply.send({
    success: true,
    data: {
      token: share.token,
      downloadAllowed: true,
      downloadUrl: share.fileId ? buildShareDownloadUrl(env.APP_URL, share.fileId, share.token) : '/api/files/demo-file/download',
    },
  });
}

export async function verifyPasswordController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const token = (request.params as { token?: string }).token ?? '';
  const body = (request.body ?? {}) as { password?: string };

  if (!token) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'A valid share token is required.',
      },
    });
  }

  const share = getShareRecordByToken(token) ?? getShareRecordBySlug(token);

  if (!share) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'SHARE_NOT_FOUND',
        message: 'The requested share link does not exist.',
      },
    });
  }

  if (!share.passwordHash) {
    return reply.send({
      success: true,
      data: {
        passwordValid: true,
        token,
      },
    });
  }

  const isValid = await verifyPasswordHash(body.password ?? '', share.passwordHash);

  if (!isValid) {
    return reply.code(403).send({
      success: false,
      error: {
        code: 'INVALID_PASSWORD',
        message: 'The password is incorrect.',
      },
    });
  }

  return reply.send({
    success: true,
    data: {
      passwordValid: true,
      token,
    },
  });
}
