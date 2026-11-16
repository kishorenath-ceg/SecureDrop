import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../services/authService.js';
import {
  getProfileController,
  updateProfileController,
} from '../controllers/profileController.js';

export async function profileRoutes(app: FastifyInstance) {
  app.get('/api/v1/profile', { preHandler: [requireAuth] }, getProfileController);
  app.patch('/api/v1/profile', { preHandler: [requireAuth] }, updateProfileController);
}
