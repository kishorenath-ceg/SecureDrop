import type { FastifyReply, FastifyRequest } from 'fastify';
import { getSessionUser } from '../services/authService.js';

export async function sessionController(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization ?? '';
  const user = await getSessionUser(authHeader);

  if (!user) {
    return reply.code(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  return reply.send({ success: true, data: { user } });
}
