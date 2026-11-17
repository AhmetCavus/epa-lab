import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  privateBaseUrl,
  runtimeFixture,
  syntheticFhir,
  unsafeSentinel,
  workspacePath,
} from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

for (const state of [
  'authenticated',
  'anonymous',
  'expired',
  'signed-out',
  'pending',
  'failed-retained',
  'missing-current-run',
] as const) {
  test(`resource form derives availability from the current standard session: ${state}`, async ({
    page,
  }) => {
    const fixture = runtimeFixture(state !== 'anonymous');
    const current = fixture.session.currentRun;
    if (current && ['expired', 'signed-out'].includes(state)) {
      fixture.setSession({
        ...fixture.session,
        authenticated: false,
        expiresAt: null,
        currentRun: { ...current, outcome: state === 'expired' ? 'expired' : 'signed-out' },
      });
    } else if (current && state === 'pending') {
      fixture.setSession({ ...fixture.session, currentRun: { ...current, outcome: 'pending' } });
    } else if (current && state === 'failed-retained') {
      fixture.setSession({
        ...fixture.session,
        currentRun: { ...current, outcome: 'authentication-failed' },
      });
    } else if (state === 'missing-current-run') {
      fixture.setSession({ ...fixture.session, currentRun: null });
    }
    await fixture.install(page);
    await page.goto(workspacePath);
    await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
    const form = page.locator('.mc-resource-form');
    const type = form.locator('select');
    const id = form.locator('input');
    await expect(type.locator('option')).toHaveCount(1);
    await expect(type).toHaveValue('Basic');
    await expect(id).toHaveValue('playground-demo');
    if (state === 'authenticated') {
      await expect(type).toBeEnabled();
      await expect(id).toBeEnabled();
      await expect(form.locator('button')).toBeEnabled();
    } else {
      await expect(type).toBeDisabled();
      await expect(id).toBeDisabled();
      await expect(form.locator('button')).toBeDisabled();
    }
    expect(
      fixture.calls.every((call) => call.method === 'GET' && /session|events/.test(call.path)),
    ).toBe(true);
  });
}

test('opening/restoring the one-entry form makes no FHIR/catalog request and edited unapproved IDs cannot execute', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  fixture.setEvents({ ...fixture.document, complete: false, events: [] });
  await fixture.install(page);
  await page.goto(workspacePath);
  const form = page.locator('.mc-resource-form');
  await expect(form.locator('button')).toBeEnabled();
  await form.locator('input').fill('another-id');
  await expect(form.locator('button')).toBeDisabled();
  await form.locator('input').press('Enter');
  await form.locator('input').fill('playground-demo');
  await expect(form.locator('button')).toBeEnabled();
  await page.locator('[data-runtime-action="restore"]').click();
  await expect(form.locator('button')).toBeEnabled();
  expect(
    fixture.calls.filter((call) => /resource|catalog|eligibility/.test(call.path)),
  ).toHaveLength(0);
  await page.goto('/missions/epa-concept/workspace');
  await expect(form).toHaveCount(0);
});

test('selected read matches the Explorer composition, copies only safe JSON and keeps tabs/locale non-executing', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto(`${workspacePath}?panel=resources`);
  const fetch = page.locator('[data-runtime-action="resource"]');
  await fetch.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'allowed');
  expect(
    fixture.calls
      .filter((call) => call.path === '/api/oauth/resource')
      .map((call) => call.selectors),
  ).toEqual([{ resourceType: 'Basic', resourceId: 'playground-demo' }]);
  expect(JSON.parse(await page.locator('.mc-result-content pre').innerText())).toEqual(
    syntheticFhir,
  );
  await page.getByRole('button', { name: 'JSON kopieren', exact: true }).click();
  expect(JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))).toEqual(
    syntheticFhir,
  );
  const calls = fixture.calls.length;
  await page.getByRole('tab', { name: 'FHIR (JSON)', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Übersicht', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('.mc-resource-form input')).toHaveValue('playground-demo');
  await page.getByRole('tab', { name: 'Metadata', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText(syntheticFhir.meta.lastUpdated);
  await expect(page.getByRole('tabpanel')).toContainText('Not measured');
  expect(fixture.calls).toHaveLength(calls);
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('de');
  await page.getByRole('tab', { name: 'FHIR (JSON)', exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  await page.screenshot({
    path: test.info().outputPath('05-resource-explorer.png'),
    fullPage: true,
  });
});

for (const status of [401, 403, 404] as const) {
  test(`actual HAPI ${status} clears the previous payload while current authentication keeps the form enabled`, async ({
    page,
  }) => {
    const fixture = runtimeFixture();
    await fixture.install(page);
    await page.goto(workspacePath);
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-result-content pre')).toBeVisible();
    fixture.setResourceStatus(status);
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-resource-result')).toHaveAttribute(
      'data-outcome',
      status === 404 ? 'not-found' : 'denied',
    );
    await expect(page.locator('.mc-resource-summary')).toContainText(String(status));
    await expect(page.locator('.mc-resource-summary')).toContainText('HAPI');
    await expect(page.locator('.mc-result-content pre')).toHaveCount(0);
    await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
    await expect(page.locator('.runtime-status')).toContainText('Anmeldung erfolgreich');
  });
}

test('an actual boundary-shaped 429 honors safe retry time, adds no event and keeps logout independent', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.clock.install();
  await page.goto(workspacePath);
  await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
  fixture.setResourceStatus(429);
  const events = fixture.document.events.length;
  await page.locator('[data-runtime-action="resource"]').click();
  await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'throttled');
  await expect(page.locator('.mc-resource-summary')).toContainText('429');
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
  await expect(page.locator('[data-runtime-action="logout"]')).toBeEnabled();
  expect(fixture.document.events).toHaveLength(events);
  expect(await page.locator('body').textContent()).not.toContain(unsafeSentinel);
  const calls = fixture.calls.length;
  await page.clock.fastForward(2200);
  await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
  expect(fixture.calls).toHaveLength(calls);
  await page.locator('[data-runtime-action="logout"]').click();
  await expect(page.locator('.mc-resource-result')).toHaveCount(0);
});

test('BFF session rejection clears payload and disables the form with its actual source explained', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(workspacePath);
  await page.locator('[data-runtime-action="resource"]').click();
  await expect(page.locator('.mc-result-content pre')).toBeVisible();
  fixture.setSession({
    ...fixture.session,
    authenticated: false,
    expiresAt: null,
    currentRun: null,
  });
  await page.route(`${privateBaseUrl}/api/oauth/resource?**`, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        schemaVersion: 2,
        outcome: 'rejected',
        source: 'bff',
        reason: 'authentication-required',
      }),
    }),
  );
  await page.locator('[data-runtime-action="resource"]').click();
  await expect(page.locator('.mc-resource-summary')).toContainText('BFF');
  await expect(page.locator('.mc-resource-summary')).toContainText('401');
  await expect(page.locator('.mc-result-content pre')).toHaveCount(0);
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
  await expect(page.locator('[data-runtime-action="start"]')).toBeEnabled();
});

