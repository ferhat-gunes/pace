import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('pace_auth_user', JSON.stringify({
      id: 'usr_demo',
      email: 'demo@pace.internal',
      display_name: 'Ferhat Güneş',
    }));

    localStorage.setItem('pace_gamification_v2', JSON.stringify({
      xp: 320,
      gems: 50,
      streakFreezes: 2,
    }));

    // Mock 2-member group to trigger Triad Catalyst + Weekly Matrix
    localStorage.setItem('pace_local_groups', JSON.stringify([
      { id: 'grp_team', name: 'Sabah Savaşçıları 🌅', description: 'Erken kalkıp odaklananlar' }
    ]));

    localStorage.setItem('pace_group_cheers', JSON.stringify({
      'grp_team': {
        'usr_demo': [{ emoji: '👏', text: 'Harikasın!', sender: 'usr_selin' }],
        'usr_can': [{ emoji: '🔥', text: 'Aynen devam!', sender: 'usr_demo' }],
      }
    }));
  });

  console.log('Navigating directly to live site...');
  await page.goto('https://pace.ferhatgunes.com.tr/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Click on Groups tab in mobile navigation bar
  console.log('Clicking visible mobile Groups nav button...');
  await page.click('.mobile-nav button[data-view="groups"]');
  await page.waitForTimeout(1000);

  // If "İlk Grubunu Kur +" is visible, click it and create a group
  const createBtn = await page.$('button:has-text("İlk Grubunu Kur +")') || await page.$('button:has-text("Grup Kur +")');
  if (createBtn) {
    console.log('Opening group creation modal...');
    await createBtn.click();
    await page.waitForTimeout(500);

    const nameInput = await page.$('input[placeholder="Örn: Sabah Koşucuları"]');
    if (nameInput) {
      await nameInput.fill('Güneş Takımı ☀️');
      await page.waitForTimeout(200);
      const submitBtn = await page.$('button[type="submit"]') || await page.$('button:has-text("Grup Oluştur")');
      if (submitBtn) {
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }
    }
  }

  await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-groups-matrix.png' });
  console.log('Captured: pace-live-groups-matrix.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
