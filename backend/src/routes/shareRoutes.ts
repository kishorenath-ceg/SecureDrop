import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../services/authService.js';
import {
  publicDownloadRateLimit,
  shareCreationRateLimit,
  sharePasswordRateLimit,
} from '../services/redisRateLimit.js';
import {
  createShareLinkController,
  downloadShareController,
  listShareLinksController,
  publicShareStatusController,
  revokeShareLinkController,
  serveShareDownloadController,
  verifyPasswordController,
} from '../controllers/shareController.js';

export async function shareRoutes(app: FastifyInstance) {
  app.get('/api/share-links', { preHandler: [requireAuth] }, listShareLinksController);
  app.post(
    '/api/share-links',
    { preHandler: [requireAuth, shareCreationRateLimit] },
    createShareLinkController
  );
  app.delete('/api/share-links/:id', { preHandler: [requireAuth] }, revokeShareLinkController);
  app.get('/api/share/:token', publicShareStatusController);
  app.get('/api/share/:token/download/:ticket', { preHandler: [publicDownloadRateLimit] }, serveShareDownloadController);
  app.post('/api/share/:token/verify-password', { preHandler: [sharePasswordRateLimit] }, verifyPasswordController);
  app.post('/api/share/:token/download', { preHandler: [publicDownloadRateLimit] }, downloadShareController);
}
