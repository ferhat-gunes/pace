-- Migration: 0005_social_reactions_and_gamification.sql
-- Gerçek D1 senkronlu grup tepkileri (alkış / nazik yoklama) ve cihazlar arası oyunlaştırma durumu

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS group_reactions (
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
);
CREATE INDEX IF NOT EXISTS group_reactions_target_unread_idx ON group_reactions(target_user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS group_reactions_group_date_idx ON group_reactions(group_id, habit_date, target_user_id);

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  gems INTEGER NOT NULL DEFAULT 10 CHECK (gems >= 0),
  streak_freezes INTEGER NOT NULL DEFAULT 1 CHECK (streak_freezes >= 0),
  used_freeze_dates_json TEXT NOT NULL DEFAULT '{}',
  claimed_dates_json TEXT NOT NULL DEFAULT '{}',
  all_done_bonus_dates_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
