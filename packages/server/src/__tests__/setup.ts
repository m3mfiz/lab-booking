import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dbPlugin from '../plugins/db.ts';
import authPlugin from '../plugins/auth.ts';
import authRoutes from '../routes/auth.ts';
import bookingRoutes from '../routes/bookings.ts';
import adminRoutes from '../routes/admin.ts';
import labRoutes from '../routes/labs.ts';

export async function buildApp() {
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(cors, { origin: true });
  await app.register(rateLimit, { global: false });
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(bookingRoutes);
  await app.register(labRoutes);
  await app.register(adminRoutes);

  app.setErrorHandler((error: Error & { statusCode?: number; cause?: unknown }, _request, reply) => {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.message });
    }
    const statusCode = error.statusCode ?? 500;
    if (statusCode === 500) {
      console.error('Unhandled error:', error.message, error.cause ?? '');
    }
    reply.code(statusCode).send({ error: error.message });
  });

  await app.ready();
  return app;
}

let loginCounter = 0;

function uniqueIp() {
  loginCounter++;
  const b = (loginCounter >> 8) & 255;
  const c = loginCounter & 255;
  return `10.${b}.${c}.1`;
}

export async function loginAsAdmin(app: ReturnType<typeof Fastify>) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'admin', password: 'admin123' },
    headers: { 'x-forwarded-for': uniqueIp() },
  });
  const body = JSON.parse(res.body);
  return body.access_token as string;
}

export async function loginAsAdminFull(app: ReturnType<typeof Fastify>) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username: 'admin', password: 'admin123' },
    headers: { 'x-forwarded-for': uniqueIp() },
  });
  return JSON.parse(res.body) as { access_token: string; refresh_token: string };
}
