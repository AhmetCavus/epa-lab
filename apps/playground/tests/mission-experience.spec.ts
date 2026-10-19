import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Existing English regressions explicitly restore a supported preference.
  await page.addInitScript(() => localStorage.setItem('auth-protocol-playground.locale', 'en'));
});

test('catalog availability, keyboard previews and browser navigation are honest', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/missions$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Understand the flow.');
  await expect(page.getByText('Fixture preview', { exact: true })).toBeVisible();
  await expect(page.getByText('Planned', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /start|sign in/i })).toHaveCount(0);
  const preview = page.getByRole('link', { name: 'Preview fixture' });
  await preview.focus();
  await expect(preview).toBeFocused();
  await expect(preview).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/oauth-oidc\/workspace$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('OAuth 2.0 / OIDC');
  await expect(page.locator('main')).toBeFocused();
  await page.goBack();
  await page.getByRole('link', { name: 'Preview concept' }).click();
  await expect(page).toHaveURL(/epa-concept\/workspace$/);
  await page.goBack();
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ePA / gematik');
  await page.screenshot({ path: test.info().outputPath('epa-concept.png'), fullPage: true });
  await page.getByRole('link', { name: 'Back to Missions' }).click();
  await page.locator('main').focus();
  await page.screenshot({ path: test.info().outputPath('catalog.png'), fullPage: true });
});

test('sample selection, learning selection and reset stay independent of execution', async ({
  page,
}) => {
  const unexpectedRequests: string[] = [];
  const browserErrors: string[] = [];
  page.on('request', (request) => {
    if (
      request.resourceType() === 'fetch' ||
      request.resourceType() === 'xhr' ||
      new URL(request.url()).hostname !== '127.0.0.1'
    ) {
      unexpectedRequests.push(request.url());
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto('/missions/oauth-oidc/workspace');
  const timeline = page.getByRole('region', { name: 'Event timeline' });
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(timeline.getByRole('heading', { name: 'No observed events' })).toBeVisible();
  await page.getByRole('button', { name: 'Follow the front channel' }).focus();
  await page.keyboard.press('Space');
  await expect(timeline.getByRole('button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load fixture samples' }).click();
  await expect(timeline.getByRole('button')).toHaveCount(4);
  const checkpoint = page.getByRole('button', { name: 'Follow the front channel' });
  await expect(checkpoint).toHaveAttribute('aria-pressed', 'true');
  await timeline.getByRole('button', { name: /Direct code exchange/ }).focus();
  await page.keyboard.press('Enter');
  await expect(inspector.getByRole('heading', { name: 'Direct code exchange' })).toBeVisible();
  await expect(inspector.getByText('None — not observed')).toBeVisible();
  await expect(inspector.getByText('Not available', { exact: true })).toBeVisible();
  await expect(inspector.getByText('EXAMPLE DETAILS · NOT AN OBSERVED RESULT')).toBeVisible();
  await expect(page.locator('.actor.highlighted')).toHaveCount(2);
  await expect(checkpoint).toHaveAttribute('aria-pressed', 'true');
  await timeline.getByRole('button', { name: /Provider-internal/ }).click();
  await expect(inspector.getByText('Not observable', { exact: true })).toBeVisible();
  await expect(
    page.locator('.canvas-explanation').getByText('Not observable', { exact: true }),
  ).toBeVisible();
  await expect(
    inspector.getByText('No observed evidence is available for this selection.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.getByLabel('Map zoom')).toHaveText('125%');
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.getByLabel('Map zoom')).toHaveText('100%');
  await expect(page.locator('.checkpoint[aria-pressed="true"]')).toHaveCount(0);
  await expect(timeline.getByRole('button')).toHaveCount(4);
  await expect(timeline.locator('[aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Replay explanation' }).click();
  await expect(
    timeline.getByRole('button', { name: /Browser authorization redirect/ }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'No live run' })).toBeVisible();
  await page.getByRole('button', { name: /^NestJS BFF/ }).focus();
  await page.keyboard.press('Space');
  await expect(inspector.getByRole('heading', { name: 'NestJS BFF' })).toBeVisible();
  await expect(timeline.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('.actor.highlighted')).toHaveCount(1);
  await page.getByText('Actor map text alternative', { exact: true }).click();
  await expect(page.locator('.text-alternative')).toContainText('Keycloak · one deployment');
  await expect(
    page
      .locator('.actor-group')
      .filter({ hasText: 'Keycloak · one deployment' })
      .getByRole('button'),
  ).toHaveCount(2);
  expect(
    await page.evaluate(() => ({
      local: Object.entries(localStorage),
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({ local: [['auth-protocol-playground.locale', 'en']], session: 0, cookie: '' });
  expect(unexpectedRequests).toEqual([]);
  expect(browserErrors).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('oauth-workspace.png'), fullPage: true });
});

test('concept preview cannot produce telemetry and mission changes clear transient state', async ({
  page,
}) => {
  await page.goto('/missions/epa-concept/workspace');
  await expect(page.getByRole('button', { name: 'Load fixture samples' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay explanation' })).toBeDisabled();
  await page.getByRole('button', { name: 'Inspect authorization boundaries' }).click();
  await expect(
    page.getByRole('region', { name: 'Event timeline' }).getByRole('button'),
  ).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toContainText(
    'No observed evidence',
  );
  await page.getByRole('link', { name: 'Back to Missions' }).click();
  await page.getByRole('link', { name: 'Preview fixture' }).click();
  await page.getByRole('button', { name: 'Load fixture samples' }).click();
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Event timeline' }).getByRole('button'),
  ).toHaveCount(0);
  await page.goto('/missions/unknown/workspace');
  await expect(page.getByRole('heading', { name: 'That preview isn’t here.' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Missions' }).click();
  await page.goto('/unknown');
  await expect(page.getByRole('heading', { name: 'That preview isn’t here.' })).toBeVisible();
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`responsive layout, fit and accessible content at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of [
      '/missions',
      '/missions/oauth-oidc/workspace',
      '/missions/epa-concept/workspace',
    ]) {
      await page.goto(route);
      if (route.includes('oauth-oidc')) {
        await page.getByRole('button', { name: 'Load fixture samples' }).click();
        await page
          .getByRole('region', { name: 'Event timeline' })
          .getByRole('button')
          .first()
          .click();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      const violations = (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations;
      expect(violations).toEqual([]);
      if (route.endsWith('workspace')) {
        await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
        await page.getByRole('button', { name: 'Fit', exact: true }).click();
        const readableMap = await page
          .getByRole('region', { name: 'Scrollable actor map' })
          .evaluate((element) => {
            const label = element.querySelector('.actor strong');
            return label !== null && Number.parseFloat(getComputedStyle(label).fontSize) >= 13;
          });
        expect(readableMap).toBe(true);
        await expect(page.getByLabel('Map zoom')).toHaveText('100%');
        if (viewport.width < 1200) {
          const inspector = await page
            .getByRole('complementary', { name: 'Inspector' })
            .boundingBox();
          const canvas = await page
            .getByRole('region', { name: 'Actor map', exact: true })
            .boundingBox();
          expect(inspector && canvas && inspector.y >= canvas.y + canvas.height).toBeTruthy();
        }
      }
      await page.locator('main').focus();
      await page.screenshot({
        path: test.info().outputPath(`${route.split('/')[2] ?? 'catalog'}-${viewport.width}.png`),
        fullPage: true,
      });
    }
  });
}
