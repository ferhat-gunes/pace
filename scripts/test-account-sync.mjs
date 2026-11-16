import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountSync, accountStorageKey } from '../src/lib/account-sync.js';
const day = '2026-11-16';
const record = (value, revision, deleted = 0) => ({ id: 'record', habit_id: 'habit', habit_date: day, value, revision, deleted });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(r => setTimeout(r, 0));
function setup(options = {}) {
  let server = record(0, 1);
  const requests = [];
  const store = new Map();
  const storage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  const sync = createAccountSync({
    userId: 'user-a', initialRecords: [server], storage,
    request: async (path, opts) => {
      const body = JSON.parse(opts.body); requests.push({ path, method: opts.method, ...body });
      if (body.expected_revision !== server.revision) throw Object.assign(new Error('Conflict'), { status: 409 });
      server = record(opts.method === 'DELETE' ? 0 : body.value, server.revision + 1, opts.method === 'DELETE' ? 1 : 0);
      return { checkin: server };
    }, ...options,
  });
  return { sync, requests, store, storage, get server() { return server; } };
}

test('ten functional rapid increments coalesce to latest intent, not rendered quantity', async () => {
  const s = setup();
  for (let i = 0; i < 10; i++) s.sync.set('habit', day, current => current + 1);
  assert.equal(s.sync.snapshot().checkins[0].value, 10);
  await s.sync.flush('habit', day);
  assert.equal(s.requests.length, 1);
  assert.equal(s.requests[0].expected_revision, 1);
  assert.equal(s.server.value, 10);
  assert.equal(s.sync.snapshot().pendingEntries.length, 0);
  s.sync.dispose();
});

test('in-flight desired changes wait for synchronous acceptance of the new revision', async () => {
  const gate = deferred();
  let calls = [];
  const s = setup({ request: async (_path, opts) => {
    const body = JSON.parse(opts.body); calls.push(body);
    if (calls.length === 1) await gate.promise;
    return { checkin: record(body.value, body.expected_revision + 1) };
  } });
  s.sync.set('habit', day, 1);
  const pending = s.sync.flush('habit', day);
  await tick();
  s.sync.set('habit', day, current => current + 9);
  gate.resolve(); await pending;
  assert.deepEqual(calls.map(r => [r.value, r.expected_revision]), [[1, 1], [10, 2]]);
  assert.equal(s.sync.snapshot().records[0].revision, 3);
  s.sync.merge([record(0, 1)]);
  assert.equal(s.sync.snapshot().checkins[0].value, 10, 'stale GET must not reverse accepted PUT');
  s.sync.dispose();
});

test('functional increment after refreshed saved entry uses current confirmed record', async () => {
  const calls = [];
  const s = setup({ request: async (_p, opts) => { const body = JSON.parse(opts.body); calls.push(body); return { checkin: record(body.value, body.expected_revision + 1) }; } });
  s.sync.set('habit', day, 5); await s.sync.flush('habit', day);
  s.sync.merge([record(9, 10)]);
  s.sync.set('habit', day, current => current + 1); await s.sync.flush('habit', day);
  assert.equal(calls.at(-1).value, 10);
  assert.equal(calls.at(-1).expected_revision, 10);
  s.sync.dispose();
});

test('409 refresh preserves desired value and requires explicit retry', async () => {
  let fail = true, sync;
  sync = createAccountSync({ userId: 'u', initialRecords: [record(1, 1)], request: async (_path, opts) => {
    const body = JSON.parse(opts.body);
    if (fail) { fail = false; throw Object.assign(new Error('Changed on another device'), { status: 409 }); }
    return { checkin: record(body.value, body.expected_revision + 1) };
  }, refresh: async () => sync.merge([record(4, 3)]) });
  sync.set('habit', day, 12); await sync.flush('habit', day);
  assert.equal(sync.snapshot().records[0].value, 4);
  assert.equal(sync.snapshot().checkins[0].value, 12);
  assert.equal(sync.snapshot().pendingEntries[0].status, 'conflict');
  await sync.retryErrors();
  assert.equal(sync.snapshot().pendingEntries[0].status, 'conflict');
  await sync.retry('habit', day);
  assert.equal(sync.snapshot().records[0].value, 12);
  assert.equal(sync.snapshot().records[0].revision, 4);
  sync.dispose();
});

