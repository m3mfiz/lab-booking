import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp, loginAsAdmin, loginAsAdminFull } from './setup.ts';

let app: FastifyInstance;
let ipCounter = 100;

function uniqueIp() {
  return `10.1.${ipCounter++}.1`;
}

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

describe('Auth', () => {
  it('POST /api/auth/login — success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
      headers: { 'x-forwarded-for': uniqueIp() },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('refresh_token');
    expect(body.user.username).toBe('admin');
  });

  it('POST /api/auth/login — wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'wrong' },
      headers: { 'x-forwarded-for': uniqueIp() },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/auth/login — non-existent user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'nobody', password: 'test' },
      headers: { 'x-forwarded-for': uniqueIp() },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/auth/refresh — valid token with rotation', async () => {
    const { refresh_token } = await loginAsAdminFull(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refresh_token },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('refresh_token');
    // New refresh token should be different
    expect(body.refresh_token).not.toBe(refresh_token);

    // Old token should be revoked
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refresh_token },
    });
    expect(res2.statusCode).toBe(401);
  });

  it('POST /api/auth/refresh — invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refresh_token: 'invalid-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/auth/logout — revokes token', async () => {
    const { refresh_token } = await loginAsAdminFull(app);

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refresh_token },
    });
    expect(res.statusCode).toBe(200);

    // Token should no longer work
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refresh_token },
    });
    expect(res2.statusCode).toBe(401);
  });

  it('GET /api/auth/me — authenticated', async () => {
    const token = await loginAsAdmin(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.username).toBe('admin');
    expect(body.role).toBe('admin');
  });

  it('GET /api/auth/me — no token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });
    expect(res.statusCode).toBe(401);
  });

  it('PATCH /api/auth/password — wrong current password', async () => {
    const token = await loginAsAdmin(app);
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/auth/password',
      headers: { authorization: `Bearer ${token}` },
      payload: { current_password: 'wrongpass', new_password: 'newpass123' },
    });
    expect(res.statusCode).toBe(400);
  });
});
