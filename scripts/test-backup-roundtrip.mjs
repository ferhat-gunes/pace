import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { importData, createGroup, createGroupInvite, onRequest } from '../functions/api/[[path]].js';
import { validateBackup, buildPersonalBackup, BACKUP_LIMITS } from '../src/lib/backup.js';
import { settingsAt } from '../src/lib/rules.js';

const base = { name: 'Okuma', tracking: 'quantity', direction: 'at_least', unit: 'sayfa', target: 10, schedule: { type: 'daily', days: [], times_per_week: null }, progression: { enabled: false, step: 0, cap: null }, debt: { enabled: false, cap: null }, paused: false, archived_at: null };
const payload = () => ({ week_start: 1, habits: [{ ...base, id: 'source-habit', start_date: '2026-01-01', target: 20, versions: [{ effective_from: '2026-01-01', settings: base }, { effective_from: '2026-02-01', settings: { ...base, target: 20, unit: 'dakika' } }] }], checkins: [{ habit_id: 'source-habit', habit_date: '2026-01-02', value: 10 }, { habit_id: 'source-habit', habit_date: '2026-02-02', value: 0, deleted: 1 }] });
const request = (body, path = 'import') => new Request(`https://pace.test/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://pace.test', Authorization: 'Bearer test-session' }, body: JSON.stringify(body) });
function database() {
  const db = new DatabaseSync(':memory:');
  for (const name of ['0001_initial.sql', '0002_password_accounts.sql', '0003_checkin_tombstones.sql', '0004_groups_and_social.sql', '0005_social_reactions_and_gamification.sql', '0006_web_push.sql', '0007_unified_habits_and_usernames.sql']) db.exec(readFileSync(new URL('../migrations/' + name, import.meta.url), 'utf8'));
  db.prepare('INSERT INTO users(id,email,created_at,updated_at) VALUES(?,?,?,?)').run('u1', 'one@example.test', 'now', 'now');
  db.prepare('INSERT INTO users(id,email,created_at,updated_at) VALUES(?,?,?,?)').run('u2', 'two@example.test', 'now', 'now');
  const wrap = (sql, args) => ({
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    sql, args,
  });
  const DB = { prepare(sql) { return { bind(...args) { return wrap(sql, args); } }; }, async batch(statements) { db.exec('BEGIN'); try { const result = []; for (const s of statements) result.push(await s.run()); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
  return { db, env: { DB } };
}
const context = (req, env, path) => ({ request: req, env: { ...env, DB: { ...env.DB, prepare(sql) { if (sql.includes('FROM sessions')) return { bind() { return { first: async () => ({ id: 'u1', email: 'one@example.test', week_start: 1 }) }; } }; return env.DB.prepare(sql); } } }, params: { path } });

test('backup roundtrip preserves historical rules and remaps foreign IDs with their records', async () => {
  const { db, env } = database();
  try {
    assert.equal((await importData(request(payload()), { id: 'u1' }, env)).status, 200);
    const exportedResponse = await onRequest(context(new Request('https://pace.test/api/export', { headers: { Authorization: 'Bearer test-session' } }), env, 'export'));
    const exported = await exportedResponse.json();
    assert.equal(exported.habits[0].versions.length, 2);
    assert.equal(settingsAt(exported.habits[0], '2026-01-15').target, 10);
    assert.equal(settingsAt(exported.habits[0], '2026-02-15').unit, 'dakika');
    const result = await importData(request(exported), { id: 'u2' }, env);
    const counts = await result.json();
    assert.equal(counts.habits_count, 1); assert.equal(counts.checkins_count, 2); assert.equal(counts.skipped_count, 0);
    const newHabit = db.prepare('SELECT id FROM habits WHERE user_id=?').get('u2');
    assert.notEqual(newHabit.id, 'source-habit');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM checkins WHERE user_id=? AND habit_id=?').get('u2', newHabit.id).n, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habit_versions WHERE user_id=? AND habit_id=?').get('u2', newHabit.id).n, 2);
    assert.equal(db.prepare('SELECT deleted FROM checkins WHERE user_id=? AND habit_date=?').get('u2', '2026-02-02').deleted, 1);
  } finally { db.close(); }
});

test('invalid record rejects whole import before writes', async () => {
  const { db, env } = database();
  try {
    const data = payload(); data.checkins.push({ habit_id: 'source-habit', habit_date: '2026-02-30', value: -1 });
    const response = await importData(request(data), { id: 'u1' }, env);
    assert.equal(response.status, 400);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habits').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM checkins').get().n, 0);
  } finally { db.close(); }
});

test('import accepts own valid backups above old 20 KB limit; oversized files reject', async () => {
  const { db, env } = database();
  try {
    const data = payload(); data.checkins = [];
    for (let i = 0; i < 350; i++) { const d = new Date('2025-01-01T12:00:00Z'); d.setUTCDate(d.getUTCDate() + i); data.checkins.push({ habit_id: 'source-habit', habit_date: d.toISOString().slice(0, 10), value: i, note: 'a'.repeat(100) }); }
    assert.ok(JSON.stringify(data).length > 20000);
    assert.equal((await importData(request(data), { id: 'u1' }, env)).status, 200);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM checkins').get().n, 350);
    const tooLarge = { ...payload(), padding: 'x'.repeat(BACKUP_LIMITS.bytes) };
    assert.equal((await importData(request(tooLarge), { id: 'u1' }, env)).status, 400);
  } finally { db.close(); }
});

test('export strips credentials and arbitrary user/checkin fields', () => {
  const source = payload();
  const output = buildPersonalBackup({ user: { id: 'u1', email: 'one@example.test', token: 'secret', recovery_code: 'secret', password: 'secret' }, habits: source.habits, checkins: source.checkins.map(c => ({ ...c, token: 'secret', idempotency_key: 'secret' })), weekStart: 1 });
  assert.equal(JSON.stringify(output).includes('secret'), false);
  assert.deepEqual(output.user, { id: 'u1', email: 'one@example.test' });
  assert.throws(() => validateBackup({ ...source, habits: [...source.habits, source.habits[0]] }), /Tekrarlanan/);
});

test('shared habit target validates before creating group; username invite rejects', async () => {
  const { db, env } = database();
  try {
    const invalid = await createGroup(request({ name: 'Grup', habit_name: 'Adım', tracking: 'quantity', target: 1000001 }, 'groups'), { id: 'u1' }, env);
    assert.equal(invalid.status, 400);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM groups').get().n, 0);
    const groupResponse = await createGroup(request({ name: 'Grup' }, 'groups'), { id: 'u1' }, env);
    const { group } = await groupResponse.json();
    const invite = await createGroupInvite(request({ invite_type: 'username', recipient: 'someone' }), { id: 'u1' }, env, group.id);
    assert.equal(invite.status, 400);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_invites').get().n, 0);
  } finally { db.close(); }
});

test('legacy username invitations cannot be accepted by a different account', async () => {
  const { db, env } = database();
  try {
    const { group } = await (await createGroup(request({ name: 'Grup' }, 'groups'), { id: 'u1' }, env)).json();
    const future = new Date(Date.now() + 86400000).toISOString();
    db.prepare('INSERT INTO group_invites(id,group_id,inviter_id,token,invite_type,recipient,status,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run('legacy', group.id, 'u2', 'legacy-token', 'username', 'different-name', 'pending', future, 'now');
    const response = await onRequest(context(request({ action: 'accept' }, 'invites/legacy-token/respond'), env, 'invites/legacy-token/respond'));
    assert.equal(response.status, 403);
    assert.equal(db.prepare('SELECT status FROM group_invites WHERE id=?').get('legacy').status, 'pending');
  } finally { db.close(); }
});

test('archive accepts explicit local date and preserves the previous day history', async () => {
  const { db, env } = database();
  try {
    await importData(request(payload()), { id: 'u1' }, env);
    const req = request({ effective_from: '2026-06-02' }, 'habits/source-habit/archive');
    const response = await onRequest(context(req, env, 'habits/source-habit/archive'));
    assert.equal(response.status, 200);
    const version = db.prepare('SELECT effective_from,settings_json FROM habit_versions WHERE habit_id=? ORDER BY effective_from DESC').get('source-habit');
    assert.equal(version.effective_from, '2026-06-02');
    assert.ok(JSON.parse(version.settings_json).archived_at);
    const invalid = await onRequest(context(request({ effective_from: '2026-02-30' }, 'habits/source-habit/restore'), env, 'habits/source-habit/restore'));
    assert.equal(invalid.status, 400);
  } finally { db.close(); }
});

test('a database error rolls back all import statements in the atomic batch', async () => {
  const { db, env } = database();
  const prepare = env.DB.prepare.bind(env.DB);
  env.DB.prepare = sql => {
    const stmt = prepare(sql);
    return { bind(...args) {
      const bound = stmt.bind(...args);
      if (sql.startsWith('INSERT INTO checkins')) bound.run = async () => { throw new Error('Simulated write failure'); };
      return bound;
    } };
  };
  try {
    await assert.rejects(importData(request(payload()), { id: 'u1' }, env), /Simulated/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habits').get().n, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habit_versions').get().n, 0);
  } finally { db.close(); }
});

test('partial current-day lifecycle edit does not apply a future rule early', async () => {
  const { db, env } = database();
  try {
    const data=payload();data.habits[0].versions[1].effective_from='2099-02-01';data.checkins=[];
    assert.equal((await importData(request(data),{id:'u1'},env)).status,200);
    const req=new Request('https://pace.test/api/habits/source-habit',{method:'PATCH',headers:{'Content-Type':'application/json',Origin:'https://pace.test',Authorization:'Bearer test-session'},body:JSON.stringify({paused:true,effective_from:'2026-11-16'})});
    const result=await onRequest(context(req,env,'habits/source-habit'));assert.equal(result.status,200);
    const response=await onRequest(context(new Request('https://pace.test/api/export',{headers:{Authorization:'Bearer test-session'}}),env,'export'));
    const exported=await response.json(),h=exported.habits[0];
    assert.equal(settingsAt(h,'2026-11-16').target,10);assert.equal(settingsAt(h,'2026-11-16').paused,true);
    assert.equal(settingsAt(h,'2099-02-01').target,20);assert.equal(settingsAt(h,'2099-02-01').unit,'dakika');
  }finally{db.close()}
});
