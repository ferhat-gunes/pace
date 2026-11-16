import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'], headless: true });
const base = process.env.PACE_BASE_URL || 'http://localhost:5193';
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const day = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; });
  const user = { id: 'owner', email: 'owner@example.test' };
  const group = { id: 'g', name: 'Birlikte Ritim', description: 'Ortak hedef', role: 'owner' };
  const group2 = { id: 'g2', name: 'İkinci Grup', role: 'owner' };
  let groupDeleted = false;
  let members = [{ user_id: 'owner', role: 'owner', display_name: 'Sen' }, { user_id: 'friend', role: 'member', display_name: 'Arkadaş' }, { user_id: 'other', role: 'member', display_name: 'Diğer üye' }];
  let habits = [{ id: 'walk', name: 'Ortak yürüyüş', target: .25, unit: 'km', direction: 'at_least', tracking: 'quantity' }];
  let checkins = [], detailFailure = true, writeFailure = true, revision = 0, conflictOnce = false;
  const writes = [], calls = [], unexpected = [], pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
    const body = req.postData() ? req.postDataJSON() : null;
    calls.push({ path, method, body });
    const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '/api/auth/me') return send({ user });
    if (path === '/api/habits' && method === 'GET') return send({ user, habits: [], checkins: [] });
    if (path === '/api/groups' && method === 'GET') return send({ groups: groupDeleted ? [group2] : [group, group2] });
    if (path === '/api/groups/g2' && method === 'GET') return send({ group: group2, members: [{ user_id: 'owner', display_name: 'Sen', role: 'owner' }], habits: [], checkins: [] });
    if (path === '/api/groups/g/leave' && method === 'POST') { assert.equal(members.length, 1); groupDeleted = true; return send({ ok: true }); }
    if (path === '/api/groups/g' && method === 'GET') {
      if (detailFailure) return send({ error: 'Ayrıntı bağlantısı kesildi' }, 503);
      return send({ group, members, habits, checkins });
    }
    if (path === `/api/groups/g/habits/walk/check-ins/${day}` && method === 'DELETE') {
      assert.equal(body.expected_revision, revision); revision++;
      const checkin = { id: 'c', group_habit_id: 'walk', user_id: 'owner', habit_date: day, value: 0, deleted: 1, revision };
      checkins = [checkin]; return send({ checkin });
    }
    if (path === `/api/groups/g/habits/walk/check-ins/${day}` && method === 'PUT') {
      writes.push(body); assert.equal(body.expected_revision, revision); assert.equal(typeof body.idempotency_key, 'string');
      if (writeFailure) return send({ error: 'Kayıt bağlantısı kesildi' }, 503);
      if (conflictOnce) { conflictOnce = false; revision++; checkins = [{ id: 'c', group_habit_id: 'walk', user_id: 'owner', habit_date: day, value: .5, revision }]; detailFailure = true; return send({ error: 'Kayıt başka cihazda değişti' }, 409); }
      revision++;
      const checkin = { id: 'c', group_habit_id: 'walk', user_id: 'owner', habit_date: day, value: body.value, revision };
      checkins = [checkin]; return send({ checkin });
    }
    if (path === '/api/groups/g/habits' && method === 'POST') { assert.equal(body.name, 'Su'); assert.equal(body.tracking, 'quantity'); assert.equal(body.target, .5); const habit = { ...body, id: 'water' }; habits.push(habit); return send({ habit }, 201); }
    if (path === '/api/groups/g' && method === 'PATCH') { group.name = body.name; group.description = body.description; return send({ ok: true }); }
    if (path === '/api/groups/g/members/other' && method === 'DELETE') { members = members.filter(m => m.user_id !== 'other'); return send({ ok: true }); }
    if (path === '/api/groups/g/transfer' && method === 'POST') { assert.equal(body.new_owner_id, 'friend'); group.role = 'member'; members = members.map(m => ({ ...m, role: m.user_id === 'friend' ? 'owner' : 'member' })); return send({ ok: true, new_owner_id: 'friend' }); }
    unexpected.push(`${method} ${path}`); return send({ error: 'Beklenmeyen test isteği' }, 500);
  });
  await page.goto(base + '/?noworker=1');
  await page.locator('.mobile-nav [data-view="groups"]').click();
  await page.getByRole('alert').filter({ hasText: 'Ayrıntı bağlantısı kesildi' }).waitFor();
  detailFailure = false;
  await page.getByRole('button', { name: 'Grubu yeniden yükle', exact: true }).click();
  await page.getByRole('heading', { name: 'Üyeler ve yönetim' }).waitFor();
  await page.getByRole('tab', { name: 'İkinci Grup', exact: true }).click();
  await page.getByRole('heading', { name: 'İkinci Grup', exact: true }).waitFor();
  await page.locator('.mobile-nav [data-view="settings"]').click();
  await page.locator('.mobile-nav [data-view="groups"]').click();
  assert.equal(await page.getByRole('tab', { name: 'İkinci Grup', exact: true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name: 'Birlikte Ritim', exact: true }).click();
  await page.getByRole('button', { name: /Ortak yürüyüş, .*Kaydı düzenle/ }).first().waitFor();
  assert.equal(await page.getByRole('button', { name: /Ortak yürüyüş, .*Kaydı düzenle/ }).count() > 0, true);
  const row = page.locator('tr').filter({ has: page.getByRole('rowheader', { name: 'Arkadaş', exact: true }) });
  assert.equal(await row.getByRole('button').count(), 0, 'members cannot change other member records');
  await page.getByRole('button', { name: /Ortak yürüyüş, .*Kaydı düzenle/ }).last().click();
  await page.getByRole('textbox', { name: 'Kaydedilen miktar (km)' }).fill('0.25');
  await page.getByRole('button', { name: 'Grup kaydını kaydet', exact: true }).click();
  await page.getByRole('dialog').getByRole('alert').filter({ hasText: 'Kayıt bağlantısı kesildi' }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Kaydedilen miktar (km)' }).inputValue(), '0.25');
  writeFailure = false;
  await page.getByRole('button', { name: 'Grup kaydını kaydet', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(writes.length, 2); assert.equal(writes[0].idempotency_key, writes[1].idempotency_key, 'retry reuses ambiguous attempt key');
  assert.equal(writes[1].value, .25);
  conflictOnce = true;
  await page.getByRole('button', { name: /Ortak yürüyüş, .*Kaydı düzenle/ }).last().click();
  await page.getByRole('textbox', { name: 'Kaydedilen miktar (km)' }).fill('0,75');
  await page.getByRole('button', { name: 'Grup kaydını kaydet', exact: true }).click();
  await page.getByRole('dialog').getByRole('alert').filter({ hasText: /Girdiğin değer korundu/ }).waitFor();
  assert.equal(await page.getByRole('textbox', { name: 'Kaydedilen miktar (km)' }).inputValue(), '0,75');
  assert.equal(await page.getByRole('button', { name: 'Grup kaydını kaydet', exact: true }).isDisabled(), true);
  assert.equal(writes.length, 3, 'conflict cannot silently overwrite another device');
  detailFailure = false;
  await page.getByRole('button', { name: 'Güncel kaydı yükle', exact: true }).click();
  await page.getByText(/Sunucudaki güncel değer: 0.5/).waitFor();
  await page.getByRole('button', { name: 'Grup kaydını kaydet', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(writes[3].expected_revision, 2);
  assert.equal(writes[3].value, .75);
  assert.notEqual(writes[3].idempotency_key, writes[2].idempotency_key);
  await page.getByRole('button', { name: /Ortak yürüyüş, .*Kaydı düzenle/ }).last().click();
  await page.getByRole('button', { name: 'Kaydı kaldır', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(checkins[0].deleted, 1);
  await page.getByRole('button', { name: /Ortak yürüyüş, .*Kaydı düzenle/ }).last().click();
  await page.getByRole('textbox', { name: 'Kaydedilen miktar (km)' }).fill('0.2');
  await page.getByRole('button', { name: 'Grup kaydını kaydet', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(writes[4].expected_revision, 4, 'new record uses tombstone revision');
  assert.equal(checkins[0].value, .2);

  await page.getByRole('button', { name: 'Ortak alışkanlık ekle', exact: true }).click();
  await page.getByRole('textbox', { name: 'Alışkanlık Adı', exact: true }).fill('Su');
  await page.getByRole('combobox', { name: 'Takip biçimi' }).selectOption('quantity');
  await page.getByRole('spinbutton', { name: 'Günlük hedef' }).fill('0.5');
  await page.getByRole('textbox', { name: 'Birim', exact: true }).fill('litre');
  await page.getByRole('button', { name: 'Ortak alışkanlığı kaydet', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByRole('cell', { name: /Su/ }).first().waitFor();
  await page.getByRole('button', { name: 'Grubu düzenle', exact: true }).click();
  await page.getByRole('textbox', { name: 'Grup Adı', exact: true }).fill('Yeni Ritim');
  await page.getByRole('button', { name: 'Değişiklikleri kaydet', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByRole('heading', { name: 'Yeni Ritim', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Üyeyi çıkar', exact: true }).last().click();
  await page.getByRole('dialog').getByText(/kayıtları silinecek/).waitFor();
  await page.getByRole('button', { name: 'Onayla', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Liderliği devret', exact: true }).click();
  await page.getByRole('dialog').getByText(/liderlik yetkilerini kaybedeceksin/).waitFor();
  await page.getByRole('button', { name: 'Onayla', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('button', { name: 'Ortak alışkanlık ekle', exact: true }).count(), 0);
  group.role = 'owner'; members = [{ user_id: 'owner', role: 'owner', display_name: 'Sen' }];
  await page.reload();
  await page.locator('.mobile-nav [data-view="groups"]').click();
  await page.getByRole('button', { name: 'Gruptan ayrıl', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Gruptan ayrıl', exact: true }).click();
  await page.getByRole('dialog').getByText(/Grubun tek üyesisin/).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Onayla', exact: true }).isDisabled(), true);
  await page.getByRole('textbox', { name: 'Onaylamak için grup adını yaz: Yeni Ritim', exact: true }).fill('Yeni Ritim');
  await page.getByRole('button', { name: 'Onayla', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(groupDeleted, true);
  assert.equal(await page.getByRole('tab', { name: 'Yeni Ritim', exact: true }).count(), 0);
  assert.deepEqual(unexpected, []); assert.deepEqual(pageErrors, []);
  console.log('PASS: group detail retry, own-record permissions, failed write/retry idempotency, fractional shared habit, edit, kick, transfer, selection persistence and last-owner deletion confirmation, 409 refresh/retry with retained comma-decimal draft, remove/re-enter via tombstone revision');
} finally { await browser.close(); }
