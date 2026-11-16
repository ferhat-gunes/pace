import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const base = process.env.PACE_BASE_URL || 'http://localhost:5173';
try {
  const page = await browser.newPage();
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  let owner = 'a', revision = 0, value = 0, malformed = false, conflict = false, rejectPreference = false, week = 1, futureFixture = false;
  let holdGet = null, enteredGet = null, holdPatch = null, patchEntered = null;
  const writes = [], patches = [];
  const day = new Date().toLocaleDateString('en-CA');
  const futureDate = new Date(day + 'T12:00:00'); futureDate.setDate(futureDate.getDate() + 7); const future = futureDate.toLocaleDateString('en-CA');
  const laterDate = new Date(day + 'T12:00:00'); laterDate.setDate(laterDate.getDate() + 14); const later = laterDate.toLocaleDateString('en-CA');
  const habit = id => ({ id: 'habit-' + id, name: 'Habit ' + id, tracking: 'quantity', direction: 'at_least', target: 100, unit: 'dk', start_date: '2026-01-01', schedule: { type: 'daily' }, progression: { enabled: false }, debt: { enabled: false } });
  await page.route('**/sync-harness', route => route.fulfill({ contentType: 'text/html', body: '<html><body><div id="harness"></div></body></html>' }));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
    let status = 200, response;
    if (path === '/api/habits' && method === 'GET') {
      const capturedOwner = owner;
      response = { user: { id: owner, email: owner + '@example.test', week_start: week }, habits: [futureFixture ? { ...habit(owner), versions: [{ effective_from: '2026-01-01', settings: { ...habit(owner), paused: false, archived_at: null } }, { effective_from: future, settings: { ...habit(owner), target: 200, paused: false, archived_at: null } }] } : habit(owner)], checkins: revision ? [{ id: 'record-' + owner, habit_id: 'habit-' + owner, habit_date: day, value, revision, deleted: 0 }] : [] };
      if (holdGet) { const gate = holdGet; holdGet = null; enteredGet?.resolve(); await gate.promise; }
      assert.equal(response.user.id, capturedOwner);
    } else if (path === '/api/groups' && method === 'GET') response = { groups: [] };
    else if (/\/check-ins\//.test(path) && ['PUT', 'DELETE'].includes(method)) {
      const body = req.postDataJSON(); writes.push({ path, method, ...body });
      assert.ok(body.idempotency_key); assert.equal(typeof body.expected_revision, 'number');
      if (malformed) { malformed = false; response = { ok: true }; }
      else if (conflict) { conflict = false; revision++; value = 50; status = 409; response = { error: 'Changed elsewhere' }; }
      else if (body.expected_revision !== revision) { status = 409; response = { error: 'Stale revision' }; }
      else { revision++; value = method === 'DELETE' ? 0 : body.value; response = { checkin: { id: 'record-' + owner, habit_id: 'habit-' + owner, habit_date: day, value, revision, deleted: Number(method === 'DELETE') } }; }
    } else if (path === '/api/account/preferences' && method === 'PATCH') {
      if (rejectPreference) { status = 500; response = { error: 'Preference rejected' }; } else { week = req.postDataJSON().week_start; response = { ok: true }; }
    } else if (path === '/api/habits/habit-b' && method === 'PATCH') {
      patches.push(req.postDataJSON());
      if (holdPatch) { const gate = holdPatch; holdPatch = null; patchEntered?.resolve(); await gate.promise; }
      response = { ok: true };
    } else throw new Error('Unexpected API contract: ' + method + ' ' + path);
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
  });
  async function mount() {
    await page.goto(base + '/sync-harness');
    await page.evaluate(async () => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { useHabits } = await import('/src/state/useHabits.js');
      function Harness() { window.hook = useHabits(); return React.createElement('p', null, window.hook.user?.id || 'loading'); }
      createRoot(document.getElementById('harness')).render(React.createElement(Harness));
    });
    await page.waitForFunction(() => window.hook && !window.hook.loading && window.hook.user);
  }
  await mount();
  await page.evaluate(() => { for (let i = 0; i < 10; i++) window.hook.logCheckin('habit-a', n => n + 1); });
  await page.waitForFunction(() => window.hook.checkins[0]?.value === 10 && !window.hook.pendingEntries.length);
  assert.equal(writes.length, 1); assert.equal(value, 10);
  // Capture an old GET, commit a new PUT, then return the old GET.
  const getGate = deferred(); holdGet = getGate; enteredGet = deferred();
  await page.evaluate(() => { window.hook.loadData(); }); await enteredGet.promise;
  await page.evaluate(() => window.hook.logCheckin('habit-a', 42));
  await page.waitForFunction(() => window.hook.checkins[0]?.value === 42 && !window.hook.pendingEntries.length);
  getGate.resolve(); await page.waitForFunction(() => window.hook.syncState === 'Güncel');
  assert.equal(await page.evaluate(() => window.hook.checkins[0].value), 42);
  // A successful preference write must survive an older in-flight GET snapshot.
  const prefGate = deferred(); holdGet = prefGate; enteredGet = deferred();
  await page.evaluate(() => { window.hook.loadData(); }); await enteredGet.promise;
  await page.evaluate(() => window.hook.updateWeekStart(0));
  prefGate.resolve(); await page.waitForFunction(() => window.hook.syncState === 'Güncel');
  assert.deepEqual(await page.evaluate(() => [window.hook.weekStart, window.hook.user.week_start]), [0, 0]);
  conflict = true;
  await page.evaluate(() => window.hook.logCheckin('habit-a', 60));
  await page.waitForFunction(() => window.hook.pendingEntries[0]?.status === 'conflict');
  assert.equal(await page.evaluate(() => window.hook.checkins[0].value), 60);
  await page.evaluate(() => window.hook.retryEntry('habit-a'));
  await page.waitForFunction(() => !window.hook.pendingEntries.length);
  assert.equal(value, 60);
  // An old account load cannot install its data after a new account is activated.
  const old = deferred(); holdGet = old; enteredGet = deferred();
  await page.evaluate(() => { window.hook.loadData(); }); await enteredGet.promise;
  owner = 'b'; revision = 0; value = 0;
  await page.evaluate(async () => { window.hook.setUser({ id: 'b', email: 'b@example.test' }); await window.hook.loadData(); });
  old.resolve();
  await page.waitForTimeout(50);
  assert.deepEqual(await page.evaluate(() => [window.hook.user.id, window.hook.habits[0].id]), ['b', 'habit-b']);
  malformed = true;
  await page.evaluate(() => window.hook.logCheckin('habit-b', 7));
  await page.waitForFunction(() => window.hook.pendingEntries[0]?.status === 'error');
  assert.equal(await page.evaluate(() => window.hook.checkins[0].value), 7);
  const writeCount = writes.length;
  await mount();
  await page.waitForFunction(() => window.hook.pendingEntries[0]?.restored);
  assert.equal(await page.evaluate(() => window.hook.checkins[0].value), 7);
  await page.waitForTimeout(350); assert.equal(writes.length, writeCount);
  await page.evaluate(() => window.hook.retryEntry('habit-b'));
  await page.waitForFunction(() => !window.hook.pendingEntries.length);
  assert.equal(value, 7);
  rejectPreference = true;
  assert.equal(await page.evaluate(async () => { try { await window.hook.updateWeekStart(1); return false; } catch { return true; } }), true);
  assert.equal(await page.evaluate(() => window.hook.weekStart), 0);
  const patchGate = deferred(); holdPatch = patchGate; patchEntered = deferred();
  await page.evaluate(() => { window.archivePromise = window.hook.archiveHabit('habit-b'); window.restorePromise = window.hook.restoreHabit('habit-b'); });
  await patchEntered.promise; assert.equal(patches.length, 1);
  patchGate.resolve();
  await page.evaluate(() => Promise.all([window.archivePromise, window.restorePromise]));
  assert.equal(patches.length, 2);
  assert.ok(patches[0].archived_at); assert.equal(patches[1].archived_at, null);
  assert.equal(await page.evaluate(() => window.hook.habits[0].archived_at), null);
  // Partial lifecycle changes inherit today's rule and retain scheduled future snapshots.
  futureFixture = true;
  await page.evaluate(() => window.hook.loadData());
  await page.evaluate(today => window.hook.updateHabit('habit-b', { paused: true, effective_from: today }), day);
  assert.deepEqual(await page.evaluate(future => {
    const h = window.hook.habits[0], scheduled = h.versions.find(v => v.effective_from === future);
    return [h.target, h.paused, scheduled.settings.target, scheduled.settings.paused];
  }, future), [100, true, 200, false]);
  await page.evaluate(later => window.hook.updateHabit('habit-b', { target: 300, effective_from: later }), later);
  assert.deepEqual(await page.evaluate(later => { const h = window.hook.habits[0]; return [h.target, h.paused, h.versions.find(v => v.effective_from === later).settings.target]; }, later), [100, true, 300]);
  // Only an explicitly confirmed account-deletion flow may discard pending drafts.
  malformed = true;
  await page.evaluate(() => window.hook.logCheckin('habit-b', 99));
  await page.waitForFunction(() => window.hook.pendingEntries[0]?.status === 'error');
  assert.equal(await page.evaluate(() => { try { window.hook.clearLocalData(); return false; } catch { return true; } }), true);
  await page.evaluate(() => window.hook.clearLocalData({ discardPending: true }));
  assert.equal(await page.evaluate(() => window.hook.pendingEntries.length), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('pace_entry_drafts_v2:b')), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('pace_cache_v2:b')), null);
  assert.deepEqual(pageErrors, []);
  console.log('PASS actual React hook: rapid intent, stale GET/PUT, conflict retry, account switch, restored drafts, malformed success, rejected preferences, serialized archive/undo, preference GET race, future-effective snapshots, explicit account-deletion cleanup');
} finally { await browser.close(); }
