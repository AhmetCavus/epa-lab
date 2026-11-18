import { expect, test, type Page } from '@playwright/test';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

async function finishAuthorization(page: Page, steps = 8) {
  await page.locator('[data-runtime-action="start"]').first().click();
  for (let index = 0; index < steps; index += 1) {
    await page.locator('[data-runtime-action="advance"]').first().click();
  }
}

test('OAuth simulation reuses v2 playback and fictional resource views with zero service calls', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.clock.install();
  await page.goto(`${workspacePath}?execution=simulation&panel=flow`);
  await expect(page.locator('[data-execution="simulation"]')).toBeVisible();
  await expect(page.locator('[data-provenance="simulation"]')).toContainText(
    'keine echte Authentifizierung',
  );
  await page.locator('[data-runtime-action="start"]').first().click();
  await expect(page.locator('.flow-overview button')).toHaveCount(1);
  await page.clock.fastForward(5000);
  await expect(page.locator('.flow-overview button')).toHaveCount(1);
  await page.locator('.flow-transport button').last().click();
  await expect(page.locator('.flow-overview button')).toHaveCount(2);
  await page.locator('.flow-transport button').nth(1).click();
  await page.clock.fastForward(1200);
  await expect(page.locator('.flow-overview button')).toHaveCount(3);
  await page.locator('.flow-transport button').nth(1).click();
  await page.clock.fastForward(6000);
  await expect(page.locator('.flow-overview button')).toHaveCount(3);
  await page.locator('.flow-transport button').nth(2).click();
  await expect(page.locator('.flow-transport')).toHaveAttribute('data-playback-index', '0');
  await expect(page.locator('.flow-overview button')).toHaveCount(3);
  for (let index = 0; index < 6; index += 1) {
    await page.locator('[data-runtime-action="advance"]').first().click();
  }
  await expect(page.locator('.flow-overview button')).toHaveCount(9);
  await expect(page.locator('.flow-transport button').last()).toBeDisabled();
  await page.clock.fastForward(8000);
  expect(fixture.calls).toEqual([]);
  await page.locator('.mc-quick-links a').first().click();
  await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
  await page.locator('[data-runtime-action="resource"]').click();
  await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'allowed');
  await expect(page.locator('.mc-resource-result')).toContainText('SIMULATION');
  await expect(page.locator('.mc-result-content pre')).toContainText('playground-demo');
  await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
  await expect(page.locator('.timeline button')).toHaveCount(11);
  await expect(page.locator('.inspector')).toContainText('SIMULIERT');
  await expect(page.locator('.inspector')).not.toContainText('auth-client');
  await expect(page.locator('.timeline time')).toHaveCount(0);
  await page.locator('[data-runtime-action="reset"]').click();
  await expect(page.locator('.timeline button')).toHaveCount(0);
  expect(fixture.calls).toEqual([]);
});

test('fixed failures stay simulated and distinguish session success from resource permission', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(`${workspacePath}?execution=simulation`);
  const examples = page.getByRole('combobox', { name: 'Simulationsbeispiel', exact: true });
  await examples.selectOption('pkce-rejected');
  await finishAuthorization(page, 6);
  await expect(page.locator('.runtime-status')).toContainText('Simulierter Ablauf abgelehnt');
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
  await page.locator('[data-runtime-action="reset"]').click();
  await examples.selectOption('missing-permission');
  await finishAuthorization(page);
  await expect(page.locator('.runtime-status')).toContainText('Simulierte Sitzung hergestellt');
  await page.locator('[data-runtime-action="resource"]').click();
  await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'denied');
  await expect(page.locator('.mc-resource-result')).toContainText('403');
  await expect(page.locator('.mc-result-content pre')).toHaveCount(0);
  expect(fixture.calls).toEqual([]);
});

test('reduced motion and reset cancel progression and retain explicit keyboard stepping', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${workspacePath}?view=fixture&panel=flow`);
  await page.locator('[data-runtime-action="start"]').first().click();
  await expect(page.locator('.flow-transport button').nth(1)).toBeDisabled();
  await page.locator('.flow-transport button').last().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.flow-overview button')).toHaveCount(2);
  await page.locator('[data-runtime-action="reset"]').click();
  await page.locator('[data-runtime-action="start"]').first().click();
  await page.clock.fastForward(10000);
  await expect(page.locator('.flow-overview button')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.flow-overview button')).toHaveCount(0);
  expect(fixture.calls).toEqual([]);
});

test('locale and Explore/Inspect changes preserve simulation progress without restoring a live context', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(`${workspacePath}?execution=simulation`);
  await finishAuthorization(page);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  await expect(page.locator('.runtime-status')).toContainText('Simulated session established');
  await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
  await expect(page.locator('.timeline button')).toHaveCount(9);
  await page.locator('.timeline button').first().click();
  await expect(page.locator('.inspector')).toContainText('No real observer');
  await page.locator('.mc-header').getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page.locator('.runtime-status')).toContainText('Simulated session established');
  await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys).toEqual(['auth-protocol-playground.locale']);
  expect(fixture.calls).toEqual([]);
});
