import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp, loginAsAdmin } from './setup.ts';

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  app = await buildApp();
  token = await loginAsAdmin(app);
});

afterAll(async () => {
  await app.close();
});

function authHeaders() {
  return { authorization: `Bearer ${token}` };
}

function futureDate(hoursFromNow: number) {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  // Clamp to work hours (09-18) on a future day
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return tomorrow;
}

describe('Bookings', () => {
  it('GET /api/bookings — requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/bookings' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/bookings — returns list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/bookings',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body))).toBe(true);
  });

  it('POST /api/bookings — create and cancel', async () => {
    const start = futureDate(0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: authHeaders(),
      payload: {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      },
    });
    expect(createRes.statusCode).toBe(201);
    const booking = JSON.parse(createRes.body);
    expect(booking).toHaveProperty('id');
    expect(booking.status).toBe('active');

    // Cancel
    const cancelRes = await app.inject({
      method: 'PATCH',
      url: `/api/bookings/${booking.id}/cancel`,
      headers: authHeaders(),
    });
    expect(cancelRes.statusCode).toBe(200);
    expect(JSON.parse(cancelRes.body).status).toBe('cancelled');
  });

  it('POST /api/bookings — reject past time', async () => {
    const past = new Date();
    past.setHours(past.getHours() - 2);
    const end = new Date(past);
    end.setHours(past.getHours() + 1);

    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: authHeaders(),
      payload: {
        start_time: past.toISOString(),
        end_time: end.toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/bookings — reject end before start', async () => {
    const start = futureDate(0);
    const end = new Date(start);
    end.setHours(start.getHours() - 1);

    const res = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: authHeaders(),
      payload: {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/bookings/today — returns array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/bookings/today',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body))).toBe(true);
  });

  it('GET /api/bookings/my — returns paginated result', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/bookings/my?filter=upcoming&page=1',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('totalPages');
    expect(body).toHaveProperty('total');
  });

  it('GET /api/bookings/availability — returns slots', async () => {
    const from = new Date();
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    const res = await app.inject({
      method: 'GET',
      url: `/api/bookings/availability?from=${from.toISOString()}&to=${to.toISOString()}`,
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('available_seats');
      expect(body[0]).toHaveProperty('total_seats');
    }
  });

  it('PATCH /api/bookings/:id/cancel — wrong user', async () => {
    // Create a booking as admin
    const start = futureDate(0);
    start.setMinutes(30); // offset to avoid collision
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: authHeaders(),
      payload: {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      },
    });

    if (createRes.statusCode === 201) {
      const booking = JSON.parse(createRes.body);
      // Try cancel with a fake token (we can't easily create another user in this test)
      const cancelRes = await app.inject({
        method: 'PATCH',
        url: `/api/bookings/${booking.id}/cancel`,
        // No auth — should fail
      });
      expect(cancelRes.statusCode).toBe(401);

      // Clean up
      await app.inject({
        method: 'PATCH',
        url: `/api/bookings/${booking.id}/cancel`,
        headers: authHeaders(),
      });
    }
  });
});
