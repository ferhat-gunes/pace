-- 0008_native_push_tokens.sql
-- Adds native Expo/APNs/FCM push tokens table and user-scoped notification_preferences
-- decoupled from Web Push push_subscriptions.

CREATE TABLE IF NOT EXISTS native_push_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS native_push_tokens_user_idx
  ON native_push_tokens(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  reminder_time TEXT NOT NULL DEFAULT '20:00',
  quiet_start TEXT NOT NULL DEFAULT '22:00',
  quiet_end TEXT NOT NULL DEFAULT '08:30',
  daily_enabled INTEGER NOT NULL DEFAULT 1 CHECK (daily_enabled IN (0, 1)),
  social_enabled INTEGER NOT NULL DEFAULT 1 CHECK (social_enabled IN (0, 1)),
  last_sent_date TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS notification_preferences_daily_idx
  ON notification_preferences(daily_enabled, last_sent_date);

-- Backfill existing Web Push subscription preferences into notification_preferences
INSERT OR IGNORE INTO notification_preferences (
  user_id, timezone, reminder_time, quiet_start, quiet_end, daily_enabled, social_enabled, last_sent_date, updated_at
)
SELECT
  ps.user_id, ps.timezone, ps.reminder_time, ps.quiet_start, ps.quiet_end,
  ps.daily_enabled, ps.social_enabled, ps.last_sent_date, ps.updated_at
FROM push_subscriptions ps
ORDER BY ps.updated_at DESC;
