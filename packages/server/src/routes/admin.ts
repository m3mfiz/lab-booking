import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateLab,
  getStats,
} from '../services/admin.service.ts';
import { authenticate, requireAdmin } from '../middleware/auth.ts';
import { logAudit } from '../services/audit.service.ts';

const createUserSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(6),
  full_name: z.string().min(1).max(200),
  role: z.enum(['user', 'admin']).optional(),
});

const updateLabSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  total_seats: z.number().int().positive().optional(),
  work_start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).transform(v => v.slice(0, 5)).optional(),
  work_end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).transform(v => v.slice(0, 5)).optional(),
});

const statsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  period: z.enum(['day', 'week']).optional(),
});

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // All admin routes require authentication + admin role
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireAdmin);

  // GET /api/admin/users
  fastify.get('/api/admin/users', async (request, reply) => {
    const result = await listUsers(fastify.db);
    return reply.send(result);
  });

  // POST /api/admin/users
  fastify.post('/api/admin/users', async (request, reply) => {
    const body = createUserSchema.parse(request.body);
    const user = await createUser(fastify.db, body);
    await logAudit(fastify.db, 'create_user', request.user.id, 'user', user.id, { username: body.username, role: body.role ?? 'user' });
    return reply.code(201).send(user);
  });

  // PATCH /api/admin/users/:id
  const updateUserSchema = z.object({
    full_name: z.string().min(1).max(200).optional(),
    role: z.enum(['user', 'admin']).optional(),
    password: z.string().min(6).optional(),
  });

  fastify.patch('/api/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateUserSchema.parse(request.body);
    const user = await updateUser(fastify.db, parseInt(id, 10), body);
    return reply.send(user);
  });

  // DELETE /api/admin/users/:id
  fastify.delete('/api/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteUser(fastify.db, parseInt(id, 10));
    await logAudit(fastify.db, 'delete_user', request.user.id, 'user', parseInt(id, 10));
    return reply.code(204).send();
  });

  // PUT /api/admin/labs
  fastify.put('/api/admin/labs', async (request, reply) => {
    const body = updateLabSchema.parse(request.body);
    const lab = await updateLab(fastify.db, body);
    await logAudit(fastify.db, 'update_settings', request.user.id, 'lab', 1, body);
    return reply.send(lab);
  });

  // GET /api/admin/stats
  fastify.get('/api/admin/stats', async (request, reply) => {
    const query = statsQuerySchema.parse(request.query);
    const from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = query.to ? new Date(query.to) : new Date();
    const period = query.period ?? 'day';
    const result = await getStats(fastify.db, from, to, period);
    return reply.send(result);
  });
};

export default adminRoutes;
