import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  time,
  jsonb,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  full_name: varchar('full_name', { length: 200 }).notNull(),
  role: varchar('role', { length: 10 }).notNull().default('user'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
});

export const computer_labs = pgTable('computer_labs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 200 }).notNull().default('Main Lab'),
  total_seats: integer('total_seats').notNull(),
  work_start_time: time('work_start_time').notNull(),
  work_end_time: time('work_end_time').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  lab_id: integer('lab_id')
    .notNull()
    .references(() => computer_labs.id)
    .default(1),
  start_time: timestamp('start_time', { withTimezone: true }).notNull(),
  end_time: timestamp('end_time', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 15 }).notNull().default('active'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const audit_log = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  action: varchar('action', { length: 50 }).notNull(),
  user_id: integer('user_id').references(() => users.id),
  entity_type: varchar('entity_type', { length: 30 }),
  entity_id: integer('entity_id'),
  details: jsonb('details'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ComputerLab = typeof computer_labs.$inferSelect;
export type NewComputerLab = typeof computer_labs.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export const refresh_tokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token_hash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked_at: timestamp('revoked_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type AuditLog = typeof audit_log.$inferSelect;
export type RefreshToken = typeof refresh_tokens.$inferSelect;
