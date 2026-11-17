import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

test('Inspect uses the reference three-column geometry and safe current-run metadata', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.setViewportSize({ width: 1585, height: 992 });
  await page.goto(`${workspacePath}?mode=inspect`);
  await expect(page.locator('.timeline button')).toHaveCount(9);
  await page.locator('.timeline button').nth(2).click();
  const boxes = await Promise.all(
    ['.timeline-panel', '.inspector', '.mc-run-metadata'].map((selector) =>
      page.locator(selector).boundingBox(),
    ),
  );
  const [left, center, right] = boxes;
  expect(left && center && right).toBeTruthy();
  if (!left || !center || !right) throw new Error('Missing columns');
  expect(left.x).toBe(12);
  expect(center.x - left.x - left.width).toBeCloseTo(14, 0);
  expect(right.x - center.x - center.width).toBeCloseTo(14, 0);
  expect(center.width / left.width).toBeCloseTo(46 / 26, 1);
  expect(right.width / left.width).toBeCloseTo(1, 1);
  expect(left.y).toBe(center.y);
  await expect(page.locator('.mc-sidebar')).toBeHidden();
  await expect(page.locator('.mc-run-metadata')).toContainText(fixture.document.runId);
  await expect(page.locator('.mc-run-metadata')).not.toContainText('demo-versicherte');
  await expect(page.locator('.inspector')).toContainText('Browser');
  await expect(page.locator('.inspector')).toContainText('BFF');
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('03-inspect.png'), fullPage: true });
});

test('filters keep exact IDs and order, synchronize detail and bound previous/next without execution', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(`${workspacePath}?mode=inspect`);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  await expect(page.locator('.timeline button')).toHaveCount(9);
  const calls = fixture.calls.length;
  await expect(page.getByRole('button', { name: 'Previous event', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Next event', exact: true }).click();
  await expect(page.locator('.timeline button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.mc-event-filter-disclosure summary').click();
  await page.getByRole('combobox', { name: 'Channel', exact: true }).selectOption('internal');
  await expect(page.locator('.timeline button')).toHaveCount(4);
  await expect(page.locator('.timeline button').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.inspector')).toContainText('no network request');
  await page.getByRole('combobox', { name: 'Outcome', exact: true }).selectOption('accepted');
  await expect(page.locator('.timeline button')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next event', exact: true })).toBeDisabled();
  await expect(page.locator('.inspector')).toContainText('ID Token');
  await page.getByRole('combobox', { name: 'Actor', exact: true }).selectOption('resource-server');
  await expect(page.locator('.timeline button')).toHaveCount(0);
  await expect(page.locator('.inspector')).toContainText('No observed event is selected');
  await expect(page.getByRole('button', { name: 'Next event', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Actor', exact: true }).selectOption('bff');
  await expect(page.locator('.timeline button')).toHaveCount(1);
  await expect(page.locator('.timeline button')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('de');
  await expect(page.locator('.timeline button')).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.calls).toHaveLength(calls);
});

for (const locale of ['de', 'en']) {
  for (const width of [1585, 390]) {
    test(`Inspect evidence disclosure and unavailable metadata are accessible in ${locale} at ${width}px`, async ({
      page,
    }) => {
      const fixture = runtimeFixture();
      await fixture.install(page);
      await page.setViewportSize({ width, height: 992 });
      await page.goto(`${workspacePath}?mode=inspect`);
      await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(locale);
      await expect(page.locator('.timeline button')).toHaveCount(9);
      await page.locator('.timeline button').nth(2).click();
      const disclosure = page.locator('.evidence-section summary');
      await disclosure.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('details.evidence-section')).toHaveAttribute('open', '');
      await expect(disclosure).toBeFocused();
      await expect(page.locator('.evidence-fields')).toContainText('matched');
      await page.keyboard.press('Space');
      await expect(page.locator('details.evidence-section')).not.toHaveAttribute('open', '');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
      await page.screenshot({
        path: test.info().outputPath(`03-inspect-${locale}-${width}.png`),
        fullPage: true,
      });
      fixture.setEvents({ unsupported: true });
      await page.locator('[data-runtime-action="restore"]').click();
      await expect(page.locator('.timeline button')).toHaveCount(0);
      await expect(page.locator('.inspector')).toContainText(
        locale === 'en' ? 'Not available' : 'Nicht verfügbar',
      );
      await expect(page.locator('.mc-run-metadata')).toContainText(
        locale === 'en' ? 'History incomplete' : 'Historie unvollständig',
      );
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
      ).toEqual([]);
    });
  }
}

test('Inspect filters do not constrain recorded playback after leaving the technical view', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.clock.install();
  await page.goto(`${workspacePath}?mode=inspect`);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  await expect(page.locator('.timeline button')).toHaveCount(9);
  await page.locator('.mc-event-filter-disclosure summary').click();
  await page.getByRole('combobox', { name: 'Channel', exact: true }).selectOption('internal');
  await page.keyboard.press('Escape');
  await expect(page.locator('.mc-event-filter-disclosure summary')).toBeFocused();
  const calls = fixture.calls.length;
  await page
    .getByRole('navigation', { name: 'Workspace', exact: true })
    .getByRole('link', { name: 'Explore', exact: true })
    .click();
  await page.locator('.mc-quick-links a').nth(1).click();
  await page.locator('.flow-overview button').nth(2).click();
  await page.clock.fastForward(2000);
  await expect(page.locator('.flow-transport')).toHaveAttribute('data-playback-index', '2');
  await page.locator('.flow-transport').getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.flow-transport')).toHaveAttribute('data-playback-index', '3');
  expect(fixture.calls).toHaveLength(calls);
});
