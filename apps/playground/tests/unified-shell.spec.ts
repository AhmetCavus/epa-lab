import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

test('official header asset retains its reviewed website identity', () => {
  const asset = readFileSync('public/assets/yappai-y-icon-64.png');
  expect(createHash('sha256').update(asset).digest('hex')).toBe(
    '0b382fd3107c7fdadbe2483e47f87ec3c69c2558ef3aa24878b2f0ad4515aedd',
  );
});

test('catalog and all workspaces render the same single v2 header', async ({ page }) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.setViewportSize({ width: 1672, height: 941 });
  for (const path of [
    '/missions',
    workspacePath,
    `${workspacePath}?view=fixture`,
    '/missions/epa-concept/workspace',
  ]) {
    await page.goto(path);
    const header = page.locator('.mc-header');
    await expect(header).toHaveCount(1);
    await expect(page.locator('.site-header')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Sprache', exact: true })).toHaveCount(1);
    await expect(header).toHaveCSS('min-height', '58px');
    expect((await header.boundingBox())?.height).toBe(58);
    await expect(header.locator('.mc-brand-mark')).toHaveAttribute(
      'src',
      '/assets/yappai-y-icon-64.png',
    );
    await expect(header.locator('.mc-brand-mark')).toHaveCSS('object-fit', 'contain');
    const current = header.locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(path === '/missions' ? 'Mission Control' : 'Explore');
  }
});

for (const locale of ['de', 'en']) {
  test(`${locale} header navigation and language controls are accessible on mobile`, async ({
    page,
  }) => {
    const fixture = runtimeFixture();
    await fixture.install(page);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(workspacePath);
    const language = page.getByRole('combobox', { name: /^(Sprache|Language)$/ });
    await language.selectOption(locale);
    await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
    const before = fixture.calls.length;
    const inspect = page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true });
    await inspect.focus();
    await expect(inspect).toHaveCSS('outline-style', 'solid');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/mode=inspect/);
    await expect(inspect).toHaveAttribute('aria-current', 'page');
    expect(fixture.calls).toHaveLength(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
    const scan = await new AxeBuilder({ page })
      .include('.mc-header')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`header-${locale}-mobile.png`) });
  });
}
