import { chromium, expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('actual browser back-forward cache restores only bounded local simulation without service calls', async () => {
  const executablePath = process.env.PLAYGROUND_NATIVE_CHROMIUM;
  test.skip(!executablePath, 'Full Chromium is required for actual back-forward cache acceptance.');
  const browser = await chromium.launch({
    executablePath,
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  });
  try {
    const page = await browser.newPage();
    const traffic: string[] = [];
    page.on('request', (request) => {
      if (['fetch', 'xhr'].includes(request.resourceType())) {
        traffic.push(new URL(request.url()).pathname);
      }
    });
    await page.addInitScript(() => {
      const state = window as typeof window & { simulationPageShows?: boolean[] };
      state.simulationPageShows = [];
      window.addEventListener('pageshow', (event) =>
        state.simulationPageShows?.push(event.persisted),
      );
    });
    await page.goto(
      'http://127.0.0.1:4173/missions/oauth-oidc/workspace?execution=simulation&panel=flow',
    );
    await page.locator('[data-runtime-action="start"]').first().click();
    await page.locator('[data-runtime-action="advance"]').first().click();
    await expect(page.locator('.flow-overview button')).toHaveCount(2);
    await page.goto('http://127.0.0.1:4173/unknown');
    // A cache restore emits pageshow rather than a new document load event.
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(/oauth-oidc\/workspace/);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as typeof window & { simulationPageShows?: boolean[] }).simulationPageShows,
        ),
      )
      .toContain(true);
    await expect(page.locator('[data-execution="simulation"]')).toBeVisible();
    await expect(page.locator('.flow-overview button')).toHaveCount(2);
    await expect(page.locator('.flow-transport')).toHaveAttribute('data-playing', 'false');
    await expect(page.locator('[data-runtime-action="logout"]')).toHaveCount(0);
    expect(traffic).toEqual([]);
    await writeFile(
      test.info().outputPath('back-forward-cache.json'),
      JSON.stringify(
        {
          actualPersistedPageShow: true,
          boundedLocalEvents: 2,
          serviceRequests: traffic.length,
          authenticated: false,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
});
