import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/api/[[path]].js';

const MIGRATIONS = [
  '0001_initial.sql',
  '0002_password_accounts.sql',
  '0003_checkin_tombstones.sql',
  '0004_groups_and_social.sql',
  '0005_social_reactions_and_gamification.sql',
  '0006_web_push.sql',
  '0007_unified_habits_and_usernames.sql',
];

function createTestEnv(migrations = MIGRATIONS) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const file of migrations) {
    db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  const statement = (sql, args = []) => ({
    bind(...a) { return statement(sql, a); },
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() {
      const r = db.prepare(sql).run(...args);
      return { meta: { changes: Number(r.changes) } };
    },
  });
  const env = {
    AUTH_SECRET: 'test-secret-for-unified-habits-and-usernames',
    DB: {
      prepare: sql => statement(sql),
      async batch(stmts) {
        db.exec('BEGIN');
        try {
          const out = [];
          for (const s of stmts) out.push(await s.run());
          db.exec('COMMIT');
          return out;
        } catch (err) {
          db.exec('ROLLBACK');
          throw err;
        }
      },
    },
  };
  return { db, env };
}

async function callApi(env, path, { method = 'GET', token = null, body = null } = {}) {
  const headers = { Origin: 'https://pace.test' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== null) headers['Content-Type'] = 'application/json';
  const request = new Request(`https://pace.test/api/${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  const response = await onRequest({ env, params: { path }, request });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function registerUser(env, email, password = 'Password123!', username) {
  const payload = { email, password };
  if (username !== undefined) payload.username = username;
  return callApi(env, 'auth/register', { method: 'POST', body: payload });
}

test('username validation, normalization, case-insensitive uniqueness, and register with/without username', async () => {
  const { db, env } = createTestEnv();
  try {
    // Register without username
    const r1 = await registerUser(env, 'alice@example.test', 'Password123!');
    assert.equal(r1.status, 200);
    assert.equal(r1.data.user.username, null);

    // GET /api/auth/me reflects null username
    const me1 = await callApi(env, 'auth/me', { token: r1.data.token });
    assert.equal(me1.status, 200);
    assert.equal(me1.data.user.username, null);

    // Invalid usernames rejected with 400
    for (const bad of ['ab', 'a'.repeat(25), 'ali@test', 'ali space', 'türkçe', '']) {
      const res = await callApi(env, 'account/username', {
        method: 'PATCH',
        token: r1.data.token,
        body: { username: bad },
      });
      assert.equal(res.status, 400, `expected 400 for "${bad}"`);
    }

    // Valid username with leading @ and uppercase normalized to lowercase
    const set1 = await callApi(env, 'account/username', {
      method: 'PATCH',
      token: r1.data.token,
      body: { username: '@Ali.Veli_1' },
    });
    assert.equal(set1.status, 200);
    assert.equal(set1.data.username, 'ali.veli_1');

    // Register with optional username
    const r2 = await registerUser(env, 'bob@example.test', 'Password123!', '@Bob_2');
    assert.equal(r2.status, 200);
    assert.equal(r2.data.user.username, 'bob_2');

    // Case-insensitive uniqueness conflict (409) on register and PATCH
    const dupReg = await registerUser(env, 'charlie@example.test', 'Password123!', 'ALI.VELI_1');
    assert.equal(dupReg.status, 409);

    const dupPatch = await callApi(env, 'account/username', {
      method: 'PATCH',
      token: r2.data.token,
      body: { username: 'Ali.Veli_1' },
    });
    assert.equal(dupPatch.status, 409);
  } finally {
    db.close();
  }
});

test('@username invites, link invites, inbox routing, accept/decline, and unified GET /api/habits', async () => {
  const { db, env } = createTestEnv();
  try {
    const owner = await registerUser(env, 'owner@example.test');
    const friend = await registerUser(env, 'friend@example.test');
    const outsider = await registerUser(env, 'outsider@example.test', 'Password123!', 'outsider');

    // Owner creates habit
    const created = await callApi(env, 'habits', {
      method: 'POST',
      token: owner.data.token,
      body: { name: 'Sabah Koşusu', tracking: 'quantity', direction: 'at_least', target: 5, unit: 'km', schedule: { type: 'daily', days: [], times_per_week: null }, start_date: '2026-06-01' },
    });
    assert.equal(created.status, 201);
    const habitId = created.data.habit.id;

    // Inviter without username gets 400 USERNAME_REQUIRED
    const noUser = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'link' },
    });
    assert.equal(noUser.status, 400);
    assert.equal(noUser.data.code, 'USERNAME_REQUIRED');

    // Set owner username
    assert.equal((await callApi(env, 'account/username', {
      method: 'PATCH',
      token: owner.data.token,
      body: { username: 'owner.one' },
    })).status, 200);

    // Email invite is rejected (400)
    const emailInv = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'email', email: 'friend@example.test' },
    });
    assert.equal(emailInv.status, 400);

    // Unknown @username returns 404
    const unknownInv = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'username', username: 'nobody.here' },
    });
    assert.equal(unknownInv.status, 404);

    // Self invite returns 400
    const selfInv = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'username', username: '@owner.one' },
    });
    assert.equal(selfInv.status, 400);

    // Link invite (7-day expiry) + public preview without private data
    const linkInv = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'link' },
    });
    assert.equal(linkInv.status, 201);
    const linkToken = linkInv.data.invite.token;
    const expiresMs = Date.parse(linkInv.data.invite.expires_at) - Date.parse(linkInv.data.invite.created_at);
    assert.ok(expiresMs >= 6.9 * 86400000 && expiresMs <= 7.1 * 86400000, 'link invite should expire in ~7 days');

    const preview = await callApi(env, `invites/${linkToken}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.data.invite.habit_name, 'Sabah Koşusu');
    assert.equal(preview.data.invite.inviter_username, 'owner.one');
    assert.equal(preview.data.invite.participant_count, 1);
    assert.equal(JSON.stringify(preview.data).includes('owner@example.test'), false, 'must not leak email');

    // Accepting link invite when already participant returns already_member: true
    const selfAccept = await callApi(env, `invites/${linkToken}/accept`, {
      method: 'POST',
      token: owner.data.token,
    });
    assert.equal(selfAccept.status, 200);
    assert.equal(selfAccept.data.already_member, true);

    // Accepting link invite without username returns 400 USERNAME_REQUIRED
    const friendNoUser = await callApi(env, `invites/${linkToken}/accept`, {
      method: 'POST',
      token: friend.data.token,
    });
    assert.equal(friendNoUser.status, 400);
    assert.equal(friendNoUser.data.code, 'USERNAME_REQUIRED');

    // Set friend username
    assert.equal((await callApi(env, 'account/username', {
      method: 'PATCH',
      token: friend.data.token,
      body: { username: 'friend.two' },
    })).status, 200);

    // Send @username invite to friend
    const userInv = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'username', username: '@friend.two' },
    });
    assert.equal(userInv.status, 201);
    const userToken = userInv.data.invite.token;

    // Duplicate pending @username invite returns 409
    const dupPending = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'username', username: 'friend.two' },
    });
    assert.equal(dupPending.status, 409);

    // GET /api/invites/inbox is NOT shadowed by GET /api/invites/:token
    const inbox = await callApi(env, 'invites/inbox', { token: friend.data.token });
    assert.equal(inbox.status, 200);
    assert.equal(inbox.data.invites.length, 1);
    assert.equal(inbox.data.invites[0].token, userToken);
    assert.equal(inbox.data.invites[0].inviter_username, 'owner.one');
    assert.equal(inbox.data.invites[0].invite_type, 'username');

    // Outsider cannot accept or decline friend's targeted @username invite (403)
    const wrongAccept = await callApi(env, `invites/${userToken}/accept`, {
      method: 'POST',
      token: outsider.data.token,
    });
    assert.equal(wrongAccept.status, 403);

    const wrongDecline = await callApi(env, `invites/${userToken}/decline`, {
      method: 'POST',
      token: outsider.data.token,
    });
    assert.equal(wrongDecline.status, 403);

    // Friend accepts @username invite
    const accepted = await callApi(env, `invites/${userToken}/accept`, {
      method: 'POST',
      token: friend.data.token,
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.data.already_member, false);
    assert.equal(accepted.data.habit_id, habitId);

    // Inviting already-participant returns 409
    const alreadyPart = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'username', username: 'friend.two' },
    });
    assert.equal(alreadyPart.status, 409);

    // Decline flow: invite outsider, outsider declines, not added to participants
    const outInv = await callApi(env, `habits/${habitId}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'username', username: 'outsider' },
    });
    assert.equal(outInv.status, 201);
    const declined = await callApi(env, `invites/${outInv.data.invite.token}/decline`, {
      method: 'POST',
      token: outsider.data.token,
    });
    assert.equal(declined.status, 200);
    assert.equal(declined.data.status, 'declined');
    const outHabits = await callApi(env, 'habits', { token: outsider.data.token });
    assert.equal(outHabits.data.habits.length, 0);

    // Friend logs check-in; GET /api/habits returns participants + participant_checkins
    const checkinRes = await callApi(env, `habits/${habitId}/check-ins/2026-06-01`, {
      method: 'PUT',
      token: friend.data.token,
      body: { value: 5, expected_revision: 0, idempotency_key: crypto.randomUUID() },
    });
    assert.equal(checkinRes.status, 201);

    const ownerState = await callApi(env, 'habits', { token: owner.data.token });
    assert.equal(ownerState.status, 200);
    assert.equal(ownerState.data.habits.length, 1);
    assert.equal(ownerState.data.habits[0].role, 'owner');
    assert.equal(ownerState.data.habits[0].participant_count, 2);
    assert.ok(ownerState.data.participant_checkins.some(c => c.habit_id === habitId && c.user_id === friend.data.user.id && c.value === 5));
  } finally {
    db.close();
  }
});

test('archive/restore, remove participant, leave with ownership transfer, sole-owner 409, and permanent delete', async () => {
  const { db, env } = createTestEnv();
  try {
    const owner = await registerUser(env, 'own@example.test', 'Password123!', 'own.user');
    const m1 = await registerUser(env, 'm1@example.test', 'Password123!', 'member.one');
    const m2 = await registerUser(env, 'm2@example.test', 'Password123!', 'member.two');

    const { data: { habit } } = await callApi(env, 'habits', {
      method: 'POST',
      token: owner.data.token,
      body: { name: 'Meditasyon', tracking: 'check', direction: 'at_least', target: 1, unit: 'kez', schedule: { type: 'daily', days: [], times_per_week: null }, start_date: '2026-06-01' },
    });

    // Invite m1 and m2 via link and accept
    const { data: { invite } } = await callApi(env, `habits/${habit.id}/invites`, {
      method: 'POST',
      token: owner.data.token,
      body: { invite_type: 'link' },
    });
    assert.equal((await callApi(env, `invites/${invite.token}/accept`, { method: 'POST', token: m1.data.token })).status, 200);
    assert.equal((await callApi(env, `invites/${invite.token}/accept`, { method: 'POST', token: m2.data.token })).status, 200);

    // Log checkins for owner, m1, m2
    for (const u of [owner, m1, m2]) {
      assert.equal((await callApi(env, `habits/${habit.id}/check-ins/2026-06-01`, {
        method: 'PUT',
        token: u.data.token,
        body: { value: 1, expected_revision: 0, idempotency_key: crypto.randomUUID() },
      })).status, 201);
    }

    // Member cannot permanently delete (403) or remove participant (403)
    assert.equal((await callApi(env, `habits/${habit.id}`, { method: 'DELETE', token: m1.data.token })).status, 403);
    assert.equal((await callApi(env, `habits/${habit.id}/participants/${m2.data.user.id}`, { method: 'DELETE', token: m1.data.token })).status, 403);

    // Owner archives and restores
    assert.equal((await callApi(env, `habits/${habit.id}/archive`, { method: 'POST', token: owner.data.token, body: { effective_from: '2026-06-02' } })).status, 200);
    assert.equal((await callApi(env, `habits/${habit.id}/restore`, { method: 'POST', token: owner.data.token, body: { effective_from: '2026-06-03' } })).status, 200);

    // Owner removes m2 -> m2's checkins & participation deleted
    const removed = await callApi(env, `habits/${habit.id}/participants/${m2.data.user.id}`, {
      method: 'DELETE',
      token: owner.data.token,
    });
    assert.equal(removed.status, 200);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habit_participants WHERE habit_id=? AND user_id=?').get(habit.id, m2.data.user.id).n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM checkins WHERE habit_id=? AND user_id=?').get(habit.id, m2.data.user.id).n, 0);

    // Owner leaves -> ownership transfers to m1, owner's checkins deleted
    const ownerLeave = await callApi(env, `habits/${habit.id}/leave`, {
      method: 'POST',
      token: owner.data.token,
    });
    assert.equal(ownerLeave.status, 200);
    assert.equal(ownerLeave.data.transferred_to, m1.data.user.id);
    assert.equal(db.prepare('SELECT role FROM habit_participants WHERE habit_id=? AND user_id=?').get(habit.id, m1.data.user.id).role, 'owner');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM checkins WHERE habit_id=? AND user_id=?').get(habit.id, owner.data.user.id).n, 0);

    // Sole owner (m1) trying to leave returns 409 REQUIRES_DELETE
    const soleLeave = await callApi(env, `habits/${habit.id}/leave`, {
      method: 'POST',
      token: m1.data.token,
    });
    assert.equal(soleLeave.status, 409);
    assert.equal(soleLeave.data.code, 'REQUIRES_DELETE');

    // Sole owner permanently deletes habit -> cascades/removes all related rows
    const deleted = await callApi(env, `habits/${habit.id}`, {
      method: 'DELETE',
      token: m1.data.token,
    });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.data.deleted, true);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habits WHERE id=?').get(habit.id).n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habit_participants WHERE habit_id=?').get(habit.id).n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM checkins WHERE habit_id=?').get(habit.id).n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habit_invites WHERE habit_id=?').get(habit.id).n, 0);
  } finally {
    db.close();
  }
});

test('migration 0007 preserves personal habits and migrates legacy groups/group_habits/group_members/group_checkins', () => {
  const preMigrations = MIGRATIONS.slice(0, 6);
  const { db } = createTestEnv(preMigrations);
  try {
    // Seed users, personal habit, and legacy group data
    db.prepare('INSERT INTO users(id, email, created_at, updated_at) VALUES(?, ?, ?, ?)').run('u1', 'u1@example.test', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    db.prepare('INSERT INTO users(id, email, created_at, updated_at) VALUES(?, ?, ?, ?)').run('u2', 'u2@example.test', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
    db.prepare(`INSERT INTO habits(id, user_id, name, tracking, direction, unit, target, schedule_type, schedule_days, start_date, created_at, updated_at)
                VALUES('personal-1', 'u1', 'Kitap Oku', 'quantity', 'at_least', 'sayfa', 20, 'daily', '[]', '2026-01-01', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`).run();
    db.prepare(`INSERT INTO groups(id, name, owner_id, created_at, updated_at) VALUES('g1', 'Koşu Grubu', 'u1', '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')`).run();
    db.prepare(`INSERT INTO group_members(group_id, user_id, role, joined_at) VALUES('g1', 'u1', 'owner', '2026-01-02T00:00:00Z')`).run();
    db.prepare(`INSERT INTO group_members(group_id, user_id, role, joined_at) VALUES('g1', 'u2', 'member', '2026-01-03T00:00:00Z')`).run();
    db.prepare(`INSERT INTO group_habits(id, group_id, name, tracking, target, unit, created_at, updated_at) VALUES('gh1', 'g1', '5km Koşu', 'quantity', 5, 'km', '2026-01-02T00:00:00Z', '2026-01-02T00:00:00Z')`).run();
    db.prepare(`INSERT INTO group_checkins(id, group_id, group_habit_id, user_id, habit_date, value, revision, idempotency_key, deleted, created_at, updated_at)
                VALUES('gc1', 'g1', 'gh1', 'u2', '2026-01-05', 5, 1, 'idem-1', 0, '2026-01-05T08:00:00Z', '2026-01-05T08:00:00Z')`).run();

    // Execute migration 0007
    db.exec(readFileSync(new URL('../migrations/0007_unified_habits_and_usernames.sql', import.meta.url), 'utf8'));

    // Verify personal habit and migrated group habit both exist in habits
    const habits = db.prepare('SELECT id, user_id, name FROM habits ORDER BY id').all();
    assert.deepEqual(habits.map(h => h.id), ['gh1', 'personal-1']);

    // Verify habit_participants has owner for personal-1, and owner+member for gh1
    const participants = db.prepare('SELECT habit_id, user_id, role FROM habit_participants ORDER BY habit_id, user_id').all().map(p => ({ ...p }));
    assert.deepEqual(participants, [
      { habit_id: 'gh1', user_id: 'u1', role: 'owner' },
      { habit_id: 'gh1', user_id: 'u2', role: 'member' },
      { habit_id: 'personal-1', user_id: 'u1', role: 'owner' },
    ]);

    // Verify group_checkins migrated into checkins with gm_ prefix
    const checkin = { ...db.prepare('SELECT id, habit_id, user_id, value, idempotency_key FROM checkins WHERE id=?').get('gc1') };
    assert.deepEqual(checkin, { id: 'gc1', habit_id: 'gh1', user_id: 'u2', value: 5, idempotency_key: 'gm_idem-1' });
  } finally {
    db.close();
  }
});
