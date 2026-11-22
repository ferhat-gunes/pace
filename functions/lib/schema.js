// Self-healing D1 schema bootstrap for migrations 0004–0006.
// Ensures group, social reaction, gamification, and Web Push tables exist even when
// Cloudflare Pages deploys before manual D1 migrations have been applied.

const EXTENDED_SCHEMA_STATEMENTS = [
  // 0004_groups_and_social.sql
  `CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) >= 1 AND length(name) <= 60),
    description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 280),
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS groups_owner_idx ON groups(owner_id)`,
  `CREATE INDEX IF NOT EXISTS groups_created_at_idx ON groups(created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TEXT NOT NULL,
    UNIQUE(group_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members(user_id, joined_at DESC)`,
  `CREATE INDEX IF NOT EXISTS group_members_group_role_idx ON group_members(group_id, role)`,
  `CREATE TABLE IF NOT EXISTS group_invites (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    invite_type TEXT NOT NULL CHECK (invite_type IN ('link', 'username', 'email')),
    recipient TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS group_invites_token_idx ON group_invites(token)`,
  `CREATE INDEX IF NOT EXISTS group_invites_group_status_idx ON group_invites(group_id, status)`,
  `CREATE INDEX IF NOT EXISTS group_invites_recipient_idx ON group_invites(recipient, status)`,
  `CREATE TABLE IF NOT EXISTS group_habits (
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
  )`,
  `CREATE INDEX IF NOT EXISTS group_habits_group_active_idx ON group_habits(group_id, archived_at, created_at)`,
  `CREATE TABLE IF NOT EXISTS group_checkins (
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
  )`,
  `CREATE INDEX IF NOT EXISTS group_checkins_group_date_idx ON group_checkins(group_id, habit_date)`,
  `CREATE INDEX IF NOT EXISTS group_checkins_habit_date_idx ON group_checkins(group_habit_id, habit_date)`,
  `CREATE INDEX IF NOT EXISTS group_checkins_user_date_idx ON group_checkins(user_id, habit_date)`,
  // 0005_social_reactions_and_gamification.sql
  `CREATE TABLE IF NOT EXISTS group_reactions (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_date TEXT NOT NULL CHECK (habit_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('cheer', 'nudge')),
    emoji TEXT NOT NULL DEFAULT '👏',
    message TEXT NOT NULL DEFAULT '' CHECK (length(message) <= 160),
    read_at TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS group_reactions_target_unread_idx ON group_reactions(target_user_id, read_at, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS group_reactions_group_date_idx ON group_reactions(group_id, habit_date, target_user_id)`,
  `CREATE TABLE IF NOT EXISTS user_gamification (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    gems INTEGER NOT NULL DEFAULT 10 CHECK (gems >= 0),
    streak_freezes INTEGER NOT NULL DEFAULT 1 CHECK (streak_freezes >= 0),
    used_freeze_dates_json TEXT NOT NULL DEFAULT '{}',
    claimed_dates_json TEXT NOT NULL DEFAULT '{}',
    all_done_bonus_dates_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  )`,
  // 0006_web_push.sql
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
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
  )`,
  `CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id)`,
  `CREATE INDEX IF NOT EXISTS push_subscriptions_daily_idx ON push_subscriptions(daily_enabled, last_sent_date)`,
  // 0007_unified_habits_and_usernames.sql
  `CREATE TABLE IF NOT EXISTS habit_participants (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    joined_at TEXT NOT NULL,
    UNIQUE(habit_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS habit_participants_user_idx ON habit_participants(user_id, joined_at DESC)`,
  `CREATE INDEX IF NOT EXISTS habit_participants_habit_role_idx ON habit_participants(habit_id, role)`,
  `CREATE TABLE IF NOT EXISTS habit_invites (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    invite_type TEXT NOT NULL CHECK (invite_type IN ('link', 'username')),
    target_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS habit_invites_token_idx ON habit_invites(token)`,
  `CREATE INDEX IF NOT EXISTS habit_invites_habit_status_idx ON habit_invites(habit_id, status)`,
  `CREATE INDEX IF NOT EXISTS habit_invites_target_status_idx ON habit_invites(target_user_id, status)`,
];

const ensuredDbs = new WeakMap();

export async function ensureExtendedSchema(db) {
  if (!db || typeof db.batch !== 'function' || typeof db.prepare !== 'function') return false;
  let pending = ensuredDbs.get(db);
  if (!pending) {
    pending = Promise.resolve()
      .then(async () => {
        await db.batch(
          EXTENDED_SCHEMA_STATEMENTS.map(sql => {
            const stmt = db.prepare(sql);
            return typeof stmt.run === 'function' ? stmt : stmt.bind();
          })
        );
        try {
          await db.prepare('ALTER TABLE users ADD COLUMN username TEXT').run();
        } catch {
          // Column already exists; ignore duplicate column error
        }
        try {
          await db
            .prepare(
              'CREATE UNIQUE INDEX IF NOT EXISTS users_username_nocase_idx ON users(username COLLATE NOCASE) WHERE username IS NOT NULL'
            )
            .run();
        } catch {
          // Ignore if index creation is unsupported on mock DB
        }
        return true;
      })
      .catch(err => {
        ensuredDbs.delete(db);
        throw err;
      });
    ensuredDbs.set(db, pending);
  }
  return pending;
}

