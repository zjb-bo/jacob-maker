const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('.qa', { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  try {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('http://localhost:8000/', { waitUntil: 'networkidle' });
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
      assert.equal(await page.locator('.card:visible').count(), 4);
      assert.equal(await page.locator('.project-link[target="_blank"][rel="noopener noreferrer"]').count(), 4);
      assert.deepEqual(await page.locator('.project-link').evaluateAll(links => links.map(a => a.href)), ['https://www.foryouroom.com/', 'https://sunmoonrisingcalculator.org/', 'https://beside-ours.com/', 'https://crazyfrogai.online/']);
      for (const [filter, count] of [['connection', 2], ['tool', 1], ['ai', 1], ['all', 4]]) {
        await page.locator(`[data-filter="${filter}"]`).click();
        assert.equal(await page.locator('.card:visible').count(), count);
        assert.equal(await page.locator('[aria-pressed="true"]').count(), 1);
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `.qa/home-${width}.png`, fullPage: true });
    }
    await page.locator('.primary').click();
    assert.equal(new URL(page.url()).hash, '#projects');
    const popupPromise = page.waitForEvent('popup');
    await page.locator('.project-link').first().click();
    const popup = await popupPromise;
    assert.equal(new URL(popup.url()).hostname, 'www.foryouroom.com');
    await popup.close();
    assert.deepEqual(errors, []);
    console.log('PASS: desktop/mobile layouts, all images, links, filters, anchor navigation, actual new-tab click, no console/page/HTTP errors.');
  } finally { await browser.close(); }
})();
