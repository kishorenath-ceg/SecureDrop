import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { listFilesForOwner } from '../services/fileService.js';
import { buildDashboardStats, summarizeDashboard } from '../services/dashboardService.js';
import { buildPublicShareUrl, listShareLinksForOwner } from '../services/shareService.js';

export async function dashboardStatsController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request as { user?: { id: string } }).user;

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required to view dashboard stats.',
      },
    });
  }

  const files = await listFilesForOwner(user.id);
  const shareLinks = listShareLinksForOwner(user.id);
  const stats = summarizeDashboard({ files, shareLinks });

  return reply.send({
    success: true,
    data: buildDashboardStats({
      totalFiles: stats.totalFiles,
      activeLinks: stats.activeLinks,
      expiredLinks: stats.expiredLinks,
      totalDownloads: stats.totalDownloads,
      storageUsedBytes: files.reduce((sum, file) => sum + Number(file.sizeBytes ?? 0), 0),
    }),
  });
}

export async function dashboardFilesController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request as { user?: { id: string } }).user;

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required to view files.',
      },
    });
  }

  const files = await listFilesForOwner(user.id);
  const shareLinks = listShareLinksForOwner(user.id);

  const data = files.map((file) => {
    const shareLink = shareLinks.find((link) => link.fileId === file.id);
    const shareUrl = shareLink
      ? buildPublicShareUrl(env.APP_URL, shareLink.customSlug ?? shareLink.token)
      : null;

    return {
      id: file.id,
      name: file.originalName,
      size: `${(Number(file.sizeBytes) / 1024 / 1024).toFixed(2)} MB`,
      uploadDate: new Date(file.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      shareLink: shareUrl ?? 'Not shared',
      expiration: shareLink?.expiresAt ? new Date(shareLink.expiresAt).toLocaleString() : 'No expiration',
      downloads: `${shareLink?.downloadCount ?? 0} / ${shareLink?.maxDownloads == null ? '∞' : shareLink.maxDownloads}`,
      status: shareLink && shareLink.isActive && !shareLink.isRevoked ? 'Active' : 'Unavailable',
      actions: shareUrl ? ['Copy link', 'Open link'] : ['Create link'],
    };
  });

  return reply.send({
    success: true,
    data: {
      files: data,
    },
  });
}
