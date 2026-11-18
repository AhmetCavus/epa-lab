import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('auth-protocol-playground.locale', 'en'));
});

test('simulated diagram selection highlights actors and keeps actor-local explanations arrowless', async ({
  page,
}) => {
  await page.goto('/missions/oauth-oidc/workspace?view=fixture&panel=flow');
  await expect(page.locator('.flow-overview button')).toHaveCount(0);
  await page.locator('[data-runtime-action="start"]').first().click();
  await expect(page.locator('.flow-path > path')).toHaveCount(0);
  await expect(page.locator('.flow-participant[data-active="true"]')).toHaveCount(1);
  await expect(page.locator('.flow-step')).toContainText('SIMULATED');
  await page.locator('[data-runtime-action="advance"]').first().click();
  await page.locator('.flow-overview button').nth(1).click();
  const arrow = page.locator('.flow-path > path');
  await expect(arrow).toHaveAttribute('data-source', 'bff');
  await expect(arrow).toHaveAttribute('data-target', 'browser');
  await expect(page.locator('.flow-participant[data-active="true"]')).toHaveCount(2);
  await page.locator('.flow-overview button').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.flow-path > path')).toHaveCount(0);
  await expect(page.locator('.flow-overview button').first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
  await expect(page.locator('.timeline button').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.inspector')).toContainText('No real observer');
});

test('conceptual ePA starts empty and uses one row for all five illustrative participants', async ({
  page,
}) => {
  await page.goto('/missions/epa-concept/workspace?panel=flow');
  await expect(page.locator('.flow-overview button')).toHaveCount(0);
  await expect(page.locator('.flow-path > path')).toHaveCount(0);
  const participants = await page
    .locator('.flow-participant')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
  expect(participants).toHaveLength(5);
  expect(new Set(participants).size).toBe(1);
  await expect(page.locator('[data-provenance="simulation"]')).toContainText('CONCEPTUAL');
  await expect(page.locator('.mc-execution-selector a')).toHaveCount(1);
});

for (const viewport of [
  { width: 320, height: 844, deviceScaleFactor: 1 },
  { width: 683, height: 450, deviceScaleFactor: 2 },
]) {
  test(`simulated flow and evidence retain keyboard access at ${viewport.width}px and scale ${viewport.deviceScaleFactor}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: viewport.deviceScaleFactor,
    });
    const page = await context.newPage();
    try {
      await page.goto('http://127.0.0.1:4173/missions/oauth-oidc/workspace?panel=flow');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-runtime-action="start"]').first().click();
      await page.locator('.flow-transport button').last().focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.flow-overview button')).toHaveCount(2);
      const scroll = page.locator('.flow-diagram-scroll');
      await scroll.focus();
      if (await scroll.evaluate((element) => element.scrollWidth > element.clientWidth)) {
        await page.keyboard.press('ArrowRight');
        await expect
          .poll(() => scroll.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
      }
      await expect(page.locator('.flow-participant strong').first()).toHaveCSS('font-size', '16px');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
