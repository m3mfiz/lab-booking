import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema.ts';
import { config } from '../utils/config.ts';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle<typeof schema>>;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const client = postgres(config.DATABASE_URL);
  const db = drizzle(client, { schema });

  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    await client.end();
  });
};

export default fp(dbPlugin, { name: 'db' });
