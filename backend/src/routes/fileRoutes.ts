import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../services/authService.js';
import {
  downloadFileController,
  listFilesController,
  uploadFileController,
} from '../controllers/fileController.js';

export async function fileRoutes(app: FastifyInstance) {
  app.get('/api/files', { preHandler: [requireAuth] }, listFilesController);
  app.post('/api/files/upload', { preHandler: [requireAuth] }, uploadFileController);
  app.get('/api/files/:id/download', { preHandler: [requireAuth] }, downloadFileController);
}