test('account-scoped persisted draft never appears or writes in another account', async () => {
  const s = setup({ request: async () => { throw new Error('Offline'); } });
  s.sync.set('habit', day, 7); await s.sync.flush('habit', day); s.sync.dispose();
  assert.ok(s.store.has(accountStorageKey('entry_drafts', 'user-a')));
  let writes = 0;
  const other = createAccountSync({ userId: 'user-b', storage: s.storage, request: async () => { writes++; } });
  assert.equal(other.snapshot().pendingEntries.length, 0); await other.retryErrors();
  assert.equal(writes, 0); other.dispose();
  const restored = createAccountSync({ userId: 'user-a', storage: s.storage, initialRecords: [record(2, 5)], request: async (_p, o) => { writes++; const b = JSON.parse(o.body); assert.equal(b.expected_revision, 5); return { checkin: record(b.value, 6) }; } });
  assert.equal(restored.snapshot().checkins[0].value, 7);
  assert.equal(restored.snapshot().pendingEntries[0].restored, true);
  await restored.retryErrors(); assert.equal(writes, 0);
  await restored.retry('habit', day); assert.equal(writes, 1);
  restored.dispose();
});

test('disposed account ignores late callbacks', async () => {
  const gate = deferred(); let last;
  const s = setup({ request: async () => { await gate.promise; return { checkin: record(8, 2) }; }, onChange: snapshot => { last = snapshot; } });
  s.sync.set('habit', day, 8); const pending = s.sync.flush('habit', day); await tick();
  s.sync.dispose(); last = null; gate.resolve(); await pending;
  assert.equal(last, null);
  assert.equal(s.sync.snapshot().records[0].value, 0);
});

test('invalid HTTP success is a visible retained error, not a saved record', async () => {
  const s = setup({ request: async () => ({ ok: true }) });
  s.sync.set('habit', day, 9); await s.sync.flush('habit', day);
  assert.equal(s.sync.snapshot().records[0].value, 0);
  assert.equal(s.sync.snapshot().pendingEntries[0].status, 'error');
  assert.match(s.sync.snapshot().pendingEntries[0].error, /doğrulamadı/);
  assert.equal(s.sync.snapshot().checkins[0].value, 9);
  s.sync.dispose();
});

test('storage failure reports durability loss but keeps the in-memory intent', async () => {
  let storageErrors = 0;
  const s = setup({ storage: { getItem() { return null; }, setItem() { throw new Error('Quota'); }, removeItem() {} }, onStorageError: () => { storageErrors++; } });
  s.sync.set('habit', day, 4);
  assert.ok(storageErrors > 0);
  assert.equal(s.sync.snapshot().checkins[0].value, 4);
  s.sync.dispose();
});

test('a success payload with the wrong revision cannot claim that a draft is saved', async () => {
  const sync = createAccountSync({ userId: 'u', initialRecords: [record(5, 5)], request: async () => ({ checkin: record(8, 1) }) });
  sync.set('habit', day, 8); await sync.flush('habit', day);
  assert.equal(sync.snapshot().records[0].revision, 5);
  assert.equal(sync.snapshot().records[0].value, 5);
  assert.equal(sync.snapshot().pendingEntries[0].status, 'error');
  assert.equal(sync.snapshot().checkins[0].value, 8);
  sync.dispose();
});

test('newer conflicting GET before an older PUT response preserves the draft as a conflict', async () => {
  const gate = deferred(); let refreshes = 0;
  const sync = createAccountSync({ userId: 'u', initialRecords: [record(5, 5)], request: async (_path, opts) => {
    const body = JSON.parse(opts.body); await gate.promise;
    return { checkin: record(body.value, body.expected_revision + 1) };
  }, refresh: async () => { refreshes++; } });
  sync.set('habit', day, 8); const pending = sync.flush('habit', day); await tick();
  sync.merge([record(9, 7)]);
  gate.resolve(); await pending;
  assert.equal(sync.snapshot().records[0].revision, 7);
  assert.equal(sync.snapshot().records[0].value, 9);
  assert.equal(sync.snapshot().checkins[0].value, 8);
  assert.equal(sync.snapshot().pendingEntries[0].status, 'conflict');
  assert.equal(refreshes, 1);
  await sync.retry('habit', day);
  assert.equal(sync.snapshot().records[0].revision, 8);
  assert.equal(sync.snapshot().records[0].value, 8);
  assert.equal(sync.snapshot().pendingEntries.length, 0);
  sync.dispose();
});
