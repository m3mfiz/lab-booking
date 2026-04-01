import { and, eq, gt, lt, lte, sql, desc } from 'drizzle-orm';
import type { DbType } from '../db/index.ts';
import { bookings, users, computer_labs } from '../db/schema.ts';
import { AppError } from '../utils/errors.ts';

export async function listBookings(
  db: DbType,
  labId: number,
  from: Date,
  to: Date
) {
  const rows = await db
    .select({
      id: bookings.id,
      user_id: bookings.user_id,
      user_full_name: users.full_name,
      lab_id: bookings.lab_id,
      start_time: bookings.start_time,
      end_time: bookings.end_time,
      status: bookings.status,
      created_at: bookings.created_at,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.user_id, users.id))
    .where(
      and(
        eq(bookings.lab_id, labId),
        eq(bookings.status, 'active'),
        lt(bookings.start_time, to),
        gt(bookings.end_time, from)
      )
    );
  return rows;
}

const PAGE_SIZE = 20;

export async function getUserBookings(db: DbType, userId: number, filter?: 'upcoming' | 'past', page = 1) {
  const now = new Date();
  const conditions = [eq(bookings.user_id, userId)];

  if (filter === 'upcoming') {
    conditions.push(gt(bookings.end_time, now));
    conditions.push(eq(bookings.status, 'active'));
  } else if (filter === 'past') {
    conditions.push(lte(bookings.end_time, now));
  }

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(bookings)
    .where(and(...conditions));

  const total = countRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = await db
    .select({
      id: bookings.id,
      user_id: bookings.user_id,
      user_full_name: users.full_name,
      lab_id: bookings.lab_id,
      start_time: bookings.start_time,
      end_time: bookings.end_time,
      status: bookings.status,
      created_at: bookings.created_at,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.user_id, users.id))
    .where(and(...conditions))
    .orderBy(filter === 'past' ? desc(bookings.start_time) : bookings.start_time)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return { items: rows, page, totalPages, total };
}

export async function createBooking(
  db: DbType,
  userId: number,
  labId: number,
  startTime: Date,
  endTime: Date,
  labSettings: { total_seats: number; work_start_time: string; work_end_time: string }
) {
  const now = new Date();

  if (startTime <= now) {
    throw AppError.badRequest('Booking start time must be in the future');
  }

  if (endTime <= startTime) {
    throw AppError.badRequest('End time must be after start time');
  }

  const maxFuture = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (startTime > maxFuture) {
    throw AppError.badRequest('Booking cannot be more than 7 days in the future');
  }

  // Validate within work hours (using local time — TZ set to Europe/Moscow)
  const startHHMM = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
  const endHHMM = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

  if (startTime.getFullYear() !== endTime.getFullYear() ||
      startTime.getMonth() !== endTime.getMonth() ||
      startTime.getDate() !== endTime.getDate()) {
    throw AppError.badRequest('Booking cannot span midnight');
  }

  if (startHHMM < labSettings.work_start_time || endHHMM > labSettings.work_end_time) {
    throw AppError.badRequest(
      `Booking must be within work hours (${labSettings.work_start_time}–${labSettings.work_end_time})`
    );
  }

  // Overlap check + insert in a transaction
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT 1 FROM computer_labs WHERE id = ${labId} FOR UPDATE`);

    // Check if user already has an overlapping booking
    const [userOverlap] = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.user_id, userId),
          eq(bookings.lab_id, labId),
          eq(bookings.status, 'active'),
          lt(bookings.start_time, endTime),
          gt(bookings.end_time, startTime)
        )
      );

    if ((userOverlap?.count ?? 0) > 0) {
      throw AppError.conflict('У вас уже есть бронирование на это время');
    }

    const [countRow] = await tx
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bookings)
      .where(
        and(
          eq(bookings.lab_id, labId),
          eq(bookings.status, 'active'),
          lt(bookings.start_time, endTime),
          gt(bookings.end_time, startTime)
        )
      );

    if ((countRow?.count ?? 0) >= labSettings.total_seats) {
      throw AppError.conflict('No seats available for the requested time slot');
    }

    const [booking] = await tx
      .insert(bookings)
      .values({
        user_id: userId,
        lab_id: labId,
        start_time: startTime,
        end_time: endTime,
        status: 'active',
      })
      .returning();

    return booking;
  });

  return result;
}

export async function cancelBooking(
  db: DbType,
  bookingId: number,
  userId: number
) {
  const [existing] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!existing) {
    throw AppError.notFound('Booking not found');
  }

  if (existing.user_id !== userId) {
    throw AppError.forbidden('You can only cancel your own bookings');
  }

  if (existing.status === 'cancelled') {
    throw AppError.badRequest('Booking is already cancelled');
  }

  const [updated] = await db
    .update(bookings)
    .set({ status: 'cancelled' })
    .where(eq(bookings.id, bookingId))
    .returning();

  return updated;
}

export async function getTodayBookings(db: DbType, labId: number) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const rows = await db
    .select({
      id: bookings.id,
      user_full_name: users.full_name,
      start_time: bookings.start_time,
      end_time: bookings.end_time,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.user_id, users.id))
    .where(
      and(
        eq(bookings.lab_id, labId),
        eq(bookings.status, 'active'),
        lt(bookings.start_time, todayEnd),
        gt(bookings.end_time, todayStart)
      )
    )
    .orderBy(bookings.start_time);

  return rows;
}

export async function getAvailability(
  db: DbType,
  labId: number,
  from: Date,
  to: Date
) {
  const [lab] = await db
    .select()
    .from(computer_labs)
    .where(eq(computer_labs.id, labId))
    .limit(1);

  if (!lab) {
    throw AppError.notFound('Lab not found');
  }

  const totalSeats = lab.total_seats;

  // Single query: generate hour slots and count overlapping bookings per slot
  const rows = await db.execute(sql`
    SELECT
      h.hour_start,
      COALESCE(COUNT(b.id), 0)::int AS booked
    FROM generate_series(
      date_trunc('hour', ${from.toISOString()}::timestamptz),
      ${to.toISOString()}::timestamptz - interval '1 hour',
      interval '1 hour'
    ) AS h(hour_start)
    LEFT JOIN ${bookings} b ON
      b.lab_id = ${labId}
      AND b.status = 'active'
      AND b.start_time < h.hour_start + interval '1 hour'
      AND b.end_time > h.hour_start
    GROUP BY h.hour_start
    ORDER BY h.hour_start
  `);

  return rows.map((row: any) => ({
    hour: new Date(row.hour_start).toISOString(),
    available_seats: Math.max(0, totalSeats - (row.booked ?? 0)),
    total_seats: totalSeats,
  }));
}