for (const locale of ['de', 'en']) {
  test(`resource result reflows with keyboard controls in ${locale} at 320px`, async ({ page }) => {
    const fixture = runtimeFixture();
    await fixture.install(page);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(workspacePath);
    await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption(locale);
    await page.locator('.mc-resource-form input').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.mc-result-content pre')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}

test('logout discards a held selected response and removes all previously displayed JSON', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(workspacePath);
  await page.locator('[data-runtime-action="resource"]').click();
  await expect(page.locator('.mc-result-content pre')).toBeVisible();
  let release: (() => void) | undefined;
  fixture.gateResource(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  try {
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'loading');
    await expect(page.locator('.mc-result-content pre')).toHaveCount(0);
    await page.locator('[data-runtime-action="logout"]').click();
    await expect(page.locator('.runtime-status')).toContainText('Lokal abgemeldet');
    release?.();
    await expect(page.locator('.mc-resource-result')).toHaveCount(0);
    await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
    await expect(page.locator('.mc-result-content pre')).toHaveCount(0);
  } finally {
    release?.();
  }
});

test('unsafe or foreign-run selected payloads never replace the current resource view', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto(workspacePath);
  const responses = [
    {
      schemaVersion: 2,
      outcome: 'allowed',
      source: 'hapi',
      runId: crypto.randomUUID(),
      resource: syntheticFhir,
      resourceServerReport: { available: false },
    },
    {
      schemaVersion: 2,
      outcome: 'allowed',
      source: 'hapi',
      runId: fixture.document.runId,
      resource: { ...syntheticFhir, subject: { reference: unsafeSentinel } },
      resourceServerReport: { available: false },
    },
  ];
  for (const body of responses) {
    await page.route(`${privateBaseUrl}/api/oauth/resource?**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
    );
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-resource-result')).toHaveAttribute(
      'data-outcome',
      'unavailable',
    );
    await expect(page.locator('.mc-result-content pre')).toHaveCount(0);
    expect(await page.locator('body').textContent()).not.toContain(unsafeSentinel);
    await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
  }
});

test('forged enabled DOM cannot submit an anonymous or unapproved selection', async ({ page }) => {
  const fixture = runtimeFixture(false);
  await fixture.install(page);
  await page.goto(workspacePath);
  await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
  await page.locator('.mc-resource-form').evaluate((form) => {
    form.querySelector('fieldset')?.removeAttribute('disabled');
    form.querySelector('button')?.removeAttribute('disabled');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  expect(fixture.calls.filter((call) => /resource|login|logout/.test(call.path))).toEqual([]);
  await expect(page.locator('.mc-result-content pre')).toHaveCount(0);
});

for (const transition of ['expiry', 'replacement', 'reload'] as const) {
  test(`validated resource JSON is cleared on ${transition} without a new FHIR request`, async ({
    page,
  }) => {
    const fixture = runtimeFixture();
    await page.clock.install();
    if (transition === 'expiry')
      fixture.setSession({
        ...fixture.session,
        expiresAt: new Date(Date.now() + 2000).toISOString(),
      });
    await fixture.install(page);
    await page.goto(workspacePath);
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-result-content pre')).toBeVisible();
    const reads = fixture.calls.filter((call) => call.path === '/api/oauth/resource').length;
    if (transition === 'expiry') {
      fixture.setSession({
        ...fixture.session,
        authenticated: false,
        expiresAt: null,
        currentRun: null,
      });
      await page.clock.fastForward(3000);
      await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
    } else if (transition === 'replacement') {
      fixture.setSession({
        ...fixture.session,
        currentRun: { ...fixture.session.currentRun!, runId: crypto.randomUUID() },
      });
      await page.evaluate(() =>
        dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
      );
      await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
    } else {
      await page.reload();
      await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
    }
    await expect(page.locator('.mc-result-content pre')).toHaveCount(0);
    expect(fixture.calls.filter((call) => call.path === '/api/oauth/resource')).toHaveLength(reads);
    expect(await page.locator('body').textContent()).not.toContain(unsafeSentinel);
  });
}
