import { expect, test } from '@playwright/test';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

test('simulation entry reload and history do not read an authenticated or pending live context', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(`${workspacePath}?execution=simulation`);
  await page.reload();
  await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
  await page.goBack();
  await page.goForward();
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  expect(fixture.calls).toEqual([]);
  await expect(page.locator('[data-runtime-action="logout"]')).toHaveCount(0);
});

test('held live resource data cannot populate the simulation after navigation', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  let release: (() => void) | undefined;
  fixture.gateResource(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  try {
    await page.goto(workspacePath);
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'loading');
    await page.locator('.mc-brand').click();
    await page
      .locator('.mission-card')
      .first()
      .getByRole('link', { name: 'Simulation starten' })
      .click();
    await expect(page).toHaveURL(/execution=simulation/);
    const requests = fixture.calls.length;
    release?.();
    await expect(page.locator('.mc-resource-result')).toHaveCount(0);
    await expect(page.locator('[data-runtime-action="logout"]')).toHaveCount(0);
    expect(fixture.calls).toHaveLength(requests);
    expect(fixture.calls.filter((call) => call.path === '/api/oauth/logout')).toEqual([]);
  } finally {
    release?.();
  }
});

test('returning to live restores only real authoritative state and never logs in implicitly', async ({
  page,
}) => {
  const fixture = runtimeFixture(false);
  await fixture.install(page);
  await page.goto(`${workspacePath}?view=fixture`);
  expect(fixture.calls).toEqual([]);
  await page.locator('.mc-brand').click();
  await page
    .locator('.mission-card')
    .first()
    .getByRole('link', { name: 'Live-Demo starten' })
    .click();
  await expect(page.locator('[data-runtime-action="start"]').first()).toBeEnabled();
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
  expect(fixture.calls.map((call) => call.path)).toEqual(['/api/oauth/session']);
});
