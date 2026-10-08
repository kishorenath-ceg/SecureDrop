import type { FastifyInstance } from 'fastify';
import { sessionController } from '../controllers/authController.js';

export async function authRoutes(app: FastifyInstance) {
  app.get('/api/auth/session', sessionController);
}
