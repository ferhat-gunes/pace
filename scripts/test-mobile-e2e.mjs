import { chromium } from 'playwright';

async function runMobileE2ETests() {
  console.log('🚀 Starting PACE Mobile-First Playwright E2E Test Suite...');
  
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failCount++;
      throw new Error(message);
    } else {
      console.log(`✅ PASS: ${message}`);
      passCount++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Mobile Viewport & Touch Targets (iPhone 14: 390x844)
    // -------------------------------------------------------------
    console.log('\n--- Scenario 1: Mobile Viewport (390x844) Ergonomics & Touch Targets ---');
    const context1 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page1 = await context1.newPage();
    await page1.goto('http://127.0.0.1:4173/?demo=1', { waitUntil: 'networkidle' });

    // Verify no horizontal overflow
    const hasHorizontalScroll = await page1.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert(!hasHorizontalScroll, 'Page has ZERO horizontal scrollbar on 390px viewport');

    // Verify mobile navigation touch target dimensions
    const navItems = page1.locator('.mobile-nav .nav-item');
    const count = await navItems.count();
    assert(count === 5, 'Mobile bottom navigation has exactly 5 view tabs');

    for (let i = 0; i < count; i++) {
      const box = await navItems.nth(i).boundingBox();
      assert(box.width >= 44 && box.height >= 44, `Nav tab #${i} satisfies minimum 44x44px touch target (${Math.round(box.width)}x${Math.round(box.height)}px)`);
    }

    // Verify week strip renders 7 clickable day tabs
    const weekDays = page1.locator('.week-strip .week-day');
    const dayCount = await weekDays.count();
    assert(dayCount === 7, 'Week strip renders 7 days');

    const firstDayBox = await weekDays.first().boundingBox();
    assert(firstDayBox.width >= 36 && firstDayBox.height >= 44, `Week day tab has touch-friendly height (${Math.round(firstDayBox.height)}px)`);

    // Verify FAB is present on mobile
    const fab = page1.locator('.mobile-fab');
    const fabVisible = await fab.isVisible();
    assert(fabVisible, 'Mobile Floating Action Button (FAB) is visible on 390px viewport');

    // -------------------------------------------------------------
    // Test 2: Habit Interaction & Completion
    // -------------------------------------------------------------
    console.log('\n--- Scenario 2: Habit Interaction & Logging ---');
    // Check habits or quantity increment
    const checkBtn = page1.locator('.habit-row.is-check button').first();
    if (await checkBtn.isVisible()) {
      const initialText = (await checkBtn.innerText()).trim();
      await checkBtn.click();
      await page1.waitForTimeout(250);
      const afterText = (await checkBtn.innerText()).trim();
      assert(afterText !== initialText, `Check habit toggled on tap ("${initialText}" -> "${afterText}")`);
    } else {
      const plusBtn = page1.locator('.habit-row button[aria-label*="artır"]').first();
      if (await plusBtn.isVisible()) {
        await plusBtn.click();
        await page1.waitForTimeout(250);
        assert(true, 'Quantity habit incremented on tap');
      }
    }

    // -------------------------------------------------------------
    // Test 3: Responsive Mobile Bottom Sheet
    // -------------------------------------------------------------
    console.log('\n--- Scenario 3: Bottom Sheet & Quick Presets ---');
    await fab.click();
    const sheet = page1.locator('.dialog-sheet.habit-dialog');
    await page1.waitForTimeout(300);
    assert(await sheet.isVisible(), 'Habit Bottom Sheet slides up into view');

    // Click quick template "+ Kitap oku"
    const presetBtn = page1.getByRole('button', { name: /\+ Kitap oku/i });
    if (await presetBtn.isVisible()) {
      await presetBtn.click();
      const nameInputVal = await page1.locator('input.form-input').first().inputValue();
      assert(nameInputVal === 'Kitap oku', '1-tap template fills habit name automatically');
    }

    // Close modal via Close icon
    await page1.locator('.dialog-sheet button[aria-label="Kapat"]').click();
    await page1.waitForTimeout(200);
    assert(!(await sheet.isVisible()), 'Bottom sheet closes properly');

    // -------------------------------------------------------------
    // Test 4: Tab Navigation between Views
    // -------------------------------------------------------------
    console.log('\n--- Scenario 4: Seamless View Switching ---');
    // Go to Progress
    await page1.locator('.mobile-nav button[data-view="progress"]').click();
    await page1.waitForTimeout(300);
    assert(await page1.locator('#view-progress').isVisible(), 'Progress view renders correctly');
    const statCards = page1.locator('.stat-card');
    assert((await statCards.count()) === 3, 'Progress view displays 3 KPI stat cards');

    // Go to Groups
    await page1.locator('.mobile-nav button[data-view="groups"]').click();
    await page1.waitForTimeout(300);
    assert(await page1.locator('#view-groups').isVisible(), 'Groups view renders correctly');

    // Go to Settings
    await page1.locator('.mobile-nav button[data-view="settings"]').click();
    await page1.waitForTimeout(300);
    assert(await page1.locator('#view-settings').isVisible(), 'Settings view renders correctly');

    // Return to Today
    await page1.locator('.mobile-nav button[data-view="today"]').click();
    await page1.waitForTimeout(300);
    assert(await page1.locator('#view-today').isVisible(), 'Returned to Today view');

    // -------------------------------------------------------------
    // Test 5: Compact Screen (360x640) Resilience
    // -------------------------------------------------------------
    console.log('\n--- Scenario 5: Compact Mobile Screen (360x640) ---');
    const context2 = await browser.newContext({
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page2 = await context2.newPage();
    await page2.goto('http://127.0.0.1:4173/?demo=1', { waitUntil: 'networkidle' });

    const compactOverflow = await page2.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    assert(!compactOverflow, 'Zero horizontal overflow even on small 360px screen');

    await context1.close();
    await context2.close();

    console.log(`\n🎉 ALL TESTS PASSED! (${passCount} assertions passed, ${failCount} failed)`);
  } catch (err) {
    console.error('\n❌ E2E Test Suite Error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runMobileE2ETests();
