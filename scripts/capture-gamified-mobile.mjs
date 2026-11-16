import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c';

async function capture() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/?demo=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // 1. Light Today with Daily Quest banner & 3D buttons
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'pace-gamified-today-light.png'),
    fullPage: false,
  });
  console.log('Saved pace-gamified-today-light.png');

  // 2. Open Habit Modal to verify numeric keypad attributes and clean styling
  await page.locator('.mobile-fab').click();
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'pace-gamified-habit-modal.png'),
    fullPage: false,
  });
  console.log('Saved pace-gamified-habit-modal.png');
  await page.locator('.dialog-sheet button[aria-label="Kapat"]').click();
  await page.waitForTimeout(250);

  // 3. Interact with a habit button
  const habitBtn = page.locator('.btn-3d-green').first();
  if (await habitBtn.isVisible()) {
    await habitBtn.click();
    await page.waitForTimeout(400);
  }

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'pace-gamified-interaction.png'),
    fullPage: false,
  });
  console.log('Saved pace-gamified-interaction.png');

  // 4. Switch to Progress view (Level League banner & stats)
  await page.locator('.mobile-nav button[data-view="progress"]').click();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'pace-gamified-progress.png'),
    fullPage: false,
  });
  console.log('Saved pace-gamified-progress.png');

  // 5. Switch to Groups view
  await page.locator('.mobile-nav button[data-view="groups"]').click();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'pace-gamified-groups.png'),
    fullPage: false,
  });
  console.log('Saved pace-gamified-groups.png');

  // 6. Toggle dark theme and capture Today in dark
  await page.locator('.mobile-nav button[data-view="today"]').click();
  await page.locator('.theme-toggle-btn').click();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'pace-gamified-today-dark.png'),
    fullPage: false,
  });
  console.log('Saved pace-gamified-today-dark.png');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(console.error);
