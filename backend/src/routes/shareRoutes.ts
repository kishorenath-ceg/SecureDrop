import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../services/authService.js';
import {
  createShareLinkController,
  downloadShareController,
  listShareLinksController,
  publicShareStatusController,
  revokeShareLinkController,
  verifyPasswordController,
} from '../controllers/shareController.js';

export async function shareRoutes(app: FastifyInstance) {
  app.get('/api/share-links', { preHandler: [requireAuth] }, listShareLinksController);
  app.post('/api/share-links', { preHandler: [requireAuth] }, createShareLinkController);
  app.delete('/api/share-links/:id', { preHandler: [requireAuth] }, revokeShareLinkController);
  app.get('/api/share/:token', publicShareStatusController);
  app.post('/api/share/:token/verify-password', verifyPasswordController);
  app.post('/api/share/:token/download', downloadShareController);
}
