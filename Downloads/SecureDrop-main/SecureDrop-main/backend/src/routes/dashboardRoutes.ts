import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../services/authService.js';
import {
  dashboardFilesController,
  dashboardStatsController,
} from '../controllers/dashboardController.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/api/dashboard/stats', { preHandler: [requireAuth] }, dashboardStatsController);
  app.get('/api/dashboard/files', { preHandler: [requireAuth] }, dashboardFilesController);
}
