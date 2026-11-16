import { dateKey, weekDays } from './rules.js';

export const dayLabel = key => new Intl.DateTimeFormat('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(key + 'T12:00:00'));
export function latestGroupLog(checkins, habitId, userId, day) {
  return checkins.filter(c => (c.group_habit_id || c.habit_id) === habitId && c.user_id === userId && c.habit_date === day)
    .sort((a, b) => Number(b.revision || 0) - Number(a.revision || 0))[0] || null;
}
export function groupDayState(habit, log, day, today = dateKey()) {
  if (day > today) return 'Henüz gelmedi';
  if (!log || log.deleted) return day === today ? 'Bekliyor' : 'Kayıt yok';
  const value = Number(log.value), target = Number(habit.target || 1);
  return (habit.direction === 'at_most' ? value <= target : value >= target) ? 'Tamamlandı' : 'Hedefe ulaşılmadı';
}
export function groupWeekSummary(habit, checkins, userId, anchor, firstDay = 1, today = dateKey()) {
  const days = weekDays(anchor, firstDay);
  const elapsed = days.filter(day => day <= today);
  const completed = elapsed.filter(day => groupDayState(habit, latestGroupLog(checkins, habit.id, userId, day), day, today) === 'Tamamlandı').length;
  return { days, elapsed: elapsed.length, completed, percentage: elapsed.length ? Math.round(completed / elapsed.length * 100) : 0 };
}
export function groupSettings(draft) {
  const name = String(draft.name || '').trim();
  const description = String(draft.description || '').trim();
  if (!name || name.length > 60) throw new Error('Grup adı 1–60 karakter olmalı.');
  if (description.length > 280) throw new Error('Açıklama en fazla 280 karakter olmalı.');
  return { name, description };
}
export function requireGroupDetail(result, id) {
  const valid = result?.group?.id === id && Array.isArray(result.members) && Array.isArray(result.habits) && Array.isArray(result.checkins)
    && result.members.every(m => typeof m.user_id === 'string' && ['owner', 'member'].includes(m.role))
    && result.habits.every(h => typeof h.id === 'string' && typeof h.name === 'string' && ['check', 'quantity'].includes(h.tracking) && Number.isFinite(Number(h.target)) && Number(h.target) > 0 && Number(h.target) <= 1000000)
    && result.checkins.every(c => typeof (c.group_habit_id || c.habit_id) === 'string' && typeof c.user_id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.habit_date) && Number.isFinite(Number(c.value)) && Number(c.value) >= 0 && Number(c.value) <= 1000000 && Number.isInteger(Number(c.revision)) && Number(c.revision) >= 0);
  if (!valid) throw new Error('Grup bilgileri doğrulanamadı. Lütfen yeniden dene.');
  return result;
}
export function requireGroupSuccess(result) {
  if (result?.ok !== true) throw new Error('Sunucu işlemi doğrulamadı. Lütfen yeniden dene.');
  return result;
}
export function groupHabitSettings(draft) {
  const name = String(draft.name || '').trim();
  if (!name || name.length > 60) throw new Error('Alışkanlık adı 1–60 karakter olmalı.');
  const tracking = draft.tracking === 'quantity' ? 'quantity' : 'check';
  const target = tracking === 'quantity' ? Number(draft.target) : 1;
  if (typeof draft.target === 'boolean' || !Number.isFinite(target) || target <= 0 || target > 1000000) throw new Error('Hedef sıfırdan büyük ve en fazla 1.000.000 olmalı.');
  const unit = tracking === 'quantity' ? String(draft.unit || '').trim() : '';
  if (unit.length > 20) throw new Error('Birim en fazla 20 karakter olmalı.');
  return { name, tracking, target, direction: draft.direction === 'at_most' && tracking === 'quantity' ? 'at_most' : 'at_least', unit };
}
export function groupWriteBody(value, revision, key) {
  const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  const n = Number(normalized);
  if (normalized === '' || value === null || typeof value === 'boolean' || !Number.isFinite(n) || n < 0 || n > 1000000) throw new Error('Kayıt 0 ile 1.000.000 arasında olmalı.');
  if (!Number.isInteger(Number(revision || 0)) || Number(revision || 0) < 0) throw new Error('Kayıt sürümü doğrulanamadı. Grubu yenile.');
  if (typeof key !== 'string' || !key || key.length > 80) throw new Error('Kayıt kimliği eksik.');
  return { value: n, expected_revision: Number(revision || 0), idempotency_key: key };
}
