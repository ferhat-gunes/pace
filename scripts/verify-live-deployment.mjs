import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/13b00b72-bfa6-4b17-a5be-b548a715113c';

async function verifyLive() {
  console.log('Testing live deployment on https://pace.ferhatgunes.com.tr/?demo=1 ...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors'],
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  
  // Give Cloudflare Pages ~20 seconds if needed, retry up to 3 times
  let attempts = 0;
  while (attempts < 6) {
    attempts++;
    try {
      console.log(`Attempt ${attempts}: fetching live URL...`);
      await page.goto('https://pace.ferhatgunes.com.tr/?demo=1', { waitUntil: 'networkidle', timeout: 15000 });
      
      const title = await page.title();
      console.log('Live page title:', title);

      // Check if daily quest banner or gamify badges are present
      const questBanner = page.locator('.daily-quest-banner');
      const hasQuest = await questBanner.isVisible();
      console.log('Daily Quest Banner visible on live site:', hasQuest);

      if (hasQuest) {
        await page.screenshot({
          path: path.join(ARTIFACTS_DIR, 'pace-live-gamified-production.png'),
          fullPage: false,
        });
        console.log('🎉 Live verified! Saved pace-live-gamified-production.png');
        await browser.close();
        return;
      }
    } catch (e) {
      console.warn(`Attempt ${attempts} error:`, e.message);
    }
    await new Promise(r => setTimeout(r, 6000));
  }

  await browser.close();
  console.log('Finished live check loop.');
}

verifyLive().catch(console.error);
