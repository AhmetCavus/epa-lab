import { expect, test } from '@playwright/test';
import { privateBaseUrl, runtimeFixture } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });
const path = '/missions/epa-concept/workspace?execution=simulation';

for (const locale of ['de', 'en']) {
  test(`ePA conceptual ${locale} uses v2 with explicit local outcomes and no service requests`, async ({
    page,
  }) => {
    const fixture = runtimeFixture();
    await fixture.install(page);
    await page.goto(path);
    await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption(locale);
    await expect(page.locator('[data-provenance="simulation"]')).toContainText(/KONZEPT|CONCEPT/);
    await expect(page.locator('.mc-execution-selector a')).toHaveCount(1);
    await expect(page.locator('.mc-resource-form')).toHaveCount(0);
    await page.locator('[data-runtime-action="start"]').first().click();
    for (let index = 0; index < 7; index += 1) {
      await page.locator('[data-runtime-action="advance"]').first().click();
    }
    await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'conceptual');
    await expect(page.locator('.mc-resource-result')).toContainText(/KONZEPT|CONCEPT/);
    await expect(page.locator('.mc-resource-result')).not.toContainText('200');
    await expect(page.locator('.mc-resource-result pre')).toHaveCount(0);
    await expect(page.locator('.mc-resource-result')).not.toContainText('Basic');
    await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
    await expect(page.locator('.timeline button')).toHaveCount(10);
    await page.locator('.timeline button').nth(2).click();
    await expect(page.locator('.inspector')).toContainText('PAR');
    await expect(page.locator('.inspector')).toContainText(/KONZEPT|CONCEPT/);
    await page
      .getByRole('combobox', { name: locale === 'de' ? 'Sprache' : 'Language', exact: true })
      .selectOption(locale === 'de' ? 'en' : 'de');
    await expect(page.locator('.timeline button')).toHaveCount(10);
    await page.locator('[data-runtime-action="reset"]').click();
    await expect(page.locator('.timeline button')).toHaveCount(0);
    expect(fixture.calls).toEqual([]);
  });
}

test('conceptual PAR rejection stops, reset/reload/mission departure discard progression', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${path}&panel=flow`);
  await page.locator('.mc-simulation-options select').selectOption('par-rejected');
  await page.locator('[data-runtime-action="start"]').first().click();
  await expect(page.locator('.flow-overview button')).toHaveCount(1);
  await expect(page.locator('.flow-transport button').last()).toBeEnabled();
  for (let index = 0; index < 3; index += 1) {
    await page.locator('.flow-transport button').last().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.flow-overview button')).toHaveCount(index + 2);
    await expect(page.locator('.flow-transport')).toHaveAttribute(
      'data-playback-index',
      String(index + 1),
    );
  }
  await expect(page.locator('.flow-overview button')).toHaveCount(4);
  await expect(page.locator('.flow-transport button').last()).toBeDisabled();
  await expect(page.locator('.flow-transport button').nth(1)).toBeDisabled();
  await page.locator('[data-runtime-action="reset"]').click();
  await page.locator('.mc-simulation-options select').selectOption('success');
  await page.locator('[data-runtime-action="start"]').first().click();
  await page.clock.fastForward(10000);
  await expect(page.locator('.flow-overview button')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.flow-overview button')).toHaveCount(0);
  await page.locator('[data-runtime-action="start"]').first().click();
  await page.locator('.mc-brand').click();
  await page.getByRole('link', { name: 'Simulation starten', exact: true }).last().click();
  await expect(page.locator('[data-runtime-action="start"]').first()).toBeEnabled();
  expect(fixture.calls).toEqual([]);
});
