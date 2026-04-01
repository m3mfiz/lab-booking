import type { FastifyPluginAsync } from 'fastify';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { login } from '../services/auth.service.ts';
import { config } from '../utils/config.ts';
import { users, refresh_tokens } from '../db/schema.ts';
import { verifyPassword, hashPassword } from '../utils/password.ts';
import { AppError } from '../utils/errors.ts';
import { logAudit } from '../services/audit.service.ts';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const loginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const refreshBodySchema = z.object({
  refresh_token: z.string().min(1),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/login (rate limited: 5 attempts per minute per IP)
  fastify.post('/api/auth/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const user = await login(fastify.db, body.username, body.password);

    const accessToken = fastify.jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '7d', jwtid: crypto.randomUUID() }
    );

    // Store refresh token hash in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await fastify.db.insert(refresh_tokens).values({
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: expiresAt,
    });

    await logAudit(fastify.db, 'login', user.id, 'user', user.id);
    return reply.send({ access_token: accessToken, refresh_token: refreshToken, user });
  });

  // POST /api/auth/refresh — rotation: old token revoked, new one issued
  fastify.post('/api/auth/refresh', async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);

    let payload: { id: number; username: string; role: string };
    try {
      payload = jwt.verify(body.refresh_token, config.JWT_REFRESH_SECRET) as {
        id: number;
        username: string;
        role: string;
      };
    } catch {
      throw AppError.unauthorized('Invalid refresh token');
    }

    // Check token exists in DB and is not revoked
    const tokenHash = hashToken(body.refresh_token);
    const [storedToken] = await fastify.db
      .select()
      .from(refresh_tokens)
      .where(and(
        eq(refresh_tokens.token_hash, tokenHash),
        isNull(refresh_tokens.revoked_at)
      ))
      .limit(1);

    if (!storedToken) {
      throw AppError.unauthorized('Refresh token has been revoked');
    }

    // Revoke old token
    await fastify.db
      .update(refresh_tokens)
      .set({ revoked_at: new Date() })
      .where(eq(refresh_tokens.id, storedToken.id));

    // Issue new tokens
    const accessToken = fastify.jwt.sign(
      { id: payload.id, username: payload.username, role: payload.role },
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { id: payload.id, username: payload.username, role: payload.role },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '7d', jwtid: crypto.randomUUID() }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await fastify.db.insert(refresh_tokens).values({
      user_id: payload.id,
      token_hash: hashToken(newRefreshToken),
      expires_at: expiresAt,
    });

    return reply.send({ access_token: accessToken, refresh_token: newRefreshToken });
  });

  // POST /api/auth/logout — revoke refresh token
  fastify.post('/api/auth/logout', async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);
    const tokenHash = hashToken(body.refresh_token);

    await fastify.db
      .update(refresh_tokens)
      .set({ revoked_at: new Date() })
      .where(and(
        eq(refresh_tokens.token_hash, tokenHash),
        isNull(refresh_tokens.revoked_at)
      ));

    return reply.send({ message: 'Logged out' });
  });

  // PATCH /api/auth/password
  const changePasswordSchema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(6),
  });

  fastify.patch(
    '/api/auth/password',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = changePasswordSchema.parse(request.body);
      const [user] = await fastify.db
        .select()
        .from(users)
        .where(eq(users.id, request.user.id))
        .limit(1);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const valid = await verifyPassword(body.current_password, user.password_hash);
      if (!valid) {
        return reply.code(400).send({ error: 'Current password is incorrect' });
      }

      const newHash = await hashPassword(body.new_password);
      await fastify.db
        .update(users)
        .set({ password_hash: newHash })
        .where(eq(users.id, request.user.id));

      await logAudit(fastify.db, 'change_password', request.user.id, 'user', request.user.id);
      return reply.send({ message: 'Password changed successfully' });
    }
  );

  // GET /api/auth/me
  fastify.get(
    '/api/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const [user] = await fastify.db
        .select({
          id: users.id,
          username: users.username,
          full_name: users.full_name,
          role: users.role,
        })
        .from(users)
        .where(eq(users.id, request.user.id));

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      return reply.send(user);
    }
  );
};

export default authRoutes;
