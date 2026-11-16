import { settingsAt, goalFor, latestCheckins, recordFor, dateKey, addDays, weekStart as startOfWeek, weekDays, isPlannedOn, stateFor } from './rules.js';

const unitKey = unit => {
  const value = String(unit || '').trim();
  return ['dk','dakika','min','minute','minutes'].includes(value.toLocaleLowerCase('tr-TR').replaceAll('.', '')) ? 'dk' : value || 'birim';
};

/** Average uses recorded dates, including explicit zero; historical units never mix. */
export function habitStatistics(habit, checkins, { start = '', end = dateKey(), weekStart = 1 } = {}) {
  const history = latestCheckins(checkins).filter(r => r.habit_id === habit.id);
  const rows = history.filter(r => !r.deleted && r.habit_date >= (habit.start_date || '') && r.habit_date >= start && r.habit_date <= end && Number.isFinite(Number(r.value)) && Number(r.value) >= 0).sort((a,b) => a.habit_date.localeCompare(b.habit_date));
  const groups = new Map();
  let checkDays = 0, completedDays = 0;
  for (const row of rows) {
    const h = settingsAt(habit, row.habit_date), value = Number(row.value);
    if (h.tracking === 'check') { if (value >= 1) { checkDays++; completedDays++; } continue; }
    const unit = unitKey(h.unit), group = groups.get(unit) || { unit, total: 0, days: 0, best: 0 };
    group.total += value; group.days++; group.best = Math.max(group.best, value); groups.set(unit, group);
    const goal = goalFor(habit, row.habit_date, history, weekStart);
    if (h.direction === 'at_most' ? value <= goal : value >= goal) completedDays++;
  }
  return { groups: [...groups.values()].map(g => ({ ...g, average: g.total / g.days })), recordedDays: rows.length, completedDays, checkDays, lastDate: rows.at(-1)?.habit_date || null, dates: rows.map(r => r.habit_date) };
}

export function dailyCompletion(habit, day, checkins, weekStart = 1) {
  const record = recordFor(habit, day, checkins);
  if (!record) return false;
  const h = settingsAt(habit, day), value = Number(record.value);
  if (h.tracking === 'check') return value >= 1;
  const goal = goalFor(habit, day, checkins, weekStart);
  return h.direction === 'at_most' ? value <= goal : value >= goal;
}

/** A missing current period stays open; missed closed periods break the streak. */
export function habitStreak(habit, checkins, { today = dateKey(), weekStart = 1 } = {}) {
  const history = latestCheckins(latestCheckins(checkins).filter(r => r.habit_id === habit.id && r.habit_date <= today));
  const live = history.filter(r => !r.deleted);
  const settings = settingsAt(habit, today);
  const weekly = settings.schedule?.type === 'weekly_quota';
  const unit = weekly ? 'hafta' : 'planlı gün';
  if (!live.length || settings.archived_at) return { count: 0, unit, archived: Boolean(settings.archived_at) };
  const first = habit.start_date || live.map(r => r.habit_date).sort()[0];
  let count = 0;
  if (weekly) {
    const openWeek = startOfWeek(today, weekStart);
    for (let week = openWeek; week >= startOfWeek(first, weekStart); week = addDays(week, -7)) {
      const end = addDays(week, 6), key = end > today ? today : end;
      if (settingsAt(habit, key).schedule?.type !== 'weekly_quota') break;
      const eligible = weekDays(week, weekStart).some(day => day >= first && day <= today && isPlannedOn(habit, day, history, weekStart));
      if (!eligible) continue;
      if (stateFor(habit, key, history, weekStart).status === 'done') count++;
      else if (week !== openWeek) break;
    }
  } else {
    for (let day = today; day >= first; day = addDays(day, -1)) {
      if (!isPlannedOn(habit, day, history, weekStart)) continue;
      if (settingsAt(habit, day).schedule?.type === 'weekly_quota') break;
      if (dailyCompletion(habit, day, history, weekStart)) count++;
      else if (day !== today) break;
    }
  }
  return { count, unit, archived: false };
}
