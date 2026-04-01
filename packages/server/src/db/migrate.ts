import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });

async function main() {
  console.log('Running migrations...');

  await client`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(200) NOT NULL,
      role VARCHAR(10) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS computer_labs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL DEFAULT 'Main Lab',
      total_seats INTEGER NOT NULL,
      work_start_time TIME NOT NULL,
      work_end_time TIME NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lab_id INTEGER NOT NULL REFERENCES computer_labs(id) DEFAULT 1,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status VARCHAR(15) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Indexes for booking queries
  await client`
    CREATE INDEX IF NOT EXISTS idx_bookings_lab_status_time
    ON bookings (lab_id, status, start_time, end_time)
  `;

  await client`
    CREATE INDEX IF NOT EXISTS idx_bookings_user_id
    ON bookings (user_id)
  `;

  // #6: Soft-delete users — add deleted_at column
  await client`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL
  `;

  // #8: Audit log table
  await client`
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      action VARCHAR(50) NOT NULL,
      user_id INTEGER REFERENCES users(id),
      entity_type VARCHAR(30),
      entity_id INTEGER,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await client`
    CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log (user_id)
  `;

  await client`
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at)
  `;

  // #9: Refresh tokens table
  await client`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await client`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id)
  `;

  await client`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash)
  `;

  console.log('Migrations complete.');
  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
