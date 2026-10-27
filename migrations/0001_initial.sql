PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  week_start INTEGER NOT NULL DEFAULT 1 CHECK (week_start IN (0,1)),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  request_key TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS login_codes_email_created ON login_codes(email, created_at DESC);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tracking TEXT NOT NULL CHECK (tracking IN ('check','quantity')),
  direction TEXT NOT NULL CHECK (direction IN ('at_least','at_most')),
  unit TEXT NOT NULL DEFAULT '',
  target REAL NOT NULL DEFAULT 1 CHECK (target > 0),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily','weekdays','weekly_quota')),
  schedule_days TEXT NOT NULL DEFAULT '[]',
  times_per_week INTEGER,
  progression_enabled INTEGER NOT NULL DEFAULT 0,
  progression_step REAL NOT NULL DEFAULT 0,
  progression_cap REAL,
  debt_enabled INTEGER NOT NULL DEFAULT 0,
  debt_cap REAL,
  start_date TEXT NOT NULL,
  paused INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS habits_user_active ON habits(user_id, archived_at, created_at);
CREATE TABLE IF NOT EXISTS habit_versions (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  effective_from TEXT NOT NULL,
  settings_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(habit_id, effective_from)
);
CREATE INDEX IF NOT EXISTS habit_versions_lookup ON habit_versions(habit_id, effective_from DESC);
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  habit_date TEXT NOT NULL,
  value REAL NOT NULL CHECK (value >= 0),
  revision INTEGER NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, habit_id, habit_date),
  UNIQUE(user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS checkins_user_date ON checkins(user_id, habit_date);
CREATE INDEX IF NOT EXISTS checkins_habit_date ON checkins(habit_id, habit_date);
