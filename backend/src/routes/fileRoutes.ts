import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../services/authService.js';
import {
  deleteFileController,
  downloadFileController,
  listFilesController,
  uploadFileController,
} from '../controllers/fileController.js';

async function requireAuthForPrivateDownload(
  request: Parameters<typeof requireAuth>[0],
  reply: Parameters<typeof requireAuth>[1]
) {
  const { token } = request.query as { token?: string };
  if (token) {
    return;
  }

  return requireAuth(request, reply);
}

export async function fileRoutes(app: FastifyInstance) {
  app.get('/api/files', { preHandler: [requireAuth] }, listFilesController);
  app.post('/api/files/upload', { preHandler: [requireAuth] }, uploadFileController);
  app.delete('/api/files/:id', { preHandler: [requireAuth] }, deleteFileController);
  app.get('/api/files/:id/download', { preHandler: [requireAuthForPrivateDownload] }, downloadFileController);
}
