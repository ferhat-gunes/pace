import { normalizeHabitForm } from '../lib/habit-form.js';
import { dateKey, settingsAt } from '../lib/rules.js';

export function initialHabitValues(habit = null, initialDate = dateKey()) {
  if(habit) habit = settingsAt(habit, dateKey());
  return {
    name: habit?.name || '', tracking: habit?.tracking || 'check',
    direction: habit?.direction || 'at_least', target: String(habit?.target ?? 1),
    unit: habit?.unit || 'dakika', scheduleType: habit?.schedule?.type || 'daily',
    days: [...(habit?.schedule?.days || [1, 2, 3, 4, 5])],
    quota: String(habit?.schedule?.times_per_week ?? 3),
    progressionEnabled: Boolean(habit?.progression?.enabled),
    step: String(habit?.progression?.step || 1), cap: habit?.progression?.cap ?? '',
    debtEnabled: Boolean(habit?.debt?.enabled), debtCap: habit?.debt?.cap ?? '',
    date: habit ? dateKey() : initialDate,
  };
}

export function buildHabitPayload(values, habit = null) {
  // Turkish decimal notation is accepted without rounding the user's quantity.
  const decimal = value => typeof value === 'string' ? value.trim().replace(',', '.') : value;
  const payload = normalizeHabitForm({ ...values, target: decimal(values.target), step: decimal(values.step), cap: decimal(values.cap), debtCap: decimal(values.debtCap) });
  if (payload.schedule.type === 'weekly_quota' && payload.debt.enabled && payload.debt.cap !== null && !Number.isInteger(payload.debt.cap)) {
    const error = new Error('Taşınacak gün sınırı 0 veya daha büyük bir tam sayı olmalı.');
    error.field = 'debt-cap';
    throw error;
  }
  const date = String(values.date || '');
  const parsed = new Date(date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date || (habit?.start_date && date < habit.start_date)) {
    const error = new Error(habit ? 'Geçerlilik tarihi alışkanlığın başlangıcından önce olamaz. Geçerli bir tarih seç.' : 'Alışkanlığın başlayacağı geçerli bir tarih seç.');
    error.field = 'habit-date';
    throw error;
  }
  return { ...payload, [habit ? 'effective_from' : 'start_date']: date };
}
