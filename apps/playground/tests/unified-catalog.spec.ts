import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { privateBaseUrl, runtimeFixture } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

for (const locale of ['de', 'en']) {
  test(`${locale} catalog preserves artwork and aligned explicit actions`, async ({ page }) => {
    const fixture = runtimeFixture();
    await fixture.install(page);
    for (const width of [1366, 390]) {
      await page.setViewportSize({ width, height: 941 });
      await page.goto('/missions');
      await page.getByRole('combobox', { name: /^(Sprache|Language)$/ }).selectOption(locale);
      const cards = page.locator('.mission-card');
      await expect(cards).toHaveCount(2);
      const oauth = cards.nth(0);
      const epa = cards.nth(1);
      const simulations = locale === 'de' ? 'Simulation starten' : 'Start simulation';
      const live = locale === 'de' ? 'Live-Demo starten' : 'Start live demo';
      await expect(oauth.getByRole('link', { name: simulations })).toHaveAttribute(
        'href',
        '/missions/oauth-oidc/workspace?execution=simulation',
      );
      await expect(oauth.getByRole('link', { name: live })).toHaveAttribute(
        'href',
        '/missions/oauth-oidc/workspace?execution=live',
      );
      await expect(epa.getByRole('link', { name: simulations })).toHaveAttribute(
        'href',
        '/missions/epa-concept/workspace?execution=simulation',
      );
      await expect(epa.getByRole('link', { name: live })).toHaveCount(0);
      await expect(oauth.locator('.mission-actions')).toHaveCSS('row-gap', '10px');
      const first = await oauth.locator('.button.primary').boundingBox();
      const second = await oauth.locator('.button.secondary').boundingBox();
      expect(first?.height).toBe(second?.height);
      if (width > 760) {
        const epaAction = await epa.locator('.button.primary').boundingBox();
        expect(first?.y).toBe(epaAction?.y);
        expect((await oauth.boundingBox())?.height).toBe((await epa.boundingBox())?.height);
      }
      await expect(oauth.locator('.mission-image')).toHaveAttribute(
        'src',
        '/assets/oauth-card-header.jpg',
      );
      await expect(epa.locator('.mission-image')).toHaveAttribute(
        'src',
        '/assets/epa-card-header.jpg',
      );
      await expect(page.locator('body')).not.toContainText(
        /NO LIVE INTEGRATIONS|KEINE LIVE-INTEGRATIONEN/,
      );
      expect(fixture.calls).toHaveLength(0);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(scan.violations).toEqual([]);
      await page.screenshot({
        path: test.info().outputPath(`catalog-${locale}-${width}.png`),
        fullPage: true,
      });
    }
  });
}

test('ordinary static build offers simulations with live execution unavailable', async ({
  page,
}) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) {
      calls.push(request.url());
    }
  });
  await page.goto('http://127.0.0.1:4173/missions');
  await expect(page.getByRole('link', { name: 'Simulation starten' })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Live-Demo starten' })).toBeDisabled();
  await expect(page.locator('.mission-card').nth(1).getByRole('button')).toHaveCount(0);
  expect(calls).toEqual([]);
});
