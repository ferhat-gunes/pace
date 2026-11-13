import test from 'node:test';
import assert from 'node:assert/strict';

import { passwordAuth } from '../functions/lib/password.js';
import { encryptWebPushPayload } from '../functions/lib/webpush.js';
import { stateFor, dateKey, addDays, weekDays } from '../src/lib/rules.js';
import { localDateIso } from '../src/lib/date.js';
import {
  isWithinQuietHours,
  shouldTriggerDailyReminder,
} from '../src/lib/notifications.js';

function createMockDb() {
  const users = new Map();
  const credentials = new Map();
  const sessions = new Map();
  const rateLimits = new Map();

  return {
    prepare(sql) {
      return {
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async first() {
          if (sql.includes('INSERT INTO rate_limits')) {
            const [keyHash, windowStart] = this.args;
            const prev = rateLimits.get(keyHash);
            const nextCount =
              prev && prev.window_start === windowStart ? prev.count + 1 : 1;
            rateLimits.set(keyHash, { window_start: windowStart, count: nextCount });
            return { count: nextCount };
          }
          if (sql.includes('SELECT id FROM users WHERE email=?')) {
            const email = String(this.args[0] || '').toLowerCase();
            for (const u of users.values()) {
              if (u.email.toLowerCase() === email) return { id: u.id };
            }
            return null;
          }
          if (sql.includes('FROM users u JOIN credentials c')) {
            const email = String(this.args[0] || '').toLowerCase();
            for (const u of users.values()) {
              if (u.email.toLowerCase() === email) {
                const c = credentials.get(u.id);
                if (!c) return null;
                return {
                  id: u.id,
                  email: u.email,
                  week_start: u.week_start,
                  password_hash: c.password_hash,
                  salt: c.salt,
                  iterations: c.iterations,
                  recovery_hash: c.recovery_hash,
                };
              }
            }
            return null;
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT INTO sessions')) {
            const [id, user_id, token_hash, created_at, expires_at] = this.args;
            sessions.set(id, { id, user_id, token_hash, created_at, expires_at });
            return { meta: { changes: 1 } };
          }
          if (sql.includes('INSERT INTO users')) {
            const [id, email, week_start, timezone, created_at, updated_at] = this.args;
            users.set(id, { id, email, week_start, timezone, created_at, updated_at });
            return { meta: { changes: 1 } };
          }
          if (sql.includes('INSERT INTO credentials')) {
            const [user_id, password_hash, salt, iterations, recovery_hash, updated_at] =
              this.args;
            credentials.set(user_id, {
              user_id,
              password_hash,
              salt,
              iterations,
              recovery_hash,
              updated_at,
            });
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
      };
    },
    async batch(statements) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
  };
}

function makeAuthRequest(body) {
  return new Request('https://pace.example/api/auth/password/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '127.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

test('Password auth accepts 8-character password and rejects 7-character password', async () => {
  const env = {
    AUTH_SECRET: 'test-auth-secret-1234567890',
    DB: createMockDb(),
  };

  const shortRes = await passwordAuth(
    makeAuthRequest({ email: 'short@pace.app', password: '1234567' }),
    env,
    'register'
  );
  assert.equal(shortRes.status, 400);

  const okRes = await passwordAuth(
    makeAuthRequest({ email: 'eight@pace.app', password: '12345678' }),
    env,
    'register'
  );
  assert.equal(okRes.status, 200);
  const okBody = await okRes.json();
  assert.equal(okBody.ok, true);
  assert.equal(okBody.user.email, 'eight@pace.app');
  assert.ok(okBody.token);
  assert.ok(okBody.recovery_code);

  const loginRes = await passwordAuth(
    makeAuthRequest({ email: 'eight@pace.app', password: '12345678' }),
    env,
    'login'
  );
  assert.equal(loginRes.status, 200);
});

function toB64Url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

test('encryptWebPushPayload produces valid RFC 8291 aes128gcm envelope', async () => {
  const uaKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const uaPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', uaKeys.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));

  const encrypted = await encryptWebPushPayload(
    { p256dh: toB64Url(uaPubRaw), auth: toB64Url(auth) },
    { title: 'Test Push', body: 'PACE bildirim testi', url: '/?view=today' }
  );

  assert.ok(encrypted instanceof Uint8Array);
  assert.ok(encrypted.length > 86, 'Payload must include 86-byte header + ciphertext + tag');
  const rs = new DataView(encrypted.buffer, encrypted.byteOffset, encrypted.byteLength).getUint32(
    16,
    false
  );
  assert.equal(rs, 4096);
  assert.equal(encrypted[20], 65, 'Key ID length must be 65 bytes for uncompressed P-256 point');
  assert.equal(encrypted[21], 0x04, 'AS public key must start with 0x04');
});

test('rules.js handles at_most limit habits accurately', () => {
  const today = dateKey();
  const yesterday = addDays(today, -1);
  const twoDaysAgo = addDays(today, -2);
  const habit = {
    id: 'h_limit',
    name: 'Sosyal medya sınırı',
    tracking: 'quantity',
    direction: 'at_most',
    unit: 'dk',
    target: 60,
    start_date: twoDaysAgo,
    schedule: { type: 'daily' },
    versions: [],
  };

  const todayOk = stateFor(
    habit,
    today,
    [{ habit_id: 'h_limit', habit_date: today, value: 45, deleted: false }],
    1
  );
  assert.equal(todayOk.status, 'done');
  assert.equal(todayOk.over, 0);

  const yesterdayOver = stateFor(
    habit,
    yesterday,
    [{ habit_id: 'h_limit', habit_date: yesterday, value: 90, deleted: false }],
    1
  );
  assert.equal(yesterdayOver.status, 'missed');
  assert.equal(yesterdayOver.over, 30);

  const yesterdayUnlogged = stateFor(habit, yesterday, [], 1);
  assert.equal(yesterdayUnlogged.status, 'unlogged');
});

test('rules.js handles weekly_quota completion counting', () => {
  const today = dateKey();
  const days = weekDays(today, 1);
  const habit = {
    id: 'h_quota',
    name: 'Koşu',
    tracking: 'check',
    direction: 'at_least',
    target: 1,
    start_date: days[0],
    schedule: { type: 'weekly_quota', times_per_week: 3 },
    versions: [],
  };

  const partial = stateFor(
    habit,
    today,
    [
      { habit_id: 'h_quota', habit_date: days[0], value: 1, deleted: false },
      { habit_id: 'h_quota', habit_date: days[1], value: 1, deleted: false },
    ],
    1
  );
  assert.equal(partial.status, 'open');
  assert.equal(partial.actual, 2);
  assert.equal(partial.goal, 3);

  const done = stateFor(
    habit,
    today,
    [
      { habit_id: 'h_quota', habit_date: days[0], value: 1, deleted: false },
      { habit_id: 'h_quota', habit_date: days[1], value: 1, deleted: false },
      { habit_id: 'h_quota', habit_date: days[2], value: 1, deleted: false },
    ],
    1
  );
  assert.equal(done.status, 'done');
  assert.equal(done.actual, 3);
});

test('notifications.js quiet hours, daily reminder gating, and localDateIso', () => {
  assert.equal(isWithinQuietHours('23:15', '22:00', '08:30'), true);
  assert.equal(isWithinQuietHours('07:00', '22:00', '08:30'), true);
  assert.equal(isWithinQuietHours('14:00', '22:00', '08:30'), false);
  assert.equal(isWithinQuietHours('13:30', '13:00', '15:00'), true);
  assert.equal(isWithinQuietHours('16:00', '13:00', '15:00'), false);

  const suppressedNow = new Date(2026, 10, 12, 22, 30, 0);
  assert.equal(
    shouldTriggerDailyReminder({
      enabled: true,
      reminderTime: '20:00',
      quietStart: '22:00',
      quietEnd: '08:30',
      lastReminderDate: null,
      now: suppressedNow,
      remainingHabitsCount: 2,
    }),
    false
  );

  const allowedNow = new Date(2026, 10, 12, 20, 15, 0);
  assert.equal(
    shouldTriggerDailyReminder({
      enabled: true,
      reminderTime: '20:00',
      quietStart: '22:00',
      quietEnd: '08:30',
      lastReminderDate: null,
      now: allowedNow,
      remainingHabitsCount: 2,
    }),
    true
  );

  assert.equal(localDateIso(allowedNow), '2026-11-12');
});
