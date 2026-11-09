-- Migration: 0004_groups_and_social.sql
-- PACE Sosyal Alışkanlık Grupları ve İzolasyon Şeması

PRAGMA foreign_keys = ON;

-- 1. Gruplar Tablosu
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(name) <= 60),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 280),
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS groups_owner_idx ON groups(owner_id);
CREATE INDEX IF NOT EXISTS groups_created_at_idx ON groups(created_at DESC);

-- 2. Grup Üyeleri Tablosu
CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TEXT NOT NULL,
  UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS group_members_group_role_idx ON group_members(group_id, role);

-- 3. Grup Davetleri Tablosu
CREATE TABLE IF NOT EXISTS group_invites (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('link', 'username', 'email')),
  recipient TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS group_invites_token_idx ON group_invites(token);
CREATE INDEX IF NOT EXISTS group_invites_group_status_idx ON group_invites(group_id, status);
CREATE INDEX IF NOT EXISTS group_invites_recipient_idx ON group_invites(recipient, status);

-- 4. Grup Alışkanlıkları Tablosu
CREATE TABLE IF NOT EXISTS group_habits (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(name) <= 60),
  tracking TEXT NOT NULL CHECK (tracking IN ('check', 'quantity')),
  direction TEXT NOT NULL DEFAULT 'at_least' CHECK (direction IN ('at_least', 'at_most')),
  unit TEXT NOT NULL DEFAULT '' CHECK (length(unit) <= 20),
  target REAL NOT NULL DEFAULT 1 CHECK (target > 0 AND target <= 1000000),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS group_habits_group_active_idx ON group_habits(group_id, archived_at, created_at);

-- 5. Grup Check-in (Kayıt) Tablosu (Tam Veri İzolasyonu)
CREATE TABLE IF NOT EXISTS group_checkins (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  group_habit_id TEXT NOT NULL REFERENCES group_habits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_date TEXT NOT NULL CHECK (habit_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  value REAL NOT NULL CHECK (value >= 0 AND value <= 1000000),
  revision INTEGER NOT NULL DEFAULT 1,
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 280),
  idempotency_key TEXT NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(group_habit_id, user_id, habit_date),
  UNIQUE(user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS group_checkins_group_date_idx ON group_checkins(group_id, habit_date);
CREATE INDEX IF NOT EXISTS group_checkins_habit_date_idx ON group_checkins(group_habit_id, habit_date);
CREATE INDEX IF NOT EXISTS group_checkins_user_date_idx ON group_checkins(user_id, habit_date);
