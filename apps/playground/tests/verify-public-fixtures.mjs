import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';

if (process.env.PLAYGROUND_VERIFY_PUBLIC_FIXTURES !== 'true') {
  throw new Error('Set PLAYGROUND_VERIFY_PUBLIC_FIXTURES=true for this read-only check');
}

const origin = 'https://auth-playground.yappai.de';
const output = resolve('.cache/integrated-acceptance/public');
await mkdir(output, { recursive: true, mode: 0o700 });
const result = { verified: false, forbiddenRequests: 0, browserErrors: 0 };
let browser;
let stage = 'browser';

try {
  browser = await chromium.launch();
  const context = await browser.newContext();
  // An accidentally enabled authentication request must fail the check before it is sent.
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const applicationApi = /^\/(?:api|login|callback|session)(?:\/|$)/.test(url.pathname);
    if (url.origin !== origin || applicationApi) {
      result.forbiddenRequests += 1;
      await route.abort();
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', () => {
    result.browserErrors += 1;
  });
  stage = 'public-navigation';
  await page.goto(`${origin}/missions`);
  stage = 'german-default';
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  stage = 'language-selection';
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  stage = 'fixture-catalog';
  await expect(page.getByText('Fixture preview', { exact: true })).toBeVisible();
  await expect(page.getByText('Planned', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open private integration test' })).toHaveCount(0);
  await page.screenshot({ path: resolve(output, 'public-catalog.png'), fullPage: true });

  const executionActions = /^(Start authentication|Retry flow|Access resource|Sign out)$/i;
  stage = 'oauth-fixture';
  await page.getByRole('link', { name: 'Preview fixture', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('OAuth 2.0 / OIDC');
  await expect(page.getByRole('button', { name: executionActions })).toHaveCount(0);
  const timeline = page.getByRole('region', { name: 'Event timeline' });
  await expect(timeline.getByRole('button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Load fixture samples' }).click();
  await expect(timeline.getByRole('button')).toHaveCount(4);
  await timeline.getByRole('button', { name: /Direct code exchange/ }).click();
  await expect(
    page.getByRole('complementary', { name: 'Inspector' }).getByText('None — not observed'),
  ).toBeVisible();
  await page.screenshot({ path: resolve(output, 'public-oauth-fixture.png'), fullPage: true });

  stage = 'epa-concept';
  await page.getByRole('link', { name: 'Back to Missions' }).click();
  await page.getByRole('link', { name: 'Preview concept', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ePA / gematik');
  await expect(page.getByRole('button', { name: executionActions })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Load fixture samples' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay explanation' })).toBeDisabled();
  await expect(
    page.getByRole('region', { name: 'Event timeline' }).getByRole('button'),
  ).toHaveCount(0);
  await page.screenshot({ path: resolve(output, 'public-epa-concept.png'), fullPage: true });
  assert.equal(result.forbiddenRequests, 0);
  assert.equal(result.browserErrors, 0);
  Object.assign(result, {
    verified: true,
    germanDefault: true,
    englishAvailable: true,
    fixtureCatalog: true,
    oauthSamplesOnly: true,
    epaConceptOnly: true,
    noAuthenticationOfferedOrAttempted: true,
  });
} catch (error) {
  result.failure = 'public-fixture-check-failed';
  result.failedStage = stage;
  result.failureCategory =
    [
      'ERR_CERT_AUTHORITY_INVALID',
      'ERR_CERT_DATE_INVALID',
      'ERR_NAME_NOT_RESOLVED',
      'ERR_CONNECTION_REFUSED',
      'ERR_CONNECTION_TIMED_OUT',
      'ERR_TUNNEL_CONNECTION_FAILED',
      'ERR_PROXY_CONNECTION_FAILED',
    ].find((code) => error instanceof Error && error.message.includes(code)) ?? 'check-failed';
  process.exitCode = 1;
} finally {
  await browser?.close();
  await writeFile(resolve(output, 'verification.json'), `${JSON.stringify(result, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(JSON.stringify(result));
}
