import test from 'node:test';
import assert from 'node:assert/strict';
import { habitStatistics, habitStreak, dailyCompletion } from '../src/lib/statistics.js';
import { addDays, amountFor, formatNumber, formatTarget, goalFor, latestCheckins, recordFor, stateFor, weekStart } from '../src/lib/rules.js';
import { parseEntryAmount } from '../src/lib/numeric-entry.js';
import { resolveRolloverSelection } from '../src/lib/local-date.js';

const base = { id: 'h', name: 'Oku', start_date: '2025-01-01', tracking: 'quantity', target: 0.25, unit: 'km', direction: 'at_least', schedule: { type: 'daily' }, progression: { enabled: false }, debt: { enabled: false } };
const log = (day, value, extra = {}) => ({ habit_id: 'h', habit_date: day, value, revision: 1, ...extra });

test('localized amount entry never silently writes blank, malformed or out-of-range input', () => {
  for (const value of ['', ' ', 'NaN', 'nope', '-1', '1000000.1', '1,2,3', '1e6']) assert.throws(() => parseEntryAmount(value));
  assert.equal(parseEntryAmount('0'), 0);
  assert.equal(parseEntryAmount('0,25'), 0.25);
  assert.equal(parseEntryAmount('1.125'), 1.125);
  assert.equal(parseEntryAmount('1000000'), 1000000);
});

test('display does not round valid targets to a different amount', () => {
  assert.equal(formatNumber(0.25), '0,25');
  assert.equal(formatNumber(0.01), '0,01');
  assert.equal(formatNumber(1.125), '1,125');
});

test('latest tombstones suppress old live records for totals, rules and streaks', () => {
  const rows = [log('2026-01-01', 1), log('2026-01-01', 0, { revision: 2, deleted: 1 })];
  assert.equal(latestCheckins(rows).length, 1);
  assert.equal(recordFor(base, '2026-01-01', rows), null);
  assert.equal(amountFor(base, '2026-01-01', rows), 0);
  assert.equal(dailyCompletion(base, '2026-01-01', rows), false);
  assert.equal(habitStatistics(base, rows, { end: '2026-01-01' }).recordedDays, 0);
  assert.equal(habitStreak(base, rows, { today: '2026-01-01' }).count, 0);
});

test('daily series exceeds 365 days without an arbitrary cap', () => {
  const today = '2026-02-04', start_date = addDays(today, -399);
  const rows = Array.from({ length: 400 }, (_, i) => log(addDays(start_date, i), 0.25));
  const result = habitStreak({ ...base, start_date }, rows, { today });
  assert.equal(result.count, 400);
  assert.equal(result.unit, 'planlı gün');
});

test('unplanned days do not interrupt a planned-day streak', () => {
  const habit = { ...base, start_date: '2026-01-05', tracking: 'check', target: 1, schedule: { type: 'weekdays', days: [1, 3, 5] } };
  const rows = ['2026-01-05', '2026-01-07', '2026-01-09'].map(day => log(day, 1));
  assert.equal(habitStreak(habit, rows, { today: '2026-01-11' }).count, 3);
  assert.equal(habitStreak(habit, rows, { today: '2026-01-13' }).count, 0);
});

test('weekly series counts completed weeks and leaves the incomplete open week open', () => {
  const habit = { ...base, start_date: '2026-01-05', tracking: 'check', target: 1, schedule: { type: 'weekly_quota', times_per_week: 2 } };
  const rows = ['2026-01-05', '2026-01-07', '2026-01-12', '2026-01-13'].map(day => log(day, 1));
  const result = habitStreak(habit, rows, { today: '2026-01-19', weekStart: 1 });
  assert.equal(result.count, 2);
  assert.equal(result.unit, 'hafta');
  assert.equal(habitStreak(habit, rows, { today: '2026-01-26', weekStart: 1 }).count, 0);
});

test('Sunday week preference changes quota boundaries consistently', () => {
  const habit = { ...base, start_date: '2026-01-04', tracking: 'check', target: 1, schedule: { type: 'weekly_quota', times_per_week: 2 } };
  const rows = ['2026-01-04', '2026-01-05'].map(day => log(day, 1));
  assert.equal(weekStart('2026-01-05', 0), '2026-01-04');
  assert.equal(stateFor(habit, '2026-01-05', rows, 0).actual, 2);
  assert.equal(stateFor(habit, '2026-01-05', rows, 1).actual, 1);
});

test('weekly completion and selected-day recording are distinct states', () => {
  const habit = { ...base, start_date: '2026-01-05', tracking: 'check', target: 1, schedule: { type: 'weekly_quota', times_per_week: 2 } };
  const rows = ['2026-01-05', '2026-01-06'].map(day => log(day, 1));
  assert.equal(stateFor(habit, '2026-01-07', rows, 1).status, 'done');
  assert.equal(dailyCompletion(habit, '2026-01-07', rows, 1), false);
});

test('at-most explicit zero is recorded completion; absent record is not', () => {
  const habit = { ...base, direction: 'at_most' };
  assert.equal(dailyCompletion(habit, '2026-01-05', []), false);
  assert.equal(dailyCompletion(habit, '2026-01-05', [log('2026-01-05', 0)]), true);
});

test('historical quantity units remain separate and reports exclude future rows', () => {
  const habit = { ...base, versions: [{ effective_from: '2025-01-01', settings: { unit: 'km' } }, { effective_from: '2026-01-03', settings: { unit: 'dakika' } }] };
  const result = habitStatistics(habit, [log('2026-01-02', 0.25), log('2026-01-03', 20), log('2026-01-09', 1000)], { end: '2026-01-05' });
  assert.deepEqual(result.groups.map(g => [g.unit, g.total, g.average, g.best]), [['km', 0.25, 0.25, 0.25], ['dk', 20, 20, 20]]);
  assert.equal(result.lastDate, '2026-01-03');
});

test('local calendar rollover follows today but preserves deliberate past selection', () => {
  assert.equal(resolveRolloverSelection('2026-01-01', '2026-01-01', '2026-01-02'), '2026-01-02');
  assert.equal(resolveRolloverSelection('2025-12-30', '2026-01-01', '2026-01-02'), '2025-12-30');
});

 test('effective quantity targets never exceed API quantity limit', () => {
  const progressive = { ...base, target: 900000, progression: { enabled: true, step: 900000, cap: null } };
  assert.equal(goalFor(progressive, '2025-01-02', []), 1000000);
  const debt = { ...base, target: 900000, debt: { enabled: true, cap: null } };
  assert.equal(goalFor(debt, '2025-01-02', []), 1000000);
});

test('rule captions describe selected weekdays rather than pretending a daily plan', () => {
  assert.match(formatTarget({ ...base, schedule: { type: 'weekdays', days: [1, 3] } }), /Pzt, Çar/);
  assert.match(formatTarget({ ...base, tracking: 'check', schedule: { type: 'weekly_quota', times_per_week: 2 } }), /Haftada 2 gün: yaptım/);
});
