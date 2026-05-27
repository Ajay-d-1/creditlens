/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  let success = false;
  for (let i = 0; i < 5; i++) {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
      success = true;
      break;
    } catch {
      console.log(`Failed to navigate (attempt ${i + 1}). Retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (!success) {
    console.error('Could not connect to the app. Is it running?');
    await browser.close();
    process.exit(1);
  }

  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots');
  }

  console.log('Taking initial screenshot...');
  await page.screenshot({ path: 'screenshots/00_initial.png', fullPage: true });

  console.log('Finding interactive elements (buttons, links)...');
  const locators = await page.locator('button, a').all();
  console.log(`Found ${locators.length} interactive elements.`);

  let index = 1;
  for (let i = 0; i < locators.length; i++) {
    // Re-fetch all locators on each iteration because DOM might change or become detached
    const currentLocators = await page.locator('button, a').all();
    if (i >= currentLocators.length) break;
    
    const locator = currentLocators[i];
    try {
      const isVisible = await locator.isVisible();
      if (!isVisible) continue;
      
      const text = (await locator.textContent()) || 'No text';
      console.log(`\nClicking element ${index}: "${text.trim().substring(0, 30)}"`);
      
      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // Give it time to scroll and settle
      
      // Using force/noWaitAfter to try and prevent hangs on navigation
      await locator.click({ force: true, noWaitAfter: true, timeout: 3000 });
      await page.waitForTimeout(2000); // Wait for potential state changes or route changes
      
      const formattedIndex = String(index).padStart(2, '0');
      await page.screenshot({ path: `screenshots/${formattedIndex}_after_click.png`, fullPage: true });
      
      // If we navigated away from the base url, we go back
      if (page.url() !== 'http://localhost:3000/') {
        console.log('Navigated away, going back...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      }
      
      index++;
    } catch (e) {
      console.log(`Skipped element ${index} due to error: ${e.message.split('\n')[0]}`);
    }
  }

  console.log('\nTesting completed. Check the screenshots folder.');
  await browser.close();
})();
