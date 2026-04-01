import { eq, and, isNull } from 'drizzle-orm';
import type { DbType } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { verifyPassword } from '../utils/password.ts';
import { AppError } from '../utils/errors.ts';

export async function login(
  db: DbType,
  username: string,
  password: string
): Promise<{ id: number; username: string; full_name: string; role: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.username, username), isNull(users.deleted_at)))
    .limit(1);

  if (!user) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw AppError.unauthorized('Invalid credentials');
  }

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
  };
}
