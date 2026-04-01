import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { computer_labs } from '../db/schema.ts';

const labRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/labs
  fastify.get('/api/labs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [lab] = await fastify.db
      .select()
      .from(computer_labs)
      .where(eq(computer_labs.id, 1))
      .limit(1);

    if (!lab) {
      const err = new Error('Lab not found') as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    return reply.send(lab);
  });
};

export default labRoutes;
