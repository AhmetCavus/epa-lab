import { expect, test } from '@playwright/test';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

for (const context of ['anonymous', 'authenticated', 'pending'] as const) {
  test(`${context} simulation survives blocked services, page return and repeated attempts without authority`, async ({
    page,
  }) => {
    const fixture = runtimeFixture(context !== 'anonymous');
    if (context === 'pending') {
      const run = fixture.session.currentRun;
      expect(run).toBeTruthy();
      fixture.setSession({
        ...fixture.session,
        authenticated: false,
        currentRun: run ? { ...run, outcome: 'pending' } : null,
      });
    }
    await fixture.install(page);
    await page.clock.install();
    const attempted: string[] = [];
    await page.route(/\/(api|realms|fhir|epa|session|login|callback)(\/|\?|$)/, async (route) => {
      attempted.push(new URL(route.request().url()).pathname);
      await route.abort();
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const mission of ['oauth-oidc', 'epa-concept']) {
      await page.goto(`/missions/${mission}/workspace?execution=live&view=fixture&panel=flow`);
      await expect(page.locator('[data-execution="simulation"]')).toBeVisible();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await page.locator('[data-runtime-action="start"]').first().click();
        await expect(page.locator('.flow-overview button')).toHaveCount(1);
        await page.locator('.flow-transport button').nth(1).click();
        await page.clock.fastForward(1200);
        await expect(page.locator('.flow-overview button')).toHaveCount(2);
        await page.locator('[data-runtime-action="reset"]').click();
        await page.clock.fastForward(12000);
        await expect(page.locator('.flow-overview button')).toHaveCount(0);
      }
      await page.evaluate(() => {
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
      await page.goBack();
      await page.goForward();
      await expect(page.locator('.timeline button')).toHaveCount(0);
      await expect(page.locator('[data-runtime-action="logout"]')).toHaveCount(0);
    }
    expect(attempted).toEqual([]);
    expect(fixture.calls).toEqual([]);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(() => ({
        local: localStorage.length,
        session: sessionStorage.length,
        cookies: document.cookie,
      })),
    ).toEqual({ local: 0, session: 0, cookies: '' });
  });
}

test('simulation result tabs and copied JSON carry only the fixed fictional resource without HAPI measurements', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Clipboard permission is Chromium-specific');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const attempted: string[] = [];
  page.on('request', (request) => {
    if (['fetch', 'xhr'].includes(request.resourceType())) {
      attempted.push(request.url());
    }
  });
  await page.goto(`${workspacePath}?execution=simulation`);
  await page.locator('[data-runtime-action="start"]').first().click();
  for (let index = 0; index < 8; index += 1) {
    await page.locator('[data-runtime-action="advance"]').first().click();
  }
  await page.locator('[data-runtime-action="resource"]').click();
  const result = page.locator('.mc-resource-result');
  await expect(result).toContainText('SIMULATION');
  await result.getByRole('button', { name: 'JSON kopieren', exact: true }).click();
  const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(copied).toMatchObject({ resourceType: 'Basic', id: 'playground-demo' });
  expect(copied).not.toHaveProperty('meta');
  expect(Object.keys(copied).sort()).toEqual(['code', 'id', 'resourceType']);
  await result.getByRole('tab').nth(1).click();
  await expect(result).toContainText('SIMULATION');
  await result.getByRole('tab').nth(2).click();
  await expect(result).toContainText('SIMULATION');
  await expect(result.locator('[role="tabpanel"]')).toContainText('Nicht gemessen');
  await expect(result.locator('[role="tabpanel"]')).toContainText('Keine Anfrage an HAPI');
  expect(attempted).toEqual([]);
});
