import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(8000);
  const user = { id: 'backup-user', email: 'backup@example.test' };
  const habit = { id: 'backup-habit', name: 'Okuma', tracking: 'quantity', direction: 'at_least', unit: 'sayfa', target: 10, schedule: { type: 'daily' }, progression: { enabled: false, step: 0 }, debt: { enabled: false }, start_date: '2026-01-01', versions: [] };
  let habits = [habit], records = [], imports = 0, rejectImport = true, deletes = 0;
  const unknown = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    let status = 200, body;
    if (path === '/api/habits' && req.method() === 'GET') body = { user, habits, checkins: records, week_start: 1 };
    else if (path === '/api/groups' && req.method() === 'GET') body = { groups: [] };
    else if (path === '/api/export' && req.method() === 'GET') body = { user: { ...user, token: 'DO-NOT-EXPORT', recovery_code: 'DO-NOT-EXPORT' }, habits, checkins: records, week_start: 1 };
    else if (path === '/api/import' && req.method() === 'POST') {
      imports++;
      if (rejectImport) { status = 500; body = { error: 'İçe aktarma testi: geçici hata' }; }
      else { const data = req.postDataJSON(); habits = data.habits; records = data.checkins; body = { ok: true, habits_count: habits.length, checkins_count: records.length, skipped_count: 0 }; }
    } else if (path === '/api/account' && req.method() === 'DELETE') { deletes++; status = 500; body = { error: 'Silme testi: sunucu hatası' }; }
    else { unknown.push(req.method() + ' ' + path); status = 400; body = { error: 'Unexpected request' }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto((process.env.PACE_BASE_URL || 'http://localhost:5173') + '/?noworker=1');
  await page.locator('#view-today').waitFor();
  await page.locator('.mobile-nav [data-view="settings"]').click();
  await page.locator('#view-settings').waitFor();
  const file = { name: 'pace.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ habits: [{ ...habit, name: 'Yedekten gelen rutin' }], checkins: [{ habit_id: habit.id, habit_date: '2026-01-02', value: 10 }], week_start: 1 })) };
  await page.locator('#backup-upload-input').setInputFiles(file);
  await page.getByRole('heading', { name: 'Yedeği içe aktarmadan önce', exact: true }).waitFor();
  assert.equal(imports, 0, 'choosing a file must not mutate the account');
  await page.getByRole('button', { name: 'İçe aktarmaktan vazgeç', exact: true }).click();
  assert.equal(imports, 0);
  await page.locator('#backup-upload-input').setInputFiles(file);
  await page.getByRole('button', { name: 'Onayla ve içe aktar', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'İçe aktarma testi: geçici hata' }).waitFor();
  assert.equal(imports, 1);
  await page.getByRole('heading', { name: 'Yedeği içe aktarmadan önce', exact: true }).waitFor();
  rejectImport = false;
  await page.getByRole('button', { name: 'Onayla ve içe aktar', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '1 alışkanlık ve 1 günlük kayıt içe aktarıldı' }).waitFor();
  assert.equal(imports, 2);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Yedeği JSON olarak dışa aktar', exact: true }).click()]);
  const data = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(JSON.stringify(data).includes('DO-NOT-EXPORT'), false);
  assert.equal(data.habits[0].name, 'Yedekten gelen rutin');
  await page.getByRole('button', { name: 'Hesabı Sil', exact: true }).click();
  const deleteButton = page.getByRole('button', { name: 'Evet, Kalıcı Olarak Sil', exact: true });
  assert.equal(await deleteButton.isDisabled(), true);
  await page.locator('#delete-phrase').fill('SİL');
  await deleteButton.click();
  await page.getByRole('alert').filter({ hasText: 'Hesap silme başarısız' }).waitFor();
  assert.equal(deletes, 1);
  assert.equal(await page.getByText('Hesabın ve ona bağlı veriler silindi.', { exact: true }).count(), 0);
  assert.deepEqual(unknown, []); assert.deepEqual(errors, []);
  console.log('PASS: backup preview/cancel/confirm, failed import retry, safe download, explicit deletion confirmation and failure');
} finally { await browser.close(); }
