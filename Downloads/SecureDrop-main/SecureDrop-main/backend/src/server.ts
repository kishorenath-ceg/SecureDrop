import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { authRoutes } from './routes/authRoutes.js';
import { dashboardRoutes } from './routes/dashboardRoutes.js';
import { fileRoutes } from './routes/fileRoutes.js';
import { profileRoutes } from './routes/profileRoutes.js';
import { shareRoutes } from './routes/shareRoutes.js';

dotenv.config({ path: '../.env' });

const allowedOrigins = [
  process.env.APP_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];

function isLocalDevelopmentOrigin(origin?: string) {
  if (process.env.NODE_ENV === 'production' || !origin) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' || !url.port) {
    return false;
  }

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return true;
  }

  const octets = url.hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  );
}

const app = Fastify({
  logger: true,
});

app.addHook('onRequest', async (_request, reply) => {
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  reply.header('Cache-Control', 'no-store');
});

app.register(cors, {
  origin: (origin, callback) => {
    callback(null, !origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

app.register(rateLimit, {
  global: true,
  max: 120,
  timeWindow: '1 minute',
  skipOnError: true,
  ban: 5,
});

app.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
  },
});
app.register(authRoutes);
app.register(profileRoutes);
app.register(fileRoutes);
app.register(shareRoutes);
app.register(dashboardRoutes);

app.get('/health', async () => ({
  success: true,
  data: {
    status: 'ok',
    service: 'securedrop-backend',
    time: new Date().toISOString(),
  },
}));

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3001);
    const host = process.env.HOST ?? '0.0.0.0';

    await app.listen({ port, host });
    console.log(`SecureDrop backend listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
