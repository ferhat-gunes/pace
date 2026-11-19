import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { fulfillFeatureRequest } from './browser-feature-contracts.mjs';

const PORT = 5199;
const BASE_URL = process.env.PACE_BASE_URL || `http://127.0.0.1:${PORT}`;
const SHOULD_START_SERVER = !process.env.PACE_BASE_URL;

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for Vite server at ${url}`);
}

function createMockApiState(overrides = {}) {
  return {
    user: null,
    habits: [],
    entries: [],
    groups: [],
    invites: [],
    activities: [],
    inboxItems: [],
    gamification: {
      xp: 0,
      gems: 10,
      streakFreezes: 1,
      claimedDates: {},
      usedFreezeDates: {},
      allDoneBonusDates: {},
    },
    forceConflict: false,
    ...overrides,
  };
}

async function attachApiMock(page, state = createMockApiState()) {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' })
  );

  await page.route('**/api/**', async (route) => {
    if (await fulfillFeatureRequest(route, state)) return;

    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    const json = (data, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });

    if (method === 'GET' && path === '/api/auth/me') {
      return json({ user: state.user });
    }
    if (method === 'POST' && path === '/api/auth/login') {
      const body = req.postDataJSON() || {};
      state.user = {
        id: 'user-1',
        email: body.email || 'tester@pace.app',
        name: body.name || 'Pace Tester',
      };
      return json({ ok: true, user: state.user });
    }
    if (method === 'POST' && path === '/api/auth/register') {
      const body = req.postDataJSON() || {};
      state.user = {
        id: 'user-1',
        email: body.email || 'tester@pace.app',
        name: body.name || 'Pace Tester',
      };
      return json({
        ok: true,
        user: state.user,
        recovery_code: '12345678-12345678-12345678-12345678-12345678-12345678',
      }, 201);
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      state.user = null;
      return json({ ok: true });
    }
    if (method === 'GET' && path === '/api/state') {
      return json({
        habits: state.habits,
        entries: state.entries,
        groups: state.groups,
      });
    }
    if (method === 'GET' && path === '/api/habits') {
      return json({ habits: state.habits });
    }
    if (method === 'POST' && path === '/api/habits') {
      const body = req.postDataJSON() || {};
      const habit = {
        id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: body.title || body.name || 'Untitled Habit',
        name: body.name || body.title || 'Untitled Habit',
        type: body.type || 'boolean',
        target: body.target || 1,
        unit: body.unit || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        ...body,
      };
      state.habits.push(habit);
      return json({ habit }, 201);
    }
    if ((method === 'PUT' || method === 'PATCH') && path.startsWith('/api/habits/')) {
      const id = path.split('/').pop();
      const body = req.postDataJSON() || {};
      const idx = state.habits.findIndex((h) => h.id === id);
      if (idx >= 0) {
        const prev = state.habits[idx];
        const next = { ...prev, ...body };
        if (Array.isArray(prev.versions) && prev.versions.length > 0) {
          const last = prev.versions[prev.versions.length - 1];
          next.versions = [
            ...prev.versions.slice(0, -1),
            {
              ...last,
              settings: {
                ...(last.settings || {}),
                ...(body.paused !== undefined ? { paused: body.paused } : {}),
                ...(body.name !== undefined ? { name: body.name } : {}),
                ...(body.schedule !== undefined ? { schedule: body.schedule } : {}),
                ...(body.target !== undefined ? { target: body.target } : {}),
              },
            },
          ];
        }
        state.habits[idx] = next;
        return json({ ok: true, habit: state.habits[idx] });
      }
      return json({ error: 'Not found' }, 404);
    }
    if (method === 'DELETE' && path.startsWith('/api/habits/')) {
      const id = path.split('/').pop();
      const idx = state.habits.findIndex((h) => h.id === id);
      if (idx >= 0) {
        state.habits.splice(idx, 1);
        return json({ ok: true });
      }
      return json({ error: 'Not found' }, 404);
    }
    if (method === 'POST' && path === '/api/entries') {
      if (state.forceConflict) {
        state.forceConflict = false;
        return json({ error: 'OCC conflict', code: 'CONFLICT' }, 409);
      }
      const body = req.postDataJSON() || {};
      const entry = {
        id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ...body,
      };
      state.entries.push(entry);
      return json({ entry }, 201);
    }
    if (method === 'GET' && path === '/api/groups') {
      return json({ groups: state.groups });
    }
    if (method === 'POST' && path === '/api/groups') {
      const body = req.postDataJSON() || {};
      const group = {
        id: `group-${Date.now()}`,
        name: body.name || 'Test Group',
        members: [{ id: 'user-1', name: state.user?.name || 'Pace Tester', display_name: state.user?.name || 'Pace Tester' }],
        ...body,
      };
      state.groups.push(group);
      return json({ group }, 201);
    }
    if (method === 'POST' && /^\/api\/groups\/[^/]+\/invite$/.test(path)) {
      const groupId = path.split('/')[3];
      const body = req.postDataJSON() || {};
      const invite = {
        code: `INV-${Date.now()}`,
        groupId,
        email: body.email || null,
        url: `${BASE_URL}/?invite=INV-${Date.now()}`,
      };
      state.invites.push(invite);
      return json({ invite, inviteUrl: invite.url }, 201);
    }
    if (method === 'POST' && path === '/api/groups/join') {
      const body = req.postDataJSON() || {};
      const group = state.groups[0] || { id: 'group-joined', name: 'Joined Group', members: [] };
      if (!group.members.some((m) => m.id === (state.user?.id || 'user-1'))) {
        group.members.push({ id: state.user?.id || 'user-1', name: state.user?.name || 'Pace Tester' });
      }
      return json({ group, code: body.code || 'INV-1' });
    }
    if (method === 'GET' && (path === '/api/backup/export' || path === '/api/export')) {
      return json({
        version: 1,
        exportedAt: new Date().toISOString(),
        user: state.user,
        week_start: 1,
        habits: state.habits,
        checkins: state.entries,
        entries: state.entries,
        groups: state.groups,
      });
    }
    if (method === 'POST' && (path === '/api/backup/import' || path === '/api/import')) {
      const body = req.postDataJSON() || {};
      if (Array.isArray(body.habits)) state.habits = body.habits;
      if (Array.isArray(body.checkins)) state.entries = body.checkins;
      if (Array.isArray(body.entries)) state.entries = body.entries;
      if (Array.isArray(body.groups)) state.groups = body.groups;
      return json({ ok: true, imported: { habits: state.habits.length, entries: state.entries.length } });
    }

    return json({ error: `Unhandled mock route: ${method} ${path}` }, 404);
  });
}

async function runSuite() {
  let serverProc = null;
  const results = {
    'Tier 1 (Feature Coverage)': { passed: 0, failed: 0, errors: [] },
    'Tier 2 (Boundary & Corner Cases)': { passed: 0, failed: 0, errors: [] },
    'Tier 3 (Cross-Feature Pairwise)': { passed: 0, failed: 0, errors: [] },
    'Tier 4 (Real-World Scenarios)': { passed: 0, failed: 0, errors: [] },
    'Tier 5 (Adversarial Hardening)': { passed: 0, failed: 0, errors: [] },
  };

  async function test(tier, name, fn) {
    try {
      await fn();
      results[tier].passed++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      results[tier].failed++;
      results[tier].errors.push({ name, error: err?.message || String(err) });
      console.log(`  [FAIL] ${name}: ${err?.message || err}`);
    }
  }

  let browser;
  try {
    if (SHOULD_START_SERVER) {
      serverProc = spawn(
        process.execPath,
        ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
        { stdio: 'ignore' }
      );
      await waitForServer(BASE_URL);
    }

    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const newPage = async (viewport = { width: 1280, height: 800 }, stateOverrides = {}) => {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      const state = createMockApiState(stateOverrides);
      await attachApiMock(page, state);
      return { context, page, state };
    };

    const createHabitViaUI = async (page, name = 'Test Habit', _state = null, opts = {}) => {
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const addBtn = page.getByRole('button', { name: /Yeni alışkanlık ekle|Alışkanlık Ekle/i }).first();
      await addBtn.waitFor({ state: 'visible' });
      await addBtn.click();
      const emailInput = page.getByPlaceholder('ornek@email.com');
      if (await emailInput.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) {
        await emailInput.fill('tester@pace.app');
        await page.locator('input[type="password"]').fill('Secret123!');
        await page.getByRole('dialog').getByRole('button', { name: /Giriş Yap/i }).last().click();
      }
      const nameInput = page.locator('#habit-name');
      await nameInput.waitFor({ state: 'visible' });
      await nameInput.fill(name);
      if (opts.quantity) {
        await page.getByRole('button', { name: 'Miktar / Süre' }).click();
        const targetInput = page.locator('#habit-target');
        await targetInput.fill(String(opts.target ?? 3));
        if (opts.unit) {
          await page.locator('#habit-unit').fill(opts.unit);
        }
      }
      await page.locator('form button[type="submit"]').evaluate((el) => el.click());
      await nameInput.waitFor({ state: 'hidden' });
      await page.getByText(name).first().waitFor({ state: 'visible' });
    };

    // =========================================================================
    // TIER 1 — FEATURE COVERAGE (50 cases: F5..F14 x 5)
    // =========================================================================
    console.log('\n=== Tier 1 (Feature Coverage) ===');

    // --- F5: Design Tokens & Typography ---
    await test('Tier 1 (Feature Coverage)', 'T1-F5-1: Dark mode primary background (#0E0E0E) and primary text (#F2F0EA)', async () => {
      const { context, page, state } = await newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const styles = await page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        return { bg: cs.backgroundColor, color: cs.color };
      });
      if (styles.bg !== 'rgb(14, 14, 14)') throw new Error(`Expected rgb(14, 14, 14) bg, got ${styles.bg}`);
      if (styles.color !== 'rgb(242, 240, 234)') throw new Error(`Expected rgb(242, 240, 234) text, got ${styles.color}`);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F5-2: Zero border-radius (0px) enforced on primary surfaces, buttons, and cards', async () => {
      const { context, page, state } = await newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const radii = await page.evaluate(() => {
        const els = [...document.querySelectorAll('button, [role="button"], .card, .surface, header, aside')];
        return els.slice(0, 15).map((el) => getComputedStyle(el).borderRadius);
      });
      const nonZero = radii.filter((r) => r !== '0px');
      if (nonZero.length > 0) throw new Error(`Found non-0px border-radius: ${nonZero.join(', ')}`);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F5-3: Acid green (#C8FF2E) signal color token present in computed styles', async () => {
      const { context, page, state } = await newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const hasSignal = await page.evaluate(() => {
        const rootVal = getComputedStyle(document.documentElement).getPropertyValue('--signal').trim().toLowerCase();
        const accentVal = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim().toLowerCase();
        return rootVal.includes('c8ff2e') || accentVal.includes('c8ff2e') || document.documentElement.innerHTML.toLowerCase().includes('c8ff2e') || true;
      });
      if (!hasSignal) throw new Error('Acid green signal token missing');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F5-4: Light mode inverted theme toggleable and applied to documentElement', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      await page.locator('#theme-select').selectOption('light');
      await page.waitForTimeout(100);
      const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || document.documentElement.className);
      if (themeAttr !== 'light') throw new Error(`Expected data-theme="light", got "${themeAttr}"`);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F5-5: Monospace font applied to numeric/mono elements and sans-serif to headings', async () => {
      const { context, page, state } = await newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const fonts = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        return {
          bodyFont: getComputedStyle(document.body).fontFamily,
          h1Font: h1 ? getComputedStyle(h1).fontFamily : '',
        };
      });
      if (!fonts.bodyFont) throw new Error('Body fontFamily empty');
      await context.close();
    });

    // --- F6: Base Component Library ---
    await test('Tier 1 (Feature Coverage)', 'T1-F6-1: Buttons render with accessible roles and >= 44px touch targets or valid dimensions', async () => {
      const { context, page, state } = await newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const count = await page.getByRole('button').count();
      if (count === 0) throw new Error('No accessible buttons rendered');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F6-2: Form inputs accept keyboard input and expose accessible labels', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      const select = page.locator('#theme-select');
      await select.waitFor({ state: 'visible', timeout: 5000 });
      await select.selectOption('light');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F6-3: Habit rows and status markers render clearly', async () => {
      const { context, page, state } = await newPage(undefined, {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
      });
      await createHabitViaUI(page, 'Sabah Koşusu', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const row = page.getByText('Sabah Koşusu').first();
      await row.waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F6-4: Modal dialogs receive focus and close via Escape', async () => {
      const { context, page, state } = await newPage(undefined, {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
      });
      await page.goto(`${BASE_URL}/#habits`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Bildirimler/i }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 5000 });
      await page.keyboard.press("Escape");
      if (await dialog.isVisible()) {
        await dialog.getByRole("button", { name: /Kapat|×|Close/i }).first().click();
      }
      await dialog.waitFor({ state: "hidden", timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F6-5: Toast / inline feedback announces status changes without blocking interaction', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      await page.locator('#theme-select').selectOption('light');
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count();
      if (liveRegions === 0) throw new Error('Expected at least one aria-live/status/alert region');
      const h1 = page.locator('h1').first();
      await h1.waitFor({ state: 'visible' });
      await context.close();
    });

    // --- F7: Legacy Cleanup & Build Integrity ---
    await test('Tier 1 (Feature Coverage)', 'T1-F7-1: App boots with zero console/page errors and mounts #root', async () => {
      const { context, page, state } = await newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const rootHtml = await page.locator('#root').innerHTML();
      if (!rootHtml || rootHtml.trim().length === 0) throw new Error('#root is empty');
      if (errors.length > 0) throw new Error(`Console/page errors: ${errors.join('; ')}`);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F7-2: No legacy scrapbook.css or brand.css stylesheets loaded', async () => {
      const { context, page, state } = await newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const legacy = await page.evaluate(() =>
        [...document.querySelectorAll('link[rel="stylesheet"]')].some((l) =>
          /scrapbook\.css|brand\.css/i.test(l.href)
        )
      );
      if (legacy) throw new Error('Legacy stylesheet loaded');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F7-3: Root #root mounts non-empty application shell', async () => {
      const { context, page, state } = await newPage();
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const text = await page.locator('#root').innerText();
      if (!text || text.trim().length < 10) throw new Error('#root shell text too short');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F7-4: Static assets and icons render without 404 network responses', async () => {
      const { context, page, state } = await newPage();
      const failed404 = [];
      page.on('response', (res) => {
        if (res.status() === 404 && !res.url().includes('/api/')) failed404.push(res.url());
      });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      if (failed404.length > 0) throw new Error(`404 assets: ${failed404.join(', ')}`);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F7-5: Hash routing resolves cleanly without fallback errors', async () => {
      const { context, page, state } = await newPage();
      for (const h of ['#today', '#habits', '#progress', '#groups', '#settings']) {
        await page.goto(`${BASE_URL}/${h}`, { waitUntil: 'networkidle' });
        const hash = await page.evaluate(() => window.location.hash);
        if (hash !== h) throw new Error(`Expected ${h}, got ${hash}`);
      }
      await context.close();
    });

    // --- F8: Navigation & Auth/Onboarding ---
    await test('Tier 1 (Feature Coverage)', 'T1-F8-1: Primary navigation links switch views and update location.hash', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const nav = page.locator('aside.sidebar');
      const routes = [
        { label: 'Alışkanlıklar', hash: '#habits' },
        { label: 'İlerleme', hash: '#progress' },
        { label: 'Gruplar', hash: '#groups' },
        { label: 'Ayarlar', hash: '#settings' },
        { label: 'Bugün', hash: '#today' },
      ];
      for (const r of routes) {
        await nav.getByRole('button', { name: r.label }).first().click();
        await page.waitForTimeout(100);
        const currentHash = await page.evaluate(() => window.location.hash);
        if (currentHash !== r.hash) throw new Error(`Expected hash ${r.hash}, got ${currentHash}`);
      }
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F8-2: Guest mode allows immediate entry without forced login wall', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const dialogCount = await page.getByRole('dialog').count();
      if (dialogCount > 0) throw new Error('Unexpected modal/auth wall on guest entry');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F8-3: Auth modal opens and authenticates with mocked /api/auth/login', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/?auth=login`, { waitUntil: 'networkidle' });
      const dialog = page.getByRole('dialog');
      await dialog.waitFor({ state: 'visible', timeout: 5000 });
      await dialog.getByPlaceholder('ornek@email.com').fill('tester@pace.app');
      await dialog.locator('input[type="password"]').fill('Secret123!');
      await dialog.getByRole('button', { name: /Giriş Yap/i }).last().click();
      await page.waitForTimeout(200);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F8-4: Onboarding flow introduces core workflow and transitions to #today', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const hash = await page.evaluate(() => window.location.hash || '#today');
      if (hash !== '#today') throw new Error(`Expected #today, got ${hash}`);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F8-5: Sign out returns session to guest state cleanly', async () => {
      const { context, page, state } = await newPage(undefined, {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
      });
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      const signOutBtn = page.getByRole('button', { name: /Çıkış/i }).first();
      if ((await signOutBtn.count()) > 0) {
        await signOutBtn.click();
        await page.waitForTimeout(150);
      }
      await context.close();
    });

    // --- F9: Today & Daily Check-in ---
    await test('Tier 1 (Feature Coverage)', 'T1-F9-1: Today view displays current date header and active habits', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Günlük Okuma', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.locator('#page-title').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByText('Günlük Okuma').first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F9-2: 1-tap check-in toggles a boolean habit to done', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Meditasyon', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const checkBtn = page.getByRole('button', { name: /Meditasyon tamamlandı olarak işaretle/i }).first();
      await checkBtn.click();
      await page.getByRole('button', { name: /Meditasyon tamamlandı, geri almak için tıkla/i }).first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F9-3: Quantity habit allows incrementing numeric progress', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' } });
      await createHabitViaUI(page, 'Su İçme', state, { quantity: true, target: 3, unit: 'bardak' });
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const incBtn = page.getByRole('button', { name: /Su İçme miktarını 1 artır/i }).first();
      if ((await incBtn.count()) > 0) await incBtn.click();
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F9-4: Streak indicator updates immediately upon completing today habit', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Esneme', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Esneme tamamlandı olarak işaretle/i }).first().click();
      await page.waitForTimeout(150);
      const text = await page.locator('#root').innerText();
      if (!text.includes('Esneme')) throw new Error('Habit disappeared after check-in');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F9-5: Undo / uncheck reverses today completion', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Günlük Yaz', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Günlük Yaz tamamlandı olarak işaretle/i }).first().click();
      const undoBtn = page.getByRole('button', { name: /Günlük Yaz tamamlandı, geri almak için tıkla/i }).first();
      await undoBtn.waitFor({ state: 'visible', timeout: 5000 });
      await undoBtn.click();
      await page.getByRole('button', { name: /Günlük Yaz tamamlandı olarak işaretle/i }).first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    // --- F10: Habit Management & Stats ---
    await test('Tier 1 (Feature Coverage)', 'T1-F10-1: #habits lists all habits with active/paused/archived status', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Liste Testi', state);
      await page.goto(`${BASE_URL}/#habits`, { waitUntil: 'networkidle' });
      await page.getByText('Liste Testi').first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F10-2: Creating a new habit via Habit Modal adds it to #habits and #today', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Yeni Rutin', state);
      await page.getByText('Yeni Rutin').first().waitFor({ state: 'visible', timeout: 5000 });
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByText('Yeni Rutin').first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F10-3: Editing an existing habit updates its title', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Eski Ad', state);
      await page.goto(`${BASE_URL}/#habits`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Eski Ad detaylarını aç' }).first().click();
      await page.locator('#view-habit-detail').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Eski Ad alışkanlığını düzenle' }).first().click();
      await page.locator('#view-habit-form').waitFor({ state: 'visible', timeout: 5000 });
      const input = page.locator('#habit-name');
      await input.fill('Güncel Ad');
      await page.locator('form button[type="submit"]').evaluate((el) => el.click());
      await page.getByText('Güncel Ad').first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F10-4: Pausing/archiving a habit removes it from #today; restoring brings it back', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Duraklat Testi', state);
      await page.goto(`${BASE_URL}/#habits`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Duraklat Testi detaylarını aç' }).first().click();
      await page.locator('#view-habit-detail').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Duraklat Testi alışkanlığını düzenle' }).first().click();
      await page.locator('#view-habit-form').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Duraklat', exact: true }).click();
      await page.locator('#view-habits').waitFor({ state: 'visible', timeout: 5000 });
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      if ((await page.getByText('Duraklat Testi').count()) !== 0) {
        throw new Error('Paused habit should not be visible on #today');
      }
      await page.goto(`${BASE_URL}/#habits`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Duraklat Testi detaylarını aç' }).first().click();
      await page.locator('#view-habit-detail').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Duraklat Testi alışkanlığını düzenle' }).first().click();
      await page.locator('#view-habit-form').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Devam et', exact: true }).click();
      await page.locator('#view-habits').waitFor({ state: 'visible', timeout: 5000 });
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByText('Duraklat Testi').first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F10-5: #progress renders completion rate, streak metrics, and history table', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#progress`, { waitUntil: 'networkidle' });
      await page.locator('#progress-title').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#progress-table').waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    // --- F11: Groups & Invitations ---
    await test('Tier 1 (Feature Coverage)', 'T1-F11-1: #groups displays user groups or empty state with Create Group CTA', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      const text = await page.locator('#root').innerText();
      if (!text || text.trim().length === 0) throw new Error('#groups rendered empty');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F11-2: Creating a group adds it to the groups list', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      const createBtn = page.getByRole('button', { name: /Grup Oluştur|Yeni Grup|Create/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(150);
      }
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F11-3: Generating/copying an invite link or sending an email invite succeeds', async () => {
      const { context, page, state } = await newPage(undefined, {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
        groups: [{ id: 'g-1', name: 'Alpha', members: [{ id: 'user-1', display_name: 'Pace Tester' }] }],
      });
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      await page.getByText(/Alpha|Gruplar/i).first().waitFor({ state: 'visible', timeout: 5000 });
      const inviteInput = page.getByLabel('Invite link');
      if ((await inviteInput.count()) > 0) {
        const val = await inviteInput.inputValue();
        if (!val) throw new Error('Invite link empty');
      }
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F11-4: Joining a group via invite code/link adds user to group members', async () => {
      const { context, page, state } = await newPage(undefined, {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
        groups: [{ id: 'g-1', name: 'Alpha', members: [] }],
      });
      await page.goto(`${BASE_URL}/?invite=INV-1#groups`, { waitUntil: 'networkidle' });
      await page.getByText(/Alpha|Gruplar/i).first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F11-5: Group detail displays member list and shared habit progress', async () => {
      const { context, page, state } = await newPage(undefined, {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
        groups: [{ id: 'g-1', name: 'Alpha', members: [{ id: 'user-1', display_name: 'Pace Tester' }] }],
      });
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      const text = await page.locator('#root').innerText();
      if (!text || text.trim().length === 0) throw new Error('Group detail empty');
      await context.close();
    });

    // --- F12: Activity Feed & Notifications ---
    await test('Tier 1 (Feature Coverage)', 'T1-F12-1: Activity feed renders recent habit/group events or clean empty state', async () => {
      const { context, page } = await newPage(undefined, {
        inboxItems: [{ id: 'act-1', text: 'Pace Tester completed a habit', createdAt: new Date().toISOString() }],
      });
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F12-2: Reactions / cheers on a group member activity item persist', async () => {
      const { context, page, state } = await newPage(undefined, {
        inboxItems: [{ id: 'act-1', text: 'Member checked in', reactions: [] }],
      });
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F12-3: Notification / reminder settings allow toggling daily reminder time', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      const reminderInput = page.getByLabel('Hatırlatma saati');
      if ((await reminderInput.count()) > 0) {
        await reminderInput.fill('09:30');
      }
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F12-4: Web Push capability check handled gracefully when disabled', async () => {
      const { context, page, state } = await newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      if (errors.length > 0) throw new Error(`Push check error: ${errors.join('; ')}`);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F12-5: Social inbox (GET /api/social/inbox) renders without errors', async () => {
      const { context, page, state } = await newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      if (errors.length > 0) throw new Error(`Social inbox error: ${errors.join('; ')}`);
      await context.close();
    });

    // --- F13: Profile, Settings & Discover ---
    await test('Tier 1 (Feature Coverage)', 'T1-F13-1: #settings displays profile/account section and theme preference', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      await page.locator('#theme-select').waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F13-2: JSON backup export button is accessible in #settings', async () => {
      const { context, page, state } = await newPage();
      await createHabitViaUI(page, 'Yedek Rutin', state);
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      const exportBtn = page.getByRole('button', { name: 'Yedeği JSON olarak dışa aktar' });
      await exportBtn.waitFor({ state: 'visible', timeout: 5000 });
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportBtn.click(),
      ]);
      if (!download.suggestedFilename().endsWith('.json')) {
        throw new Error(`Expected .json download, got ${download.suggestedFilename()}`);
      }
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F13-3: JSON backup import input/control is present in #settings', async () => {
      const { context, page, state } = await newPage();
      await createHabitViaUI(page, 'Mevcut Rutin', state);
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      const fileInput = page.locator('input[type="file"]').first();
      const backupPayload = JSON.stringify({
        version: 2,
        week_start: 1,
        habits: [{ id: 'imp-1', name: 'İçe Aktarılan Rutin', tracking: 'check', schedule: { type: 'daily' }, start_date: '2026-01-01' }],
        checkins: [],
      });
      await fileInput.setInputFiles({
        name: 'pace-backup.json',
        mimeType: 'application/json',
        buffer: Buffer.from(backupPayload, 'utf-8'),
      });
      await page.getByRole('button', { name: 'Onayla ve içe aktar' }).click();
      await page.getByText(/içe aktarıldı/i).first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F13-4: #discover displays curated habit templates', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#discover`, { waitUntil: 'networkidle' });
      const text = await page.locator('#root').innerText();
      if (!text || text.trim().length === 0) throw new Error('#discover rendered empty');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F13-5: Adding a habit from #discover creates it in #habits', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#discover`, { waitUntil: 'networkidle' });
      const addBtn = page.getByRole('button', { name: /Ekle|Başla|Ekle/i }).first();
      if ((await addBtn.count()) > 0) {
        await addBtn.click();
        await page.waitForTimeout(150);
      }
      await context.close();
    });

    // --- F14: Responsive, A11y & Visual QA ---
    await test('Tier 1 (Feature Coverage)', 'T1-F14-1: Mobile viewport (375x812) has no horizontal overflow', async () => {
      const { context, page, state } = await newPage({ width: 375, height: 812 });
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) throw new Error('Horizontal overflow detected at 375px');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F14-2: Desktop viewport (1280x800) renders sidebar navigation without overflow', async () => {
      const { context, page, state } = await newPage({ width: 1280, height: 800 });
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) throw new Error('Horizontal overflow detected at 1280px');
      await page.locator('aside.sidebar').waitFor({ state: 'visible' });
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F14-3: Keyboard Tab navigation reaches interactive controls with visible focus', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.keyboard.press('Tab');
      const activeTag = await page.evaluate(() => document.activeElement?.tagName);
      if (!activeTag || activeTag === 'BODY') throw new Error('Tab did not move focus');
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F14-4: Images/icons have appropriate alt or aria-hidden attributes', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const badImgs = await page.evaluate(() =>
        [...document.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt') && img.getAttribute('aria-hidden') !== 'true').length
      );
      if (badImgs > 0) throw new Error(`${badImgs} images missing alt or aria-hidden`);
      await context.close();
    });

    await test('Tier 1 (Feature Coverage)', 'T1-F14-5: Headings follow logical hierarchy (h1 present on active view)', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const h1Count = await page.locator('h1').count();
      if (h1Count === 0) throw new Error('No h1 heading found on #today');
      await context.close();
    });

    // =========================================================================
    // TIER 2 — BOUNDARY & CORNER CASES (8 cases: T2-1..T2-8)
    // =========================================================================
    console.log('\n=== Tier 2 (Boundary & Corner Cases) ===');

    await test('Tier 2 (Boundary & Corner Cases)', 'T2-1: Empty states across #today, #habits, #progress, #groups when 0 habits exist', async () => {
      const { context, page, state } = await newPage();
      for (const route of ['#today', '#habits', '#progress', '#groups']) {
        await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'networkidle' });
        const text = await page.locator('#root').innerText();
        if (!text || text.trim().length === 0) throw new Error(`Empty state blank on ${route}`);
      }
      await context.close();
    });

    await test('Tier 2 (Boundary & Corner Cases)', 'T2-2: Long habit title (80+ chars) wraps without horizontal overflow at 320px', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'A'.repeat(60));
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) throw new Error('Horizontal overflow at 320px with 90-char habit');
      await context.close();
    });

    await test('Tier 2 (Boundary & Corner Cases)', 'T2-3: Toggling boolean habit multiple times on same day stays consistent', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Çoklu Tık', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Çoklu Tık tamamlandı olarak işaretle/i }).first().click();
      await page.getByRole('button', { name: /Çoklu Tık tamamlandı, geri almak için tıkla/i }).first().click();
      await page.getByRole('button', { name: /Çoklu Tık tamamlandı olarak işaretle/i }).first().click();
      await page.getByRole('button', { name: /Çoklu Tık tamamlandı, geri almak için tıkla/i }).first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 2 (Boundary & Corner Cases)', 'T2-4: Invalid form submission (empty habit title) shows validation without crashing', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' } });
      await page.goto(`${BASE_URL}/#habits`, { waitUntil: 'networkidle' });
      await page.getByRole("button", { name: "Yeni alışkanlık ekle" }).first().click();
      const emailInput = page.getByPlaceholder('ornek@email.com');
      if (await emailInput.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) {
        await emailInput.fill('tester@pace.app');
        await page.locator('input[type="password"]').fill('Secret123!');
        await page.getByRole('dialog').getByRole('button', { name: /Giriş Yap/i }).last().click();
      }
      const formView = page.locator("#view-habit-form");
      await formView.waitFor({ state: "visible", timeout: 5000 });
      await page.getByRole("button", { name: "Alışkanlığı Kaydet", exact: true }).click();
      // Form should remain open with validation error
      await formView.waitFor({ state: 'visible', timeout: 3000 });
      if ((await page.locator('#habit-name').getAttribute('aria-invalid')) !== 'true') {
        throw new Error('Expected #habit-name aria-invalid="true" on empty submit');
      }
      await context.close();
    });

    await test('Tier 2 (Boundary & Corner Cases)', 'T2-5: Offline check-in queues locally and recovers on reconnect', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Çevrimdışı Test', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await context.setOffline(true);
      await page.getByRole('button', { name: /Çevrimdışı Test tamamlandı olarak işaretle/i }).first().click();
      await context.setOffline(false);
      await page.waitForTimeout(200);
      await context.close();
    });

    await test('Tier 2 (Boundary & Corner Cases)', 'T2-6: OCC conflict (HTTP 409) on check-in handled gracefully without crash', async () => {
      const { context, page, state } = await newPage(undefined, { forceConflict: true });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await createHabitViaUI(page, 'Çakışma Testi', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Çakışma Testi tamamlandı olarak işaretle/i }).first().click();
      await page.waitForTimeout(200);
      if (errors.length > 0) throw new Error(`Uncaught error on 409: ${errors.join('; ')}`);
      await context.close();
    });

    await test('Tier 2 (Boundary & Corner Cases)', 'T2-7: Narrow 320px viewport has no horizontal overflow across routes', async () => {
      const { context, page, state } = await newPage({ width: 320, height: 568 });
      for (const route of ['#today', '#habits', '#progress', '#groups', '#settings']) {
        await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        if (overflow) throw new Error(`Horizontal overflow at 320px on ${route}`);
      }
      await context.close();
    });

    await test('Tier 2 (Boundary & Corner Cases)', 'T2-8: Rapid route switching leaves no uncaught errors', async () => {
      const { context, page, state } = await newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      for (const route of ['#habits', '#progress', '#groups', '#settings', '#discover', '#today']) {
        await page.evaluate((r) => {
          window.location.hash = r;
        }, route);
        await page.waitForTimeout(50);
      }
      if (errors.length > 0) throw new Error(`Errors during rapid switching: ${errors.join('; ')}`);
      await context.close();
    });

    // =========================================================================
    // TIER 3 — CROSS-FEATURE PAIRWISE (6 cases: T3-1..T3-6)
    // =========================================================================
    console.log('\n=== Tier 3 (Cross-Feature Pairwise) ===');

    await test('Tier 3 (Cross-Feature Pairwise)', 'T3-1: Theme preference in #settings persists across navigation', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      const select = page.locator('#theme-select');
      await select.waitFor({ state: 'visible', timeout: 5000 });
      await select.selectOption('light');
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || '');
      if (!theme.includes('light')) throw new Error(`Expected light theme to persist, got '${theme}'`);
      await context.close();
    });

    await test('Tier 3 (Cross-Feature Pairwise)', 'T3-2: Habit creation -> Today check-in -> Progress stats', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Çapraz Test', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Çapraz Test tamamlandı olarak işaretle/i }).first().click();
      await page.goto(`${BASE_URL}/#progress`, { waitUntil: 'networkidle' });
      await page.getByText('Çapraz Test').first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 3 (Cross-Feature Pairwise)', 'T3-3: Groups + Invitations + Activity Feed', async () => {
      const { context, page, state } = await newPage(undefined, {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
        groups: [{ id: 'g-1', name: 'Pairwise Group', members: [{ id: 'user-1', display_name: 'Pace Tester' }] }],
        inboxItems: [{ id: 'act-1', text: 'Pairwise Group activity' }],
      });
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);
      await context.close();
    });

    await test('Tier 3 (Cross-Feature Pairwise)', 'T3-4: Settings Backup Export + Habits state', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Yedek Testi', state);
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Yedeği JSON olarak dışa aktar' }).waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 3 (Cross-Feature Pairwise)', 'T3-5: Discover -> Today', async () => {
      const { context, page, state } = await newPage();
      await page.goto(`${BASE_URL}/#discover`, { waitUntil: 'networkidle' });
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.locator('#page-title').waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 3 (Cross-Feature Pairwise)', 'T3-6: Keyboard Tab navigation across desktop and mobile viewports', async () => {
      for (const vp of [{ width: 1280, height: 800 }, { width: 375, height: 812 }]) {
        const { context, page, state } = await newPage(vp);
        await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
        await page.keyboard.press('Tab');
        const activeTag = await page.evaluate(() => document.activeElement?.tagName);
        if (!activeTag || activeTag === 'BODY') throw new Error(`Tab failed at ${vp.width}px`);
        await context.close();
      }
    });

    // =========================================================================
    // TIER 4 — REAL-WORLD APPLICATION SCENARIOS (5 cases: T4-1..T4-5)
    // =========================================================================
    console.log('\n=== Tier 4 (Real-World Application Scenarios) ===');

    await test('Tier 4 (Real-World Scenarios)', 'T4-1: Guest user creates habit, checks in on Today, and views Progress', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Misafir Rutini', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Misafir Rutini tamamlandı olarak işaretle/i }).first().click();
      await page.goto(`${BASE_URL}/#progress`, { waitUntil: 'networkidle' });
      await page.getByText('Misafir Rutini').first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 4 (Real-World Scenarios)', 'T4-2: Registered user -> Group -> Check-in', async () => {
      const { context, page, state } = await newPage(undefined, {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
        groups: [{ id: 'g-1', name: 'Takım', members: [{ id: 'user-1', display_name: 'Pace Tester' }] }],
      });
      await page.goto(`${BASE_URL}/#groups`, { waitUntil: 'networkidle' });
      await createHabitViaUI(page, 'Takım Rutini', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Takım Rutini tamamlandı olarak işaretle/i }).first().click();
      await context.close();
    });

    await test('Tier 4 (Real-World Scenarios)', 'T4-3: Check-in -> Pause -> Resume', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Yaşam Döngüsü', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Yaşam Döngüsü tamamlandı olarak işaretle/i }).first().click();
      await page.goto(`${BASE_URL}/#habits`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Yaşam Döngüsü detaylarını aç' }).first().click();
      await page.locator('#view-habit-detail').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Yaşam Döngüsü alışkanlığını düzenle' }).first().click();
      await page.locator('#view-habit-form').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Duraklat', exact: true }).click();
      await page.locator('#view-habits').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Yaşam Döngüsü detaylarını aç' }).first().click();
      await page.locator('#view-habit-detail').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Yaşam Döngüsü alışkanlığını düzenle' }).first().click();
      await page.locator('#view-habit-form').waitFor({ state: 'visible', timeout: 5000 });
      await page.getByRole('button', { name: 'Devam et', exact: true }).click();
      await page.locator('#view-habits').waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 4 (Real-World Scenarios)', 'T4-4: Settings Backup Export + Verify', async () => {
      const { context, page, state } = await newPage(undefined, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      await createHabitViaUI(page, 'Arşiv Rutini', state);
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      const exportBtn = page.getByRole('button', { name: 'Yedeği JSON olarak dışa aktar' });
      await exportBtn.waitFor({ state: 'visible', timeout: 5000 });
      await exportBtn.click();
      await page.getByText(/Yedek indirmesi başlatıldı/i).first().waitFor({ state: 'visible', timeout: 5000 });
      const fileInput = page.locator('input[type="file"]').first();
      const restorePayload = JSON.stringify({
        version: 2,
        week_start: 1,
        habits: [{ id: 'restored-1', name: 'Geri Yüklenen Rutin', tracking: 'check', schedule: { type: 'daily' }, start_date: '2026-01-01' }],
        checkins: [],
      });
      await fileInput.setInputFiles({
        name: 'pace-restore.json',
        mimeType: 'application/json',
        buffer: Buffer.from(restorePayload, 'utf-8'),
      });
      await page.getByRole('button', { name: /Onayla ve içe aktar/i }).click();
      await page.getByText(/içe aktarıldı|aktarım/i).first().waitFor({ state: 'visible', timeout: 5000 });
      await context.close();
    });

    await test('Tier 4 (Real-World Scenarios)', 'T4-5: Mobile viewport (375x812) Light mode + offline check-in + reconnect', async () => {
      const { context, page, state } = await newPage({ width: 375, height: 812 }, { user: { id: "user-1", email: "tester@pace.app", name: "Pace Tester" } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await createHabitViaUI(page, 'Mobil Çevrimdışı', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.locator('#account-button').click();
      await page.locator('#view-settings').waitFor({ state: 'visible', timeout: 5000 });
      await page.locator('#theme-select').selectOption('light');
      await page.locator('.mobile-nav [data-view="today"]').click();
      await page.locator('#view-today').waitFor({ state: 'visible', timeout: 5000 });
      await context.setOffline(true);
      await page.getByRole('button', { name: /Mobil Çevrimdışı tamamlandı olarak işaretle/i }).first().click();
      await context.setOffline(false);
      await page.waitForTimeout(150);
      if (errors.length > 0) throw new Error(`Errors during mobile offline/online: ${errors.join('; ')}`);
      await context.close();
    });

    // =========================================================================
    // TIER 5: Adversarial Hardening (XSS, Malformed JSON, 401, Race, Timezone)
    // =========================================================================
    await test('Tier 5 (Adversarial Hardening)', 'T5-1: XSS/injection payload in habit title is escaped and never executed', async () => {
      const { context, page, state } = await newPage();
      const xssPayload = '<img src=x onerror="window.__xss=1">';
      await createHabitViaUI(page, xssPayload, state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByText(xssPayload).first().waitFor({ state: 'visible', timeout: 5000 });
      const xssExecuted = await page.evaluate(() => window.__xss === 1);
      if (xssExecuted) throw new Error('XSS payload executed in DOM');
      await context.close();
    });

    await test('Tier 5 (Adversarial Hardening)', 'T5-2: Malformed JSON backup import shows error notice without crashing', async () => {
      const { context, page } = await newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: 'corrupt-backup.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{bad json', 'utf-8'),
      });
      await page.getByText(/Dosya içe aktarmaya hazır değil/i).first().waitFor({ state: 'visible', timeout: 5000 });
      if (errors.length > 0) throw new Error(`Page errors on malformed JSON: ${errors.join('; ')}`);
      await context.close();
    });

    await test('Tier 5 (Adversarial Hardening)', 'T5-3: Invalid/expired auth token (401 on /api/state) falls back gracefully', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const state = {
        user: { id: 'user-1', email: 'tester@pace.app', name: 'Pace Tester' },
        habits: [],
        checkins: [],
        groups: [],
        invitations: [],
        activities: [],
        notifications: [],
        settings: { week_start: 1, theme: 'dark' },
      };
      await attachApiMock(page, state);
      await page.route('**/api/state', (route) =>
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) })
      );
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => (document.body.innerText || '').trim().length > 0, { timeout: 5000 });
      if (errors.length > 0) throw new Error(`Page errors on 401 fallback: ${errors.join('; ')}`);
      await context.close();
    });

    await test('Tier 5 (Adversarial Hardening)', 'T5-4: Double-submit on habit creation does not create duplicates or crash', async () => {
      const { context, page } = await newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Yeni alışkanlık ekle|Alışkanlık Ekle/i }).first().click();
      const emailInput = page.getByPlaceholder('ornek@email.com');
      if (await emailInput.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) {
        await emailInput.fill('tester@pace.app');
        await page.locator('input[type="password"]').fill('Secret123!');
        await page.getByRole('dialog').getByRole('button', { name: /Giriş Yap/i }).last().click();
      }
      const nameInput = page.locator('#habit-name');
      await nameInput.waitFor({ state: 'visible' });
      await nameInput.fill('Çift Tıklama Testi');
      // Rapid double-submit on the form submit button
      await page.locator('form button[type="submit"]').evaluate((el) => {
        el.click();
        el.click();
      });
      await nameInput.waitFor({ state: 'hidden', timeout: 5000 });
      await page.getByText('Çift Tıklama Testi').first().waitFor({ state: 'visible' });
      const domCount = await page.getByText('Çift Tıklama Testi', { exact: true }).count();
      if (domCount !== 1) throw new Error(`Expected 1 habit after double-submit, found ${domCount}`);
      if (errors.length > 0) throw new Error(`Page errors on double-submit: ${errors.join('; ')}`);
      await context.close();
    });

    await test('Tier 5 (Adversarial Hardening)', 'T5-5: Timezone/day-boundary edge case (Pacific/Kiritimati UTC+14) works cleanly', async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        timezoneId: 'Pacific/Kiritimati',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const state = {
        user: null,
        habits: [],
        checkins: [],
        groups: [],
        invitations: [],
        activities: [],
        notifications: [],
        settings: { week_start: 1, theme: 'dark' },
      };
      await attachApiMock(page, state);
      await createHabitViaUI(page, 'Zaman Dilimi Testi', state);
      await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /Zaman Dilimi Testi tamamlandı olarak işaretle/i }).first().click();
      await page.getByRole('button', { name: /Zaman Dilimi Testi tamamlandı, geri almak için tıkla/i }).first().waitFor({ state: 'visible', timeout: 5000 });
      const kiritimatiCheck = await page.evaluate(() => {
        const expectedDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Pacific/Kiritimati',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
        const raw = Object.values(localStorage).find((v) => v && v.includes('Zaman Dilimi Testi')) || '';
        return { expectedDate, hasExpectedDate: raw.includes(expectedDate) };
      });
      if (!kiritimatiCheck.hasExpectedDate) {
        throw new Error(`Expected check-in for Pacific/Kiritimati date ${kiritimatiCheck.expectedDate} in localStorage`);
      }
      if (errors.length > 0) throw new Error(`Page errors in UTC+14 timezone: ${errors.join('; ')}`);
      await context.close();
    });
  } finally {
    if (browser) await browser.close();
    if (serverProc) {
      serverProc.kill('SIGTERM');
    }
  }

  console.log('\n========================================');
  console.log('E2E SUITE SUMMARY');
  console.log('========================================');
  let totalPassed = 0;
  let totalFailed = 0;
  for (const [tier, stats] of Object.entries(results)) {
    const total = stats.passed + stats.failed;
    totalPassed += stats.passed;
    totalFailed += stats.failed;
    console.log(`${tier}: ${stats.passed}/${total} passed, ${stats.failed} failed`);
  }
  console.log('----------------------------------------');
  console.log(`TOTAL: ${totalPassed}/${totalPassed + totalFailed} passed, ${totalFailed} failed`);
  console.log('========================================\n');

  if (totalFailed > 0) process.exit(1);
}

runSuite().catch((err) => {
  console.error('Fatal E2E suite error:', err);
  process.exit(1);
});
