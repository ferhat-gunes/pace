import { normalizeHabitForm } from './habit-form.js';

export const BACKUP_LIMITS = Object.freeze({ bytes: 2 * 1024 * 1024, habits: 500, checkins: 10000, versions: 10000 });
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function validBackupDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00Z');
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
const timestamp = value => value == null || typeof value === 'string' && Number.isFinite(Date.parse(value));
function normalizeSettings(raw) {
  if (!object(raw) || !['check', 'quantity'].includes(raw.tracking) || !['daily', 'weekdays', 'weekly_quota'].includes(raw.schedule?.type)) throw new Error('Alışkanlık kuralları geçersiz.');
  const normalized = normalizeHabitForm({ ...raw, scheduleType: raw.schedule.type, days: raw.schedule.days, quota: raw.schedule.times_per_week, progressionEnabled: raw.progression?.enabled, step: raw.progression?.step, cap: raw.progression?.cap, debtEnabled: raw.debt?.enabled, debtCap: raw.debt?.cap });
  if (!timestamp(raw.archived_at)) throw new Error('Arşiv tarihi geçersiz.');
  return { ...normalized, paused: Boolean(raw.paused), archived_at: raw.archived_at ?? null };
}

/** Validate the entire file before any account mutation; unknown auth fields are discarded. */
export function validateBackup(input) {
  if (!object(input) || !Array.isArray(input.habits) || (input.checkins !== undefined && !Array.isArray(input.checkins))) throw new Error('Yedekte habits ve checkins listeleri bulunmalı.');
  if (input.habits.length > BACKUP_LIMITS.habits || (input.checkins?.length || 0) > BACKUP_LIMITS.checkins) throw new Error(`Yedek en fazla ${BACKUP_LIMITS.habits} alışkanlık ve ${BACKUP_LIMITS.checkins} kayıt içerebilir.`);
  if (input.week_start !== undefined && ![0, 1].includes(input.week_start)) throw new Error('Haftanın ilk günü geçersiz.');
  const ids = new Set();
  let versionCount = 0;
  const habits = input.habits.map((h, index) => {
    try {
      if (!object(h) || !validBackupDate(h.start_date)) throw new Error('Başlangıç tarihi geçersiz.');
      const id = typeof h.id === 'string' && h.id.length <= 100 && h.id ? h.id : null;
      if (h.id != null && !id) throw new Error('Alışkanlık kimliği geçersiz.');
      if (id && ids.has(id)) throw new Error('Tekrarlanan alışkanlık kimliği.');
      if (id) ids.add(id);
      const settings = normalizeSettings(h);
      if (h.versions !== undefined && !Array.isArray(h.versions)) throw new Error('Geçmiş kurallar listesi geçersiz.');
      const dates = new Set();
      const versions = (h.versions || []).map(v => {
        if (!object(v) || !validBackupDate(v.effective_from) || v.effective_from < h.start_date || dates.has(v.effective_from)) throw new Error('Geçmiş kural tarihi geçersiz veya tekrarlanmış.');
        dates.add(v.effective_from);
        return { effective_from: v.effective_from, settings: normalizeSettings({ ...h, ...v.settings }) };
      }).sort((a, b) => a.effective_from.localeCompare(b.effective_from));
      versionCount += versions.length;
      return { id, ...settings, start_date: h.start_date, created_at: timestamp(h.created_at) ? h.created_at : null, versions };
    } catch (err) { throw new Error(`${index + 1}. alışkanlık: ${err.message}`); }
  });
  if (versionCount > BACKUP_LIMITS.versions) throw new Error('Yedekte çok fazla geçmiş kural var.');
  const records = new Set();
  const checkins = (input.checkins || []).map((c, index) => {
    if (!object(c) || !ids.has(c.habit_id) || !validBackupDate(c.habit_date) || typeof c.value !== 'number' || !Number.isFinite(c.value) || c.value < 0 || c.value > 1000000 || ![undefined, false, true, 0, 1].includes(c.deleted)) throw new Error(`${index + 1}. kayıt geçersiz veya yedekte bulunmayan bir alışkanlığa ait.`);
    const key = JSON.stringify([c.habit_id, c.habit_date]);
    if (records.has(key)) throw new Error(`${index + 1}. kayıt aynı gün için tekrarlanmış.`);
    records.add(key);
    return { habit_id: c.habit_id, habit_date: c.habit_date, value: c.value, deleted: Boolean(c.deleted), note: String(c.note || '').slice(0, 280) };
  });
  return { format: 'pace-personal-backup', version: 2, week_start: input.week_start, habits, checkins };
}

export function backupPreview(input, currentHabits = []) {
  const data = validateBackup(input);
  const existing = new Set(currentHabits.map(h => h.id));
  return { data, habits: data.habits.length, records: data.checkins.length, versions: data.habits.reduce((n, h) => n + h.versions.length, 0), matchingHabits: data.habits.filter(h => existing.has(h.id)).length };
}

export function buildPersonalBackup({ user, habits, checkins, weekStart, pendingCount = 0 }) {
  const data = validateBackup({ week_start: weekStart, habits, checkins });
  return { ...data, exported_at: new Date().toISOString(), user: user ? { id: user.id, email: user.email } : null, scope: 'personal-habits-and-checkins; groups-excluded', pending_entries: pendingCount };
}
