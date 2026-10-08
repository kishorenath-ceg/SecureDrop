import type { FastifyReply, FastifyRequest } from 'fastify';
import { getSessionUser } from '../services/authService.js';
import {
  buildStoragePath,
  createUploadRecord,
  getFileById,
  getOwnedFile,
  listFilesForOwner,
  readStoredFile,
  storeUploadedFile,
  uploadFileSchema,
} from '../services/fileService.js';
import { evaluateShareAccess, getShareRecordBySlug, getShareRecordByToken } from '../services/shareService.js';

export async function listFilesController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request as { user?: { id: string } }).user;

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required to list files.',
      },
    });
  }

  const files = await listFilesForOwner(user.id);

  return reply.send({
    success: true,
    data: {
      files,
      count: files.length,
    },
  });
}

export async function downloadFileController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const params = request.params as { id?: string };
  const fileId = params.id;
  const query = request.query as { token?: string };
  const user = (request as { user?: { id: string } }).user;

  if (!fileId) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'INVALID_FILE_ID',
        message: 'A valid file ID is required.',
      },
    });
  }

  let file;
  try {
    if (user) {
      file = await getOwnedFile(fileId, user.id);
    } else if (query.token) {
      const share = getShareRecordByToken(query.token) ?? getShareRecordBySlug(query.token);
      if (!share || !share.fileId || share.fileId !== fileId) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'INVALID_SHARE_TOKEN',
            message: 'This file is not available for the provided access token.',
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

      if (!evaluation.allowed) {
        return reply.code(evaluation.reason === 'LINK_EXPIRED' ? 410 : 403).send({
          success: false,
          error: {
            code: evaluation.reason ?? 'DOWNLOAD_FORBIDDEN',
            message: evaluation.reason === 'LINK_EXPIRED' ? 'This sharing link has expired.' : 'This download is not permitted.',
          },
        });
      }

      file = await getFileById(fileId);
      if (!file) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'The requested file was not found.',
          },
        });
      }
    } else {
      return reply.code(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to download files.',
        },
      });
    }
  } catch {
    return reply.code(500).send({
      success: false,
      error: { code: 'FILE_LOOKUP_FAILED', message: 'Unable to load the requested file.' },
    });
  }

  if (!file) {
    return reply.code(404).send({
      success: false,
      error: {
        code: 'FILE_NOT_FOUND',
        message: 'The requested file was not found.',
      },
    });
  }

  try {
    const buffer = await readStoredFile(file);

    return reply
      .type(file.mimeType)
      .header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`)
      .send(buffer);
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Unable to download the file.',
      },
    });
  }
}

export async function uploadFileController(
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
          message: 'Authentication required to upload files.',
        },
      });
    }

    const file = await request.file();

    if (!file) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: 'A file upload is required.',
        },
      });
    }

    const buffer = await file.toBuffer();
    const metadata = uploadFileSchema.parse({
      originalName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: buffer.byteLength,
    });

    const storagePath = buildStoragePath(user.id, metadata.originalName);
    const result = await createUploadRecord({
      originalName: metadata.originalName,
      mimeType: metadata.mimeType,
      sizeBytes: metadata.sizeBytes,
      userId: user.id,
      storagePath,
    });

    const storedFile = await storeUploadedFile(
      {
        ...result,
        ownerId: user.id,
      },
      buffer
    );

    const { buffer: uploadedBuffer, ...fileResponse } = storedFile;
    void uploadedBuffer;

    return reply.code(201).send({
      success: true,
      data: {
        ...fileResponse,
        uploadUrl: `/api/files/${storedFile.id}/download`,
      },
    });
  } catch (error) {
    return reply.code(400).send({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'File upload failed.',
      },
    });
  }
}
