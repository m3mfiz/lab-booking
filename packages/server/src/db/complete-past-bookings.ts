/**
 * Cron script: marks past active bookings as 'completed'.
 * Run via: npx tsx packages/server/src/db/complete-past-bookings.ts
 * Schedule: every hour via crontab
 */
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const client = postgres(process.env.DATABASE_URL!, { max: 1 });

async function main() {
  const result = await client`
    UPDATE bookings
    SET status = 'completed'
    WHERE status = 'active'
      AND end_time < NOW()
  `;

  const count = result.count;
  if (count > 0) {
    console.log(`Marked ${count} booking(s) as completed.`);
  }

  await client.end();
}

main().catch((err) => {
  console.error('Failed to complete past bookings:', err);
  process.exit(1);
});
