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
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const demoState = {
      habits: [
        { id: 'h1', name: 'Kitap Oku', tracking: 'quantity', target: 15, unit: 'sayfa', schedule: { type: 'daily' }, start_date: yesterday },
        { id: 'h2', name: 'Su İç', tracking: 'quantity', target: 8, unit: 'bardak', schedule: { type: 'daily' }, start_date: yesterday }
      ],
      checkins: [
        { id: 'c1', habit_id: 'h1', habit_date: today, value: 15, deleted: 0 },
        { id: 'c2', habit_id: 'h2', habit_date: today, value: 8, deleted: 0 }
      ],
      groups: [
        {
          id: 'grp_sabah',
          name: 'Sabah Savaşçıları 🌅',
          description: 'Erken kalkıp birlikte odaklanan ekip',
          role: 'owner',
          member_count: 2,
          created_at: yesterday
        }
      ],
      group_details: {
        'grp_sabah': {
          group: {
            id: 'grp_sabah',
            name: 'Sabah Savaşçıları 🌅',
            description: 'Erken kalkıp birlikte odaklanan ekip',
            role: 'owner',
            member_count: 2,
            created_at: yesterday
          },
          members: [
            { id: 'm1', user_id: 'usr_demo', display_name: 'Sen (Lider)', role: 'owner' },
            { id: 'm2', user_id: 'usr_selin', display_name: 'Selin Yılmaz', role: 'member' }
          ],
          habits: [
            { id: 'gh1', name: 'Erken Kalkış (07:00)', tracking: 'check', target: 1 }
          ],
          checkins: [
            { id: 'gc1', group_id: 'grp_sabah', habit_id: 'gh1', user_id: 'usr_demo', habit_date: today, value: 1 },
            { id: 'gc2', group_id: 'grp_sabah', habit_id: 'gh1', user_id: 'usr_selin', habit_date: today, value: 1 }
          ]
        }
      }
    };

    localStorage.setItem('pace_demo_state', JSON.stringify(demoState));
    localStorage.setItem('pace_gamification_v2', JSON.stringify({
      xp: 350,
      gems: 50,
      streakFreezes: 2,
      usedFreezeDates: {},
      lastActiveDate: today,
    }));
    localStorage.setItem('pace_group_cheers', JSON.stringify({
      'grp_sabah': {
        'usr_demo': [{ emoji: '👏', text: 'Harikasın!', sender: 'usr_selin' }],
        'usr_selin': [{ emoji: '🔥', text: 'Aynen devam!', sender: 'usr_demo' }]
      }
    }));
  });

  console.log('Navigating to live production...');
  await page.goto('https://pace.ferhatgunes.com.tr/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Switch to Groups view
  console.log('Switching to Groups tab...');
  await page.click('.mobile-nav button[data-view="groups"]');
  await page.waitForTimeout(1000);

  // Capture Groups view showing Triad Catalyst Card + Group Synergy Banner + Matrix Table + Tebrik Et buttons
  await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-groups-synergy-and-triad.png' });
  console.log('Captured: pace-live-groups-synergy-and-triad.png');

  // Click on Tebrik Et button for Selin Yılmaz
  const cheerBtn = await page.$('button:has-text("Tebrik Et")');
  if (cheerBtn) {
    console.log('Opening Cheer reaction modal...');
    await cheerBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-cheer-reaction-modal.png' });
    console.log('Captured: pace-live-cheer-reaction-modal.png');
  }

  await browser.close();
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
