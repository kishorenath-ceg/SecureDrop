import type { FastifyInstance } from 'fastify';
import { sessionController } from '../controllers/authController.js';
import { authSessionRateLimit } from '../services/redisRateLimit.js';

export async function authRoutes(app: FastifyInstance) {
  app.get('/api/auth/session', { preHandler: [authSessionRateLimit] }, sessionController);
}
