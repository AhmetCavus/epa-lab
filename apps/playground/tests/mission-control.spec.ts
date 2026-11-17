import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

function contrast(foreground: string, background: string) {
  function luminance(hex: string) {
    function channel(start: number) {
      const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }
    return channel(1) * 0.2126 + channel(3) * 0.7152 + channel(5) * 0.0722;
  }
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

test('navy control colors meet text and focus contrast at the brightest gradient stops', () => {
  expect(contrast('#ffffff', '#087ac6')).toBeGreaterThanOrEqual(4.5);
  expect(contrast('#ffffff', '#005bc9')).toBeGreaterThanOrEqual(4.5);
  expect(contrast('#bccfe5', '#15253e')).toBeGreaterThanOrEqual(4.5);
  expect(contrast('#81e6ff', '#15253e')).toBeGreaterThanOrEqual(3);
  expect(contrast('#5479a4', '#152b45')).toBeGreaterThanOrEqual(3);
  expect(contrast('#5479a4', '#102038')).toBeGreaterThanOrEqual(3);
  expect(contrast('#5a80a9', '#172a45')).toBeGreaterThanOrEqual(3);
  expect(contrast('#52759e', '#14233b')).toBeGreaterThanOrEqual(3);
});

test('navy workspace shell matches the reference geometry and accessible contrast', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto(workspacePath);
  await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();

  const header = await page.locator('.mc-header').boundingBox();
  const sidebar = await page.locator('.mc-sidebar').boundingBox();
  const main = await page.locator('.mc-main').boundingBox();
  expect(header?.height).toBe(58);
  expect(sidebar?.width).toBe(246);
  expect(main?.x).toBe(246);
  await expect(page.locator('.mission-control')).toHaveCSS('background-color', 'rgb(8, 14, 32)');
  await expect(page.locator('.mc-page-heading h1')).toHaveCSS('font-size', '30px');
  await expect(page.locator('.mc-panel').first()).toHaveCSS('border-radius', '14px');
  await expect(page.getByRole('combobox', { name: 'Sprache', exact: true })).toHaveCount(1);
  await expect(page.locator('.mc-resource-form select')).toHaveCount(1);
  expect(fixture.calls.filter((call) => call.path === '/api/oauth/resource')).toHaveLength(0);
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath('01-shared-shell.png'), fullPage: true });
});

test('mode and panel navigation preserve the run, selection and execution counters', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(workspacePath);
  await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
  const initialCalls = fixture.calls.length;
  const navigation = page.getByRole('navigation', { name: 'Arbeitsbereich', exact: true });

  await navigation.getByRole('link', { name: 'Inspect', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/mode=inspect/);
  await expect(page.getByRole('heading', { name: 'Technische Analyse (Inspect)' })).toBeVisible();
  await expect(page.locator('.timeline button')).toHaveCount(9);
  const callbackEvent = page.locator('.timeline button').nth(2);
  await callbackEvent.click();
  await expect(callbackEvent).toHaveAttribute('aria-pressed', 'true');

  await navigation.getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page.locator('[data-view="explore"]')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Schnellzugriff', exact: true })
    .getByRole('link', { name: 'Ablauf & Details', exact: true })
    .click();
  await expect(page.locator('[data-panel="flow"]')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-panel="resources"]')).toBeVisible();
  await page.goForward();
  await expect(page.locator('[data-panel="flow"]')).toBeVisible();
  await navigation.getByRole('link', { name: 'Inspect', exact: true }).click();
  await expect(page.locator('.timeline button').nth(2)).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.calls).toHaveLength(initialCalls);
  expect(fixture.session.currentRun?.runId).toBe(fixture.document.runId);
});

test('direct Inspect URLs and invalid presentation values fail safely without execution', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(`${workspacePath}?mode=inspect&panel=flow`);
  await expect(page.locator('[data-view="inspect"]')).toBeVisible();
  await expect(page.locator('.timeline button')).toHaveCount(9);
  await page.goto(`${workspacePath}?mode=unrecognized&panel=unrecognized`);
  await expect(page.locator('[data-view="explore"]')).toBeVisible();
  await expect(page.locator('[data-panel="resources"]')).toBeVisible();
  expect(
    fixture.calls.filter((call) =>
      ['/api/oauth/login', '/api/oauth/resource', '/api/oauth/logout'].includes(call.path),
    ),
  ).toHaveLength(0);
});

test('mission navigation keeps the language preference and conceptual ePA non-executing', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(workspacePath);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  await page
    .getByRole('navigation', { name: 'Missions', exact: true })
    .getByRole('link', { name: /ePA/ })
    .click();
  await expect(page).toHaveURL(/missions\/epa-concept\/workspace/);
  await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toHaveValue('en');
  await expect(page.locator('[data-runtime-action]')).toHaveCount(0);
  expect(
    fixture.calls.filter((call) =>
      ['/api/oauth/login', '/api/oauth/resource', '/api/oauth/logout'].includes(call.path),
    ),
  ).toHaveLength(0);
});

test('authoritative authentication enables Fetch while teaching history is still pending', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${privateBaseUrl}/api/oauth/runs/*/events`, async (route) => {
    await pending;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(fixture.document),
    });
  });
  try {
    await page.goto(workspacePath);
    await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
    await expect(page.locator('[data-runtime-action="resource"]')).toHaveClass(/mc-primary/);
    await expect(page.locator('[data-runtime-action="start"]')).not.toHaveClass(/mc-primary/);
    expect(fixture.calls.filter((call) => call.path === '/api/oauth/resource')).toHaveLength(0);
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'allowed');
    expect(fixture.calls.filter((call) => call.path === '/api/oauth/resource')).toHaveLength(1);
  } finally {
    release?.();
  }
});

for (const authenticated of [false, true]) {
  test(`Explore reference composition has one dominant action when authenticated=${authenticated}`, async ({
    page,
  }) => {
    const fixture = runtimeFixture(authenticated);
    await fixture.install(page);
    await page.setViewportSize({ width: 1672, height: 941 });
    await page.goto(workspacePath);
    if (authenticated) {
      await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
    } else {
      await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
    }
    if (authenticated) {
      await expect(page.locator('.mc-stages [data-outcome="complete"]')).toHaveCount(2);
    }
    await expect(page.locator('.mc-primary')).toHaveCount(1);
    await expect(page.locator('.mc-participant')).toHaveCount(4);
    await expect(page.locator('.actor-map-scroll')).toHaveCount(0);
    await expect(page.locator('.timeline')).toHaveCount(0);
    const before = fixture.calls.length;
    await page.getByRole('button', { name: /Token prüfen/ }).click();
    expect(fixture.calls).toHaveLength(before);
    await expect(page.locator('.mc-primary')).toHaveAttribute(
      'data-runtime-action',
      authenticated ? 'resource' : 'start',
    );
    if (authenticated) {
      await page.getByRole('button', { name: /^Daten abrufen/ }).click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
      true,
    );
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({
      path: test
        .info()
        .outputPath(`02-explore-${authenticated ? 'authenticated' : 'anonymous'}.png`),
      fullPage: true,
    });
  });
}
