import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createGroup } from '../functions/api/[[path]].js';

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES (\'owner\');');
  db.exec(readFileSync(new URL('../migrations/0004_groups_and_social.sql', import.meta.url), 'utf8'));
  return {
    db,
    env: { DB: {
      prepare(sql) { return { bind(...args) { return { run() { return db.prepare(sql).run(...args); } }; } }; },
      async batch(statements) {
        db.exec('BEGIN');
        try { const results = statements.map(s => s.run()); db.exec('COMMIT'); return results; }
        catch (err) { db.exec('ROLLBACK'); throw err; }
      },
    } },
  };
}
const request = body => new Request('https://pace.test/api/groups', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

for (const habit_name of ['', 'Kitap oku', 'a'.repeat(60)]) {
  test(`real group handler creates group and owner with habit length ${habit_name.length}`, async () => {
    const { db, env } = database();
    try {
      const response = await createGroup(request({ name: '  Okuma Grubu  ', habit_name }), { id: 'owner' }, env);
      assert.equal(response.status, 201);
      const { group } = await response.json();
      assert.equal(group.name, 'Okuma Grubu');
      assert.equal(db.prepare('SELECT role FROM group_members WHERE group_id=? AND user_id=?').get(group.id, 'owner').role, 'owner');
      assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_habits').get().n, habit_name ? 1 : 0);
      if (habit_name) assert.equal(db.prepare('SELECT name FROM group_habits').get().name, habit_name);
    } finally { db.close(); }
  });
}

test('oversized shared habit returns validation error without creating a partial group', async () => {
  const { db, env } = database();
  try {
    const response = await createGroup(request({ name: 'Okuma', habit_name: 'a'.repeat(61) }), { id: 'owner' }, env);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /60 karakter/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM groups').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members').get().n, 0);
  } finally { db.close(); }
});

test('demo group creation saves the initial shared habit', async () => {
  const values = new Map();
  const previous = { location: globalThis.location, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage };
  globalThis.location = { search: '?demo=1', origin: 'https://pace.test' };
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  globalThis.sessionStorage = { getItem: () => null };
  try {
    const api = await import('../src/lib/api.js');
    const { group } = await api.createGroup({ name: 'Okuma', habit_name: 'Kitap oku' });
    const detail = await api.getGroup(group.id);
    assert.equal(detail.habits.length, 1);
    assert.equal(detail.habits[0].name, 'Kitap oku');
    assert.equal(detail.habits[0].group_id, group.id);
    await assert.rejects(api.createGroup({ name: 'Okuma', habit_name: 'a'.repeat(61) }), /60 karakter/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});

for (const wrapped of [false, true]) {
  test(`API identifies missing group schema (wrapped=${wrapped})`, async () => {
    const { onRequest } = await import('../functions/api/[[path]].js');
    const db = new DatabaseSync(':memory:');
    let missing;
    try { db.prepare('SELECT * FROM groups'); } catch (err) { missing = err; }
    db.close();
    const response = await onRequest({
      params: { path: 'groups' },
      request: new Request('https://pace.test/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://pace.test', Authorization: 'Bearer test-session' },
        body: JSON.stringify({ name: 'Okuma' }),
      }),
      env: { DB: { prepare(sql) {
        if (sql.includes('FROM sessions')) return { bind() { return { first: async () => ({ id: 'owner' }) }; } };
        throw wrapped ? new Error('D1_ERROR', { cause: missing }) : missing;
      } } },
    });
    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.match(payload.error, /Veritabanı kurulumu/);
    assert.doesNotMatch(payload.error, /no such table|SELECT|D1_ERROR/);
  });
}

test('API automatically bootstraps missing group, social, gamification, and push tables on first request', async () => {
  const { onRequest } = await import('../functions/api/[[path]].js');
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of ['0001_initial.sql', '0002_password_accounts.sql', '0003_checkin_tombstones.sql']) {
      db.exec(readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8'));
    }
    const statement = (sql, args = []) => ({
      bind(...a) { return statement(sql, a); },
      async first() { return db.prepare(sql).get(...args) || null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { return { meta: { changes: Number(db.prepare(sql).run(...args).changes) } }; },
    });
    const env = {
      AUTH_SECRET: 'local-test-secret-not-production',
      DB: {
        prepare: sql => statement(sql),
        async batch(stmts) {
          db.exec('BEGIN');
          try {
            const results = [];
            for (const s of stmts) results.push(await s.run());
            db.exec('COMMIT');
            return results;
          } catch (err) {
            db.exec('ROLLBACK');
            throw err;
          }
        },
      },
    };
    const call = async (path, { method = 'GET', body, token } = {}) => {
      const response = await onRequest({
        env,
        params: { path },
        request: new Request('https://pace.test/api/' + path, {
          method,
          headers: {
            Origin: 'https://pace.test',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      });
      return { status: response.status, data: await response.json() };
    };

    const reg = await call('auth/register', { method: 'POST', body: { email: 'bootstrap@example.test', password: 'Bootstrap-Password-123' } });
    assert.equal(reg.status, 200);
    const { token } = reg.data;

    // Without 0004 applied, GET /api/groups used to fail with 503.
    const listBefore = await call('groups', { token });
    assert.equal(listBefore.status, 200);
    assert.deepEqual(listBefore.data.groups, []);

    const created = await call('groups', { method: 'POST', token, body: { name: 'Sabah Ritim', habit_name: 'Su iç' } });
    assert.equal(created.status, 201);
    assert.equal(created.data.group.name, 'Sabah Ritim');

    const gamif = await call('gamification', { method: 'PUT', token, body: { xp: 40, gems: 12, streakFreezes: 1 } });
    assert.equal(gamif.status, 200);
    assert.equal(gamif.data.ok, true);

    const inbox = await call('social/inbox', { token });
    assert.equal(inbox.status, 200);
    assert.deepEqual(inbox.data.items, []);
  } finally {
    db.close();
  }
});

