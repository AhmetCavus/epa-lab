import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('auth-protocol-playground.locale', 'en'));
});

test('catalog simulation actions keep keyboard and browser navigation honest in a static build', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/missions$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Understand the flow.');
  await expect(page.getByRole('link', { name: 'Start live demo', exact: true })).toHaveCount(0);
  const simulation = page.getByRole('link', { name: 'Start simulation', exact: true });
  await expect(simulation).toHaveCount(2);
  await simulation.first().focus();
  await expect(simulation.first()).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/oauth-oidc\/workspace\?execution=simulation$/);
  await expect(page.locator('main')).toBeFocused();
  await page.goBack();
  await simulation.last().click();
  await expect(page).toHaveURL(/epa-concept\/workspace\?execution=simulation$/);
  await page.goBack();
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ePA / gematik');
  await expect(page.locator('[data-runtime-action="start"]').first()).toBeEnabled();
});

test('stage selection and replay inspect the finite simulated attempt without executing or resetting it', async ({
  page,
}) => {
  const traffic: string[] = [];
  page.on('request', (request) => {
    if (['fetch', 'xhr'].includes(request.resourceType())) {
      traffic.push(request.url());
    }
  });
  await page.goto('/missions/oauth-oidc/workspace?view=fixture&panel=flow');
  await page.locator('[data-runtime-action="start"]').first().click();
  for (let index = 0; index < 3; index += 1) {
    await page.locator('[data-runtime-action="advance"]').first().click();
  }
  await page.locator('.mc-stage').nth(1).click();
  await page.locator('.flow-overview button').nth(1).click();
  const count = await page.locator('.flow-overview button').count();
  await page.locator('.flow-transport button').nth(2).click();
  await expect(page.locator('.flow-transport')).toHaveAttribute('data-playback-index', '0');
  await expect(page.locator('.flow-overview button')).toHaveCount(count);
  await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
  await expect(page.locator('.timeline button')).toHaveCount(count);
  await expect(page.locator('.inspector')).toContainText('SIMULATED');
  await page.locator('[data-runtime-action="reset"]').click();
  await expect(page.locator('.timeline button')).toHaveCount(0);
  expect(traffic).toEqual([]);
});

test('mission changes clear simulation progress and conceptual ePA produces no clinical response', async ({
  page,
}) => {
  await page.goto('/missions/oauth-oidc/workspace?panel=flow');
  await page.locator('[data-runtime-action="start"]').first().click();
  await page.locator('.mc-sidebar nav a').nth(1).click();
  await expect(page.locator('[data-runtime-action="start"]').first()).toBeEnabled();
  await expect(page.locator('.mc-resource-form')).toHaveCount(0);
  await page.locator('[data-runtime-action="start"]').first().click();
  await page.locator('.mc-sidebar nav a').first().click();
  await expect(page.locator('[data-runtime-action="start"]').first()).toBeEnabled();
  await expect(page.locator('.mc-resource-result')).toHaveCount(0);
});

for (const width of [1366, 1024, 390]) {
  test(`simulation layout and accessible controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/missions/oauth-oidc/workspace?panel=flow');
    await page.locator('[data-runtime-action="start"]').first().click();
    await page.locator('.flow-transport button').last().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.flow-overview button')).toHaveCount(2);
    await expect(page.locator('.flow-transport button').nth(1)).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}
