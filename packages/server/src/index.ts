import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import dbPlugin from './plugins/db.ts';
import authPlugin from './plugins/auth.ts';
import authRoutes from './routes/auth.ts';
import bookingRoutes from './routes/bookings.ts';
import labRoutes from './routes/labs.ts';
import adminRoutes from './routes/admin.ts';
import { config } from './utils/config.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fastify = Fastify({
  logger: true,
});

async function start() {
  await fastify.register(cors, {
    origin: [
      'http://146.103.105.229:3001',
      'http://146.103.105.229:5173',
      'http://localhost:3001',
      'http://localhost:5173',
    ],
  });
  await fastify.register(rateLimit, { global: false });
  await fastify.register(dbPlugin);
  await fastify.register(authPlugin);

  await fastify.register(authRoutes);
  await fastify.register(bookingRoutes);
  await fastify.register(labRoutes);
  await fastify.register(adminRoutes);

  // Serve built client files
  await fastify.register(fastifyStatic, {
    root: path.resolve(__dirname, '../../client/dist'),
    wildcard: false,
  });

  // Serve /assets/* with correct MIME types
  fastify.get('/assets/*', (request, reply) => {
    const filePath = request.url;
    return reply.sendFile(filePath);
  });

  // SPA fallback: non-API routes serve index.html
  fastify.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Route not found' });
    }
    return reply.sendFile('index.html');
  });

  // Global error handler
  fastify.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.message });
    }
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({ error: error.message, ...(error.code ? { code: error.code } : {}) });
  });

  await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`Server running on port ${config.PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
