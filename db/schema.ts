import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const rooms = sqliteTable('rooms', {
  code: text('code').primaryKey(),
  hostToken: text('host_token').notNull(),
  createdAt: integer('created_at').notNull(),
  locked: integer('locked').notNull().default(0),
  pulse: integer('pulse').notNull().default(0),
  state: text('state').notNull().default('{}'),
  revision: integer('revision').notNull().default(0),
});
export const players = sqliteTable('players', {
  token: text('token').primaryKey(),
  roomCode: text('room_code').notNull().references(() => rooms.code, {onDelete: 'cascade'}),
  name: text('name').notNull(),
  avatar: integer('avatar').notNull(),
  ready: integer('ready').notNull().default(0),
  joinedAt: integer('joined_at').notNull(),
  lastSeen: integer('last_seen').notNull(),
});
