import test from 'node:test';
import assert from 'node:assert/strict';
import { initialHabitValues, buildHabitPayload } from '../src/components/habit-form-model.js';
import { describeHabitRules } from '../src/lib/habit-form.js';

const values = overrides => ({ ...initialHabitValues(null, '2026-11-16'), name: 'Yürüyüş', ...overrides });
test('new editor accepts a Turkish decimal without rounding and exposes start date', () => {
  const payload = buildHabitPayload(values({ tracking: 'quantity', target: '0,25', unit: 'km' }));
  assert.equal(payload.target, 0.25); assert.equal(payload.start_date, '2026-11-16');
  assert.match(describeHabitRules(payload), /0,25 km/);
});
test('editing retains rules and uses effective date without changing start date', () => {
  const habit = { id: 'h', name: 'Su', start_date: '2026-01-01', tracking: 'quantity', target: 0.5, unit: 'litre', direction: 'at_least', schedule: { type: 'weekdays', days: [1, 3, 5] }, progression: { enabled: true, step: 0.25, cap: 2 }, debt: { enabled: true, cap: 1 } };
  const form = initialHabitValues(habit);
  assert.deepEqual(form.days, [1, 3, 5]);
  const payload = buildHabitPayload({ ...form, date: '2026-11-16' }, habit);
  assert.equal(payload.effective_from, '2026-11-16'); assert.equal(payload.start_date, undefined);
  assert.equal(payload.progression.step, 0.25); assert.equal(payload.target, 0.5);
});
test('weekly check quota may carry missed days despite stale quantity-only direction', () => {
  const payload = buildHabitPayload(values({ tracking: 'check', direction: 'at_most', scheduleType: 'weekly_quota', quota: '2', debtEnabled: true, debtCap: '1' }));
  assert.equal(payload.direction, 'at_least'); assert.equal(payload.debt.enabled, true);
  assert.equal(payload.schedule.times_per_week, 2); assert.match(describeHabitRules(payload), /Haftada 2 gün/);
});
test('invalid program selection focuses the appropriate named field', () => {
  for (const [overrides, field] of [[{ name: '  ' }, 'habit-name'], [{ tracking: 'quantity', target: '' }, 'habit-target'], [{ tracking: 'quantity', target: '0' }, 'habit-target'], [{ scheduleType: 'weekdays', days: [] }, 'weekday-picker'], [{ scheduleType: 'weekly_quota', quota: '8' }, 'habit-quota'], [{ date: '2026-02-30' }, 'habit-date']]) {
    assert.throws(() => buildHabitPayload(values(overrides)), err => err.field === field);
  }
});
test('editing cannot change rules before the habit existed', () => {
  const habit = { id: 'h', start_date: '2026-05-01' };
  assert.throws(() => buildHabitPayload(values({ date: '2026-04-30' }), habit), err => err.field === 'habit-date');
});
test('switching to check removes inactive numeric rules and minimum-target carryover', () => {
  const payload = buildHabitPayload(values({ tracking: 'check', target: 'bad', progressionEnabled: true, step: 'bad', debtEnabled: true, debtCap: 'bad' }));
  assert.equal(payload.target, 1); assert.equal(payload.progression.enabled, false); assert.equal(payload.debt.enabled, false);
});

test('weekly carryover cap counts whole days', () => {
  assert.throws(() => buildHabitPayload(values({ scheduleType: 'weekly_quota', debtEnabled: true, debtCap: '0,5' })), err => err.field === 'debt-cap');
});
