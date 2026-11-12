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

  page.on('pageerror', err => {
    console.error('PAGE ERROR DETECTED:', err.message, err.stack);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text());
  });

  console.log('Navigating to live production with ?demo=1...');
  await page.goto('https://pace.ferhatgunes.com.tr/?demo=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Switch to Groups tab
  console.log('Switching to Groups tab...');
  await page.click('.mobile-nav button[data-view="groups"]');
  await page.waitForTimeout(1500);

  // Capture Groups view showing Weekly Matrix Table with Dayanışma column!
  await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-demo-groups-matrix.png' });
  console.log('Captured: pace-live-demo-groups-matrix.png');

  // Click on Tebrik Et button for a member
  const cheerBtn = await page.$('button:has-text("Tebrik Et")');
  if (cheerBtn) {
    console.log('Clicking Tebrik Et button...');
    await cheerBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c/pace-live-demo-cheer-modal.png' });
    console.log('Captured: pace-live-demo-cheer-modal.png');
  }

  await browser.close();
  console.log('Done capturing live demo groups & cheers!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
