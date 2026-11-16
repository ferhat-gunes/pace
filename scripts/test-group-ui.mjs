import test from 'node:test';
import assert from 'node:assert/strict';
import { latestGroupLog, groupDayState, groupWeekSummary, groupHabitSettings, groupWriteBody, groupSettings, requireGroupDetail, requireGroupSuccess } from '../src/lib/group-ui.js';

test('group latest revision keeps tombstones and isolates users/habits/dates', () => {
  const rows = [
    { habit_id: 'h', user_id: 'a', habit_date: '2026-11-16', value: 10, revision: 1 },
    { group_habit_id: 'h', user_id: 'a', habit_date: '2026-11-16', value: 0, revision: 2, deleted: 1 },
    { habit_id: 'h', user_id: 'b', habit_date: '2026-11-16', value: 20, revision: 4 },
    { habit_id: 'other', user_id: 'a', habit_date: '2026-11-16', value: 20, revision: 5 },
  ];
  assert.equal(latestGroupLog(rows, 'h', 'a', '2026-11-16').deleted, 1);
  assert.equal(latestGroupLog(rows, 'h', 'a', '2026-11-15'), null);
  assert.equal(groupDayState({ target: 10 }, latestGroupLog(rows, 'h', 'a', '2026-11-16'), '2026-11-16', '2026-11-16'), 'Bekliyor');
});
test('group day semantics distinguish future, missing and explicit zero upper-limit records', () => {
  const habit = { tracking: 'quantity', target: 2, direction: 'at_most' };
  assert.equal(groupDayState(habit, null, '2026-11-15', '2026-11-16'), 'Kayıt yok');
  assert.equal(groupDayState(habit, null, '2026-11-16', '2026-11-16'), 'Bekliyor');
  assert.equal(groupDayState(habit, { value: 0 }, '2026-11-16', '2026-11-16'), 'Tamamlandı');
  assert.equal(groupDayState(habit, { value: 3 }, '2026-11-16', '2026-11-16'), 'Hedefe ulaşılmadı');
  assert.equal(groupDayState(habit, { value: 0 }, '2026-11-17', '2026-11-16'), 'Henüz gelmedi');
});
test('week summary uses chosen week boundary, elapsed days and correct habit target', () => {
  const habit = { id: 'h', target: 20 };
  const rows = [
    { habit_id: 'h', user_id: 'a', habit_date: '2026-11-15', value: 20 },
    { habit_id: 'h', user_id: 'a', habit_date: '2026-11-16', value: 10 },
    { habit_id: 'other', user_id: 'a', habit_date: '2026-11-16', value: 30 },
  ];
  assert.deepEqual(groupWeekSummary(habit, rows, 'a', '2026-11-16', 0, '2026-11-16'), { days: ['2026-11-15','2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20','2026-11-21'], elapsed: 2, completed: 1, percentage: 50 });
  assert.equal(groupWeekSummary(habit, rows, 'a', '2026-11-16', 1, '2026-11-16').completed, 0);
});
test('group habit settings keep positive fractional targets and validate bounds', () => {
  assert.deepEqual(groupHabitSettings({ name: ' Koşu ', tracking: 'quantity', target: '0.25', unit: ' km ', direction: 'at_most' }), { name: 'Koşu', tracking: 'quantity', target: .25, unit: 'km', direction: 'at_most' });
  for (const target of ['', 0, -1, Infinity, NaN, 1000001]) assert.throws(() => groupHabitSettings({ name: 'Koşu', tracking: 'quantity', target }));
  assert.throws(() => groupHabitSettings({ name: 'Koşu', tracking: 'quantity', target: 1, unit: 'a'.repeat(21) }));
  assert.equal(groupHabitSettings({ name: 'Koşu', tracking: 'check', target: 500 }).target, 1);
});
test('write validation rejects empty and invalid amounts without silently zeroing, keeps OCC contract', () => {
  assert.deepEqual(groupWriteBody('0,25', 3, 'same-retry-key'), { value: .25, expected_revision: 3, idempotency_key: 'same-retry-key' });
  for (const value of ['', ' ', null, true, 'invalid', -1, 1000001, Infinity]) assert.throws(() => groupWriteBody(value, 0, 'key'));
  assert.throws(() => groupWriteBody(1, -1, 'key'));
  assert.throws(() => groupWriteBody(1, 0, ''));
});
test('group and payload validation do not treat partial responses as success', () => {
  assert.deepEqual(groupSettings({ name: '  Ritim ', description: ' Beraber ' }), { name: 'Ritim', description: 'Beraber' });
  assert.throws(() => groupSettings({ name: '  ' }));
  assert.throws(() => groupSettings({ name: 'Ritim', description: 'a'.repeat(281) }));
  assert.throws(() => requireGroupDetail({ group: { id: 'g' } }, 'g'));
  assert.throws(() => requireGroupDetail({ group: { id: 'other' }, habits: [], checkins: [], members: [] }, 'g'));
  assert.throws(() => requireGroupSuccess({}));
  assert.equal(requireGroupSuccess({ ok: true }).ok, true);
});
