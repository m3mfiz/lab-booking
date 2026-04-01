import { eq, sql, isNull } from 'drizzle-orm';
import type { DbType } from '../db/index.ts';
import { users, computer_labs, bookings } from '../db/schema.ts';
import { hashPassword } from '../utils/password.ts';
import { AppError } from '../utils/errors.ts';

export async function listUsers(db: DbType) {
  return db
    .select({
      id: users.id,
      username: users.username,
      full_name: users.full_name,
      role: users.role,
      created_at: users.created_at,
    })
    .from(users)
    .where(isNull(users.deleted_at))
    .orderBy(users.id);
}

export async function createUser(
  db: DbType,
  data: { username: string; password: string; full_name: string; role?: string }
) {
  const password_hash = await hashPassword(data.password);
  const [user] = await db
    .insert(users)
    .values({
      username: data.username,
      password_hash,
      full_name: data.full_name,
      role: data.role ?? 'user',
    })
    .returning({
      id: users.id,
      username: users.username,
      full_name: users.full_name,
      role: users.role,
      created_at: users.created_at,
    });
  return user;
}

export async function updateUser(
  db: DbType,
  id: number,
  data: { full_name?: string; role?: string; password?: string }
) {
  const updates: Record<string, unknown> = {};
  if (data.full_name) updates.full_name = data.full_name;
  if (data.role) updates.role = data.role;
  if (data.password) updates.password_hash = await hashPassword(data.password);

  if (Object.keys(updates).length === 0) {
    throw AppError.badRequest('No fields to update');
  }

  // If changing role away from admin, check we're not removing the last admin
  if (data.role && data.role !== 'admin') {
    const [current] = await db.select({ role: users.role }).from(users).where(eq(users.id, id));
    if (current?.role === 'admin') {
      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(eq(users.role, 'admin'));
      if ((countRow?.count ?? 0) <= 1) {
        throw AppError.badRequest('Cannot remove the last admin');
      }
    }
  }

  const [user] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      full_name: users.full_name,
      role: users.role,
    });

  if (!user) {
    throw AppError.notFound('User not found');
  }

  return user;
}

export async function deleteUser(db: DbType, id: number) {
  // Check if this is the last admin
  const [target] = await db.select({ role: users.role, deleted_at: users.deleted_at }).from(users).where(eq(users.id, id));

  if (!target || target.deleted_at) {
    throw AppError.notFound('User not found');
  }

  if (target.role === 'admin') {
    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(sql`${users.role} = 'admin' AND ${users.deleted_at} IS NULL`);
    if ((countRow?.count ?? 0) <= 1) {
      throw AppError.badRequest('Cannot delete the last admin');
    }
  }

  // Soft-delete: set deleted_at instead of removing row
  const [deleted] = await db
    .update(users)
    .set({ deleted_at: new Date() })
    .where(eq(users.id, id))
    .returning({ id: users.id });

  return deleted;
}

export async function updateLab(
  db: DbType,
  settings: {
    name?: string;
    total_seats?: number;
    work_start_time?: string;
    work_end_time?: string;
  }
) {
  const [lab] = await db
    .update(computer_labs)
    .set({ ...settings, updated_at: new Date() })
    .where(eq(computer_labs.id, 1))
    .returning();

  if (!lab) {
    throw AppError.notFound('Lab not found');
  }

  return lab;
}

export async function getStats(
  db: DbType,
  from: Date,
  to: Date,
  period: 'day' | 'week'
) {
  const truncUnit = period === 'week' ? 'week' : 'day';

  const rows = await db
    .select({
      period: sql<string>`DATE_TRUNC('${sql.raw(truncUnit)}', ${bookings.start_time})::text`,
      total_bookings: sql<number>`COUNT(*)::int`,
      total_hours: sql<number>`SUM(EXTRACT(EPOCH FROM (${bookings.end_time} - ${bookings.start_time})) / 3600)`,
    })
    .from(bookings)
    .where(
      sql`${bookings.status} = 'active' AND ${bookings.start_time} >= ${from.toISOString()} AND ${bookings.start_time} < ${to.toISOString()}`
    )
    .groupBy(sql`DATE_TRUNC('${sql.raw(truncUnit)}', ${bookings.start_time})`)
    .orderBy(sql`DATE_TRUNC('${sql.raw(truncUnit)}', ${bookings.start_time})`);

  return rows;
}
