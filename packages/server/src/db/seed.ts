import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { users, computer_labs } from './schema.ts';
import { hashPassword } from '../utils/password.ts';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log('Seeding database...');

  const passwordHash = await hashPassword('admin123');

  await db
    .insert(users)
    .values({
      username: 'admin',
      password_hash: passwordHash,
      full_name: 'Administrator',
      role: 'admin',
    })
    .onConflictDoNothing();

  await db
    .insert(computer_labs)
    .values({
      name: 'Main Lab',
      total_seats: 10,
      work_start_time: '09:00',
      work_end_time: '18:00',
    })
    .onConflictDoNothing();

  console.log('Seed complete.');
  await client.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
