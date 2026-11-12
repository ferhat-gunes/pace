import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 / mobile-first standard viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Set up mock localStorage with 3 habits, active streak, 2 shields, and group cheers
  await page.addInitScript(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];

    localStorage.setItem('pace_auth_user', JSON.stringify({
      id: 'usr_demo',
      email: 'demo@pace.internal',
      display_name: 'Ferhat Güneş',
    }));

    localStorage.setItem('pace_gamification_v2', JSON.stringify({
      xp: 280,
      gems: 45,
      claimedDates: {},
      streakFreezes: 2,
      usedFreezeDates: {},
      lastActiveDate: today,
    }));

    localStorage.setItem('pace_local_habits', JSON.stringify([
      { id: 'h1', name: 'Kitap Oku', tracking: 'quantity', target: 15, unit: 'sayfa', schedule: { type: 'daily' }, created_at: twoDaysAgo },
      { id: 'h2', name: 'Su İç', tracking: 'quantity', target: 8, unit: 'bardak', schedule: { type: 'daily' }, created_at: twoDaysAgo },
      { id: 'h3', name: 'Günün Günlüğü', tracking: 'check', target: 1, unit: '', schedule: { type: 'weekdays', days: [1,2,3,4,5] }, created_at: twoDaysAgo },
    ]));

    // Checkins: completed 2 days ago, missed 1 yesterday to trigger grace period!
    localStorage.setItem('pace_local_checkins', JSON.stringify([
      { id: 'c1', habit_id: 'h1', habit_date: twoDaysAgo, value: 15, deleted: false },
      { id: 'c2', habit_id: 'h2', habit_date: twoDaysAgo, value: 8, deleted: false },
      { id: 'c3', habit_id: 'h1', habit_date: yesterday, value: 15, deleted: false },
    ]));

    localStorage.setItem('pace_group_cheers', JSON.stringify({
      'grp_demo': {
        'usr_demo': [
          { emoji: '👏', text: 'Harikasın!', sender: 'usr_selin', timestamp: new Date().toISOString() }
        ]
      }
    }));
  });

  console.log('Navigating to live production...');
  await page.goto('https://pace.ferhatgunes.com.tr/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Capture TodayView with Grace Period alert and Streak Shield in TopBar
  await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-grace-period-and-topbar.png' });
  console.log('Captured 1: pace-live-grace-period-and-topbar.png');

  // 2. Click Streak Shield badge in TopBar to open StreakFreezeModal
  const shieldBtn = await page.$('.shield-badge');
  if (shieldBtn) {
    await shieldBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-streak-shield-modal.png' });
    console.log('Captured 2: pace-live-streak-shield-modal.png');
    // Close modal
    const closeBtn = await page.$('.dialog-sheet button[aria-label="Kapat"]');
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 3. Open HabitModal via mobile FAB (.mobile-fab)
  const fab = await page.$('.mobile-fab');
  if (fab) {
    await fab.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-habit-rest-day-modal.png' });
    console.log('Captured 3: pace-live-habit-rest-day-modal.png');
    // Close modal
    const closeHabit = await page.$('.habit-dialog button[aria-label="Kapat"]');
    if (closeHabit) await closeHabit.click();
    await page.waitForTimeout(400);
  }

  // 4. Navigate to GroupsView via mobile nav
  const groupsTab = await page.$('button.nav-item[data-view="groups"]');
  if (groupsTab) {
    await groupsTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-groups-matrix-cheer.png' });
    console.log('Captured 4: pace-live-groups-matrix-cheer.png');

    // Click on Tebrik Et button if present
    const cheerBtn = await page.$('button:has-text("Tebrik Et")');
    if (cheerBtn) {
      await cheerBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-peer-cheer-modal.png' });
      console.log('Captured 5: pace-live-peer-cheer-modal.png');
    }
  }

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
