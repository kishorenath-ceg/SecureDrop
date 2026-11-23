import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZipArchive } from 'archiver';
import { env } from '../config/env.js';
import { getFileById, getOwnedFile, readStoredFile } from '../services/fileService.js';
import { getSessionUser } from '../services/authService.js';
import {
  buildPublicShareUrl,
  buildShareTicketUrl,
  consumeShareDownloadTicket,
  createShareDownloadTicket,
  createShareRecord,
  createShareToken,
  evaluateShareAccess,
  getShareFileIds,
  getShareRecordByIdentifier,
  getShareRecordBySlug,
  getShareRecordByToken,
  hashPassword,
  incrementShareDownload,
  listShareLinksForOwner,
  normalizeCustomSlug,
  revokeShareLinkById,
  MAX_SHARE_FILE_COUNT,
  MAX_SHARE_TRANSFER_BYTES,
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

  const links = await listShareLinksForOwner(user.id);

  return reply.send({
    success: true,
    data: {
      links: links.map((link) => ({
        id: link.id,
        token: link.token,
        customSlug: link.customSlug ?? null,
        shareUrl: buildPublicShareUrl(env.APP_URL, link.customSlug),
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
  const revoked = await revokeShareLinkById(id);

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
    const fileIds = Array.from(new Set([
      ...(payload.fileIds ?? []),
      ...(payload.fileId ? [payload.fileId] : []),
    ]));
    if (fileIds.length === 0) throw new Error('Upload at least one file before creating a share link.');
    if (fileIds.length > MAX_SHARE_FILE_COUNT) throw new Error(`A transfer can contain at most ${MAX_SHARE_FILE_COUNT} files.`);

    const files = await Promise.all(fileIds.map((fileId) => getOwnedFile(fileId, user.id)));
    if (files.some((file) => !file)) throw new Error('One or more uploaded files could not be found.');
    const ownedFiles = files.filter((file) => file !== null);
    const totalSizeBytes = ownedFiles.reduce((total, file) => total + file.sizeBytes, 0);
    if (totalSizeBytes > MAX_SHARE_TRANSFER_BYTES) {
      throw new Error('A shared transfer cannot exceed 1 GB.');
    }

    const token = createShareToken();
    const defaultSlug = fileIds.length === 1 ? ownedFiles[0].originalName : 'secure-transfer';
    const slug = normalizeCustomSlug(payload.customSlug ?? defaultSlug) ?? 'secure-transfer';
    const passwordHash = payload.password ? await hashPassword(payload.password) : null;
    if (await getShareRecordBySlug(slug)) {
      return reply.code(409).send({
        success: false,
        error: {
          code: 'SHARE_SLUG_TAKEN',
          message: 'That link name is already in use. Choose a different name.',
        },
      });
    }

    const record = await createShareRecord({
      ownerId: user.id,
      token,
      customSlug: slug,
      fileId: fileIds[0],
      fileIds,
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
        fileIds,
        fileCount: fileIds.length,
        totalSizeBytes,
        shareUrl,
        customSlug: record.customSlug ?? null,
        expiresAt: record.expiresAt ?? null,
        maxDownloads: record.maxDownloads ?? null,
        passwordProtected: Boolean(record.passwordHash),
        message: record.ownerMessage ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid share link configuration.';
    const duplicateLink = message.includes('already in use.');
    const persistenceFailure = message === 'Unable to save the share link in Supabase.';
    if (persistenceFailure) {
      request.log.error({ err: error }, 'Unable to persist a share link');
    }

    return reply.code(duplicateLink ? 409 : persistenceFailure ? 500 : 400).send({
      success: false,
      error: {
        code: duplicateLink ? 'SHARE_SLUG_TAKEN' : persistenceFailure ? 'SHARE_STORAGE_FAILED' : 'INVALID_SHARE_CONFIG',
        message,
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

  const share = await getShareRecordByIdentifier(token);

  if (!share) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'SHARE_NOT_FOUND',
        message: 'The requested share link does not exist.',
      },
    });
  }

  const evaluation = await evaluateShareAccess({
    expiresAt: share.expiresAt,
    isActive: share.isActive,
    isRevoked: share.isRevoked,
    passwordHash: null,
    downloadCount: share.downloadCount,
    maxDownloads: share.maxDownloads,
  });

  const passwordRequired = Boolean(share.passwordHash);
  const fileIds = getShareFileIds(share);
  const files = await Promise.all(fileIds.map((fileId) => getFileById(fileId)));
  const availableFiles = files.filter((file) => file !== null);
  const filesAvailable = availableFiles.length === fileIds.length;
  const totalSizeBytes = availableFiles.reduce((total, file) => total + file.sizeBytes, 0);
  const status = !filesAvailable
    ? 'FILE_UNAVAILABLE'
    : evaluation.allowed
      ? passwordRequired ? 'PASSWORD_REQUIRED' : 'open'
      : evaluation.reason ?? 'closed';

  return reply.send({
    success: true,
    data: {
      token: share.token,
      expiresAt: share.expiresAt,
      expired: evaluation.expired,
      downloadLimit: share.maxDownloads ?? 0,
      downloadCount: share.downloadCount,
      passwordRequired,
      active: evaluation.allowed && filesAvailable,
      status,
      fileName: availableFiles.length === 1 ? availableFiles[0].originalName : null,
      sizeBytes: totalSizeBytes,
      mimeType: availableFiles.length === 1 ? availableFiles[0].mimeType : 'application/zip',
      fileCount: fileIds.length,
      files: availableFiles.map((file) => ({
        name: file.originalName,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
      })),
      message: share.ownerMessage ?? null,
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

  const share = await getShareRecordByIdentifier(token);

  if (!share) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'SHARE_NOT_FOUND',
        message: 'The requested share link does not exist.',
      },
    });
  }

  const evaluation = await evaluateShareAccess({
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

  const fileIds = getShareFileIds(share);
  const files = await Promise.all(fileIds.map((fileId) => getFileById(fileId)));
  if (fileIds.length === 0 || files.some((file) => !file)) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'One or more files in this transfer are unavailable.',
      },
    });
  }

  await incrementShareDownload(share.token);
  const ticket = createShareDownloadTicket(share.token);
  return reply.send({
    success: true,
    data: {
      token: share.token,
      downloadAllowed: true,
      downloadUrl: buildShareTicketUrl(env.API_URL, share.token, ticket),
    },
  });
}

function getArchiveEntryName(name: string, usedNames: Set<string>) {
  const safeName = name.replace(/[\\/\u0000-\u001f]/g, '_').trim();
  const baseName = safeName && safeName !== '.' && safeName !== '..' ? safeName : 'file';
  let candidate = baseName;
  let suffix = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    const extensionIndex = baseName.lastIndexOf('.');
    const stem = extensionIndex > 0 ? baseName.slice(0, extensionIndex) : baseName;
    const extension = extensionIndex > 0 ? baseName.slice(extensionIndex) : '';
    candidate = `${stem} (${suffix++})${extension}`;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export async function serveShareDownloadController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { token = '', ticket = '' } = request.params as { token?: string; ticket?: string };
  if (!token || !ticket || !consumeShareDownloadTicket(ticket, token)) {
    return reply.code(403).send({
      success: false,
      error: { code: 'INVALID_DOWNLOAD_TICKET', message: 'This download link is invalid or has expired.' },
    });
  }

  const share = await getShareRecordByToken(token);
  if (!share || !share.isActive || share.isRevoked) {
    return reply.code(403).send({
      success: false,
      error: { code: 'LINK_REVOKED', message: 'This sharing link is no longer available.' },
    });
  }
  if (new Date(share.expiresAt ?? 0).getTime() <= Date.now() && share.expiresAt) {
    return reply.code(410).send({
      success: false,
      error: { code: 'LINK_EXPIRED', message: 'This sharing link has expired.' },
    });
  }

  const fileIds = getShareFileIds(share);
  const files = await Promise.all(fileIds.map((fileId) => getFileById(fileId)));
  if (files.length === 0 || files.some((file) => !file)) {
    return reply.code(404).send({
      success: false,
      error: { code: 'FILE_NOT_FOUND', message: 'One or more files in this transfer are unavailable.' },
    });
  }

  const availableFiles = files.filter((file) => file !== null);
  if (availableFiles.length === 1) {
    try {
      const file = availableFiles[0];
      const buffer = await readStoredFile(file);
      return reply
        .type(file.mimeType)
        .header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`)
        .send(buffer);
    } catch (error) {
      request.log.error({ err: error }, 'Unable to read a shared file for download');
      return reply.code(500).send({
        success: false,
        error: { code: 'DOWNLOAD_FAILED', message: 'Unable to read the shared file.' },
      });
    }
  }

  const archive = new ZipArchive({ zlib: { level: 0 } });
  let archiveFailure: Error | undefined;
  archive.on('warning', (error) => request.log.warn({ err: error }, 'ZIP archive warning'));
  archive.on('error', (error) => {
    archiveFailure = error;
    request.log.error({ err: error }, 'ZIP archive stream failed');
  });
  const usedNames = new Set<string>();

  reply
    .type('application/zip')
    .header('Content-Disposition', 'attachment; filename="SecureDrop-transfer.zip"')
    .send(archive);

  try {
    for (const file of availableFiles) {
      if (archiveFailure) throw archiveFailure;
      const buffer = await readStoredFile(file);
      if (archiveFailure) throw archiveFailure;
      const entryName = getArchiveEntryName(file.originalName, usedNames);
      const entryComplete = new Promise<void>((resolve, reject) => {
        archive.once('entry', () => resolve());
        archive.once('error', reject);
      });
      archive.append(buffer, { name: entryName });
      await entryComplete;
    }
    await archive.finalize();
  } catch (error) {
    request.log.error({ err: error }, 'Unable to build a shared ZIP archive');
    archive.destroy(error instanceof Error ? error : new Error('Unable to build ZIP archive.'));
  }

  return reply;
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

  const share = await getShareRecordByIdentifier(token);

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
