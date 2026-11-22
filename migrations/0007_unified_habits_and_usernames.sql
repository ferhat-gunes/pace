-- 0007_unified_habits_and_usernames.sql
-- Adds @username identity on users, unified habit_participants and habit_invites tables,
-- and idempotently migrates existing habits and legacy group_habits/group_members/group_checkins.

ALTER TABLE users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_nocase_idx
  ON users(username COLLATE NOCASE)
  WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS habit_participants (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TEXT NOT NULL,
  UNIQUE(habit_id, user_id)
);
CREATE INDEX IF NOT EXISTS habit_participants_user_idx
  ON habit_participants(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS habit_participants_habit_role_idx
  ON habit_participants(habit_id, role);

CREATE TABLE IF NOT EXISTS habit_invites (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('link', 'username')),
  target_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS habit_invites_token_idx
  ON habit_invites(token);
CREATE INDEX IF NOT EXISTS habit_invites_habit_status_idx
  ON habit_invites(habit_id, status);
CREATE INDEX IF NOT EXISTS habit_invites_target_status_idx
  ON habit_invites(target_user_id, status);

-- 1. Backfill existing personal habits into habit_participants as owner
INSERT OR IGNORE INTO habit_participants (id, habit_id, user_id, role, joined_at)
SELECT 'hp_' || h.id || '_' || h.user_id, h.id, h.user_id, 'owner', h.created_at
FROM habits h;

-- 2. Migrate legacy group_habits into unified habits
INSERT OR IGNORE INTO habits (
  id, user_id, name, tracking, direction, unit, target,
  schedule_type, schedule_days, start_date, paused, archived_at, created_at, updated_at
)
SELECT
  gh.id, g.owner_id, gh.name, gh.tracking, gh.direction, gh.unit, gh.target,
  'daily', '[]', substr(gh.created_at, 1, 10), 0, gh.archived_at, gh.created_at, gh.updated_at
FROM group_habits gh
JOIN groups g ON g.id = gh.group_id;

-- 3. Create initial habit_versions for migrated group_habits
INSERT OR IGNORE INTO habit_versions (id, habit_id, user_id, effective_from, settings_json, created_at)
SELECT
  'hv_' || gh.id,
  gh.id,
  g.owner_id,
  substr(gh.created_at, 1, 10),
  json_object(
    'name', gh.name,
    'tracking', gh.tracking,
    'direction', gh.direction,
    'unit', gh.unit,
    'target', gh.target,
    'schedule', json_object('type', 'daily', 'days', json('[]'), 'times_per_week', NULL),
    'progression', json_object('enabled', json('false'), 'step', 0, 'cap', NULL),
    'debt', json_object('enabled', json('false'), 'cap', NULL),
    'paused', json('false'),
    'archived_at', gh.archived_at
  ),
  gh.created_at
FROM group_habits gh
JOIN groups g ON g.id = gh.group_id;

-- 4. Migrate legacy group_members into habit_participants for each migrated group_habit
INSERT OR IGNORE INTO habit_participants (id, habit_id, user_id, role, joined_at)
SELECT 'hp_' || gh.id || '_' || gm.user_id, gh.id, gm.user_id, gm.role, gm.joined_at
FROM group_habits gh
JOIN group_members gm ON gm.group_id = gh.group_id;

-- 5. Migrate legacy group_checkins into checkins (prefix idempotency_key with 'gm_' to avoid collisions)
INSERT OR IGNORE INTO checkins (
  id, user_id, habit_id, habit_date, value, revision, note, idempotency_key, deleted, created_at, updated_at
)
SELECT
  gc.id, gc.user_id, gc.group_habit_id, gc.habit_date, gc.value, gc.revision, gc.note,
  'gm_' || gc.idempotency_key, gc.deleted, gc.created_at, gc.updated_at
FROM group_checkins gc;
