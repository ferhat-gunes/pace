-- Migration: 0006_web_push.sql
-- Web Push abonelikleri, sessiz saatler ve günlük/sosyal bildirim tercihleri

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  reminder_time TEXT NOT NULL DEFAULT '20:00',
  quiet_start TEXT NOT NULL DEFAULT '22:00',
  quiet_end TEXT NOT NULL DEFAULT '08:30',
  daily_enabled INTEGER NOT NULL DEFAULT 1 CHECK (daily_enabled IN (0, 1)),
  social_enabled INTEGER NOT NULL DEFAULT 1 CHECK (social_enabled IN (0, 1)),
  last_sent_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_daily_idx ON push_subscriptions(daily_enabled, last_sent_date);
