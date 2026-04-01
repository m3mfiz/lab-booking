import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  listBookings,
  getUserBookings,
  createBooking,
  cancelBooking,
  getAvailability,
  getTodayBookings,
} from '../services/booking.service.ts';
import { computer_labs } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { AppError } from '../utils/errors.ts';
import { logAudit } from '../services/audit.service.ts';

const createBookingSchema = z.object({
  start_time: z.string().min(1),
  end_time: z.string().min(1),
});

const bookingRoutes: FastifyPluginAsync = async (fastify) => {
  // All booking routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/bookings
  fastify.get('/api/bookings', async (request, reply) => {
    const query = request.query as { from?: string; to?: string };
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await listBookings(fastify.db, 1, from, to);
    return reply.send(result);
  });

  // GET /api/bookings/today
  fastify.get('/api/bookings/today', async (request, reply) => {
    const result = await getTodayBookings(fastify.db, 1);
    return reply.send(result);
  });

  // GET /api/bookings/my?filter=upcoming|past&page=1
  fastify.get('/api/bookings/my', async (request, reply) => {
    const query = request.query as { filter?: string; page?: string };
    const filter = query.filter === 'upcoming' || query.filter === 'past' ? query.filter : undefined;
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const result = await getUserBookings(fastify.db, request.user.id, filter, page);
    return reply.send(result);
  });

  // GET /api/bookings/availability
  fastify.get('/api/bookings/availability', async (request, reply) => {
    const query = request.query as { from?: string; to?: string };
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + 24 * 60 * 60 * 1000);

    const result = await getAvailability(fastify.db, 1, from, to);
    return reply.send(result);
  });

  // POST /api/bookings
  fastify.post('/api/bookings', async (request, reply) => {
    const body = createBookingSchema.parse(request.body);

    const [lab] = await fastify.db
      .select()
      .from(computer_labs)
      .where(eq(computer_labs.id, 1))
      .limit(1);

    if (!lab) {
      throw AppError.notFound('Lab not found');
    }

    const booking = await createBooking(
      fastify.db,
      request.user.id,
      1,
      new Date(body.start_time),
      new Date(body.end_time),
      {
        total_seats: lab.total_seats,
        work_start_time: lab.work_start_time,
        work_end_time: lab.work_end_time,
      }
    );

    await logAudit(fastify.db, 'create_booking', request.user.id, 'booking', booking.id, {
      start_time: body.start_time, end_time: body.end_time,
    });
    return reply.code(201).send(booking);
  });

  // PATCH /api/bookings/:id/cancel
  fastify.patch('/api/bookings/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await cancelBooking(fastify.db, parseInt(id, 10), request.user.id);
    await logAudit(fastify.db, 'cancel_booking', request.user.id, 'booking', parseInt(id, 10));
    return reply.send(result);
  });
};

export default bookingRoutes;
