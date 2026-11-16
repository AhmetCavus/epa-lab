import { expect, test, type Page } from '@playwright/test';
import {
  csrfSentinel,
  privateBaseUrl,
  runtimeFixture,
  unsafeSentinel,
  workspacePath,
} from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

test('private proxy failure omits callback queries and upstream diagnostics', async ({
  request,
}) => {
  const response = await request.get(
    `${privateBaseUrl}/api/oauth/callback?code=${unsafeSentinel}&state=${csrfSentinel}`,
  );
  expect(response.status()).toBe(500);
  const body = await response.text();
  expect(body.includes(unsafeSentinel) || body.includes(csrfSentinel)).toBe(false);
});

async function open(page: Page, fixture = runtimeFixture(), locale: 'de' | 'en' = 'en') {
  await fixture.install(page);
  await page.goto(workspacePath);
  await page.getByRole('combobox').selectOption(locale);
  await expect(page.locator('.workspace-status [role="status"]')).toHaveText(
    locale === 'en' ? 'Private integration' : 'Private Integration',
  );
  return fixture;
}

async function safeSurface(page: Page) {
  const content = await page.locator('body').textContent();
  expect(content?.includes(unsafeSentinel)).toBe(false);
  expect(content?.includes(csrfSentinel)).toBe(false);
  expect(
    await page.evaluate(() => ({
      local: Object.entries(localStorage),
      session: sessionStorage.length,
      cookie: document.cookie,
    })),
  ).toEqual({
    local: [['auth-protocol-playground.locale', await page.locator('html').getAttribute('lang')]],
    session: 0,
    cookie: '',
  });
}

test('private restoration is read-only and event/actor/Inspector provenance stays synchronized', async ({
  page,
}) => {
  const fixture = await open(page);
  await expect(page.locator('.timeline button')).toHaveCount(9);
  await expect(page.locator('.channel-legend')).toContainText('Actor-local observation');
  await expect(page.locator('.channel-legend')).not.toContainText('Provider internal');
  await expect(page.locator('.site-footer')).toContainText('Private verification environment');
  await expect(page.locator('.workspace-heading')).toContainText('private integration');
  expect(
    fixture.calls.every(
      (call) => call.method === 'GET' && !call.navigation && call.sameOrigin && !call.bearer,
    ),
  ).toBe(true);
  const redirect = fixture.document.events[1];
  if (!redirect) throw new Error('Expected redirect');
  await page.locator('.timeline button').nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.inspector')).toContainText('auth-client');
  await expect(page.locator('.inspector time')).toHaveText(redirect.observedAt);
  await expect(page.locator('.interaction-target[aria-pressed="true"]')).toHaveAttribute(
    'data-event-id',
    redirect.eventId,
  );
  await expect(
    page.locator('.interaction-path[data-selected="true"] .communication-edge'),
  ).toHaveAttribute('data-source', 'bff');
  await expect(
    page.locator('.interaction-path[data-selected="true"] .communication-edge'),
  ).toHaveAttribute('data-target', 'browser');
  await expect(page.locator('.actor.highlighted')).toHaveCount(2);
  await page.locator('.timeline button').nth(6).click();
  await expect(
    page.locator('.interaction-path[data-selected="true"] .communication-edge'),
  ).toHaveCount(0);
  await expect(page.locator('.inspector .badge').first()).toHaveText('Observed');
  await expect(
    page.locator(
      '.communication-edge[data-source="identity-provider"], .communication-edge[data-target="identity-provider"]',
    ),
  ).toHaveCount(0);
  await page.locator('.actor[data-actor-id="identity-provider"]').click();
  await expect(page.locator('.timeline [aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('.inspector .provenance')).toContainText('None — not observed');
  await safeSurface(page);
});

test('language, checkpoint, replay, reset and status reads preserve run identity without executing', async ({
  page,
}) => {
  const fixture = await open(page);
  const run = fixture.document.runId;
  const ids = fixture.document.events.map((event) => event.eventId);
  await page.locator('.checkpoint').nth(2).click();
  await page.locator('.timeline button').nth(3).click();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const calls = fixture.calls.length;
  await page.getByRole('combobox').selectOption('de');
  await expect(page.locator('.checkpoint').nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.timeline button').nth(3)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Diagrammzoom')).toHaveText('125%');
  expect(fixture.calls.length).toBe(calls);
  await page.getByRole('combobox').selectOption('en');
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.getByLabel('Map zoom')).toHaveText('100%');
  await expect(page.locator('.timeline button')).toHaveCount(9);
  await page.getByRole('button', { name: 'Replay explanation' }).click();
  await expect(page.locator('.timeline button').first()).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.calls.length).toBe(calls);
  await page.getByRole('button', { name: 'Refresh status' }).click();
  await expect(page.getByRole('button', { name: 'Refresh status' })).toBeEnabled();
  await expect(page.locator('.timeline button').first()).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.timeline button')).toHaveCount(9);
  expect(fixture.document.runId).toBe(run);
  expect(fixture.document.events.map((event) => event.eventId)).toEqual(ids);
  expect(fixture.calls.some((call) => /login|resource|logout/.test(call.path))).toBe(false);
});

test('Start and Retry use top-level navigation and fresh run identities', async ({ page }) => {
  const fixture = await open(page, runtimeFixture(false), 'de');
  await expect(page.getByRole('button', { name: 'Ressource abrufen' })).toBeDisabled();
  await page.getByRole('button', { name: 'Anmeldung starten' }).focus();
  await expect(page.getByRole('button', { name: 'Anmeldung starten' })).toHaveCSS(
    'outline-style',
    'solid',
  );
  await page.keyboard.press('Enter');
  await expect(page.locator('.timeline button')).toHaveCount(9);
  const firstRun = fixture.document.runId;
  await page.getByRole('button', { name: 'Ablauf neu starten' }).click();
  await expect.poll(() => fixture.document.runId !== firstRun).toBe(true);
  await expect(page.locator('.timeline button')).toHaveCount(9);
  const starts = fixture.calls.filter((call) => call.path === '/api/oauth/login');
  expect(starts).toHaveLength(2);
  expect(starts.every((call) => call.navigation && call.method === 'GET')).toBe(true);
});

for (const status of [200, 401, 403] as const) {
  test(`actual resource DTO ${status} remains independent of application authentication`, async ({
    page,
  }) => {
    const fixture = await open(page);
    fixture.setResourceStatus(status);
    await page.getByRole('button', { name: 'Access resource' }).click();
    await expect(page.locator('.timeline button')).toHaveCount(12);
    await expect(page.locator('.runtime-status')).toContainText(
      'Application authentication: authenticated.',
    );
    await expect(page.locator('.runtime-status')).toContainText(
      status === 200 ? 'read allowed' : `HTTP ${status}`,
    );
    await page.locator('.timeline button').nth(10).click();
    await expect(page.locator('.inspector')).toContainText('Reported by');
    await expect(page.locator('.inspector')).toContainText('res-server');
    await expect(page.locator('.inspector .provenance')).toContainText('auth-client');
    await expect(page.locator('.inspector')).toContainText(
      status === 200
        ? 'demo-read-allowed'
        : status === 401
          ? 'invalid-token'
          : 'insufficient-permission',
    );
    await safeSurface(page);
  });
}

test('an unavailable HAPI report is explicit and never inferred from successful HTTP', async ({
  page,
}) => {
  const fixture = await open(page);
  fixture.setReportAvailable(false);
  await page.getByRole('button', { name: 'Access resource' }).click();
  await expect(page.locator('.timeline button')).toHaveCount(12);
  await page.locator('.timeline button').nth(10).click();
  await expect(page.locator('.inspector')).toContainText('Decision report unavailable');
  await expect(page.locator('.inspector')).not.toContainText('demo-read-allowed');
});

test('logout uses CSRF, removes resource capability and keeps eligible owned history', async ({
  page,
}) => {
  const fixture = await open(page);
  const run = fixture.document.runId;
  await page.getByRole('button', { name: 'Sign out' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
  await expect(page.getByRole('button', { name: 'Access resource' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry flow' })).toBeFocused();
  await expect(page.locator('.timeline button')).toHaveCount(10);
  expect(fixture.calls.find((call) => call.path === '/api/oauth/logout')).toMatchObject({
    method: 'POST',
    csrfValid: true,
    sameOrigin: true,
    bearer: false,
  });
  expect(fixture.document.runId).toBe(run);
  await page.locator('.timeline button').first().click();
  await expect(page.locator('.inspector')).toContainText('auth-client');
  await safeSurface(page);
});

test('full/failing teaching storage cannot undo authoritative signed-out state or invent a logout event', async ({
  page,
}) => {
  const fixture = await open(page);
  fixture.failLogoutObservation();
  const ids = fixture.document.events.map((event) => event.eventId);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
  await expect(page.locator('.runtime-status')).toContainText('Trace incomplete or unavailable');
  await expect(page.locator('.timeline button')).toHaveCount(9);
  expect(fixture.document.events.map((event) => event.eventId)).toEqual(ids);
  await expect(page.getByRole('button', { name: 'Access resource' })).toBeDisabled();
});

test('capacity rejection preserves independent sign-out capability', async ({ page }) => {
  const fixture = await open(page);
  await page.route(`${privateBaseUrl}/api/oauth/resource`, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ errorCode: 'internalError', errorDetail: unsafeSentinel }),
    }),
  );
  await page.getByRole('button', { name: 'Access resource' }).click();
  await expect(page.locator('.runtime-status')).toContainText('Run capacity is unavailable');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
  expect(fixture.calls.some((call) => call.path === '/api/oauth/logout')).toBe(true);
  await safeSurface(page);
});

for (const invalid of ['version', 'secret', 'sequence', 'ownership']) {
  test(`unsupported ${invalid} event data has no raw fallback or fabricated progress`, async ({
    page,
  }) => {
    const fixture = runtimeFixture();
    const document = structuredClone(fixture.document);
    if (invalid === 'version') Object.assign(document, { schemaVersion: 2, raw: unsafeSentinel });
    if (invalid === 'secret')
      Object.assign(document.events[0]?.evidence ?? {}, { token: unsafeSentinel });
    if (invalid === 'sequence') Object.assign(document.events[0] ?? {}, { sequence: 3 });
    if (invalid === 'ownership') Object.assign(document, { runId: crypto.randomUUID() });
    fixture.setEvents(document);
    await open(page, fixture);
    await expect(page.locator('.runtime-status')).toContainText('Trace incomplete or unavailable');
    await expect(page.locator('.timeline button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    await safeSurface(page);
  });
}

test('unsafe session response offers safe recovery without displaying credentials', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  fixture.setSessionResponse({
    ...fixture.session,
    access_token: unsafeSentinel,
    claims: { sub: unsafeSentinel },
  });
  await open(page, fixture);
  await expect(page.locator('.runtime-status')).toContainText(
    'Unsupported or unsafe response rejected',
  );
  await expect(page.locator('.timeline button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start authentication' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Access resource' })).toBeDisabled();
  await safeSurface(page);
});

for (const outcome of [
  'pending',
  'provider-denied',
  'authentication-failed',
  'cancelled',
  'expired',
] as const) {
  test(`restores ${outcome} without executing or guessing provider success`, async ({ page }) => {
    const fixture = runtimeFixture();
    fixture.setSession({
      ...fixture.session,
      authenticated: false,
      expiresAt: null,
      currentRun: {
        runId: fixture.document.runId,
        outcome,
        expiresAt: fixture.document.expiresAt,
        observationsAvailable: true,
      },
    });
    await open(page, fixture);
    await expect(page.getByRole('button', { name: 'Retry flow' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Access resource' })).toBeDisabled();
    expect(fixture.calls.every((call) => call.method === 'GET' && !call.navigation)).toBe(true);
    if (outcome === 'pending') {
      await page.getByRole('button', { name: 'Cancel pending login' }).click();
      await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
    }
  });
}

test('expiry and browser return restore status only and do not reconstruct a lost run', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await page.clock.install({ time: new Date() });
  fixture.setSession({ ...fixture.session, expiresAt: new Date(Date.now() + 2000).toISOString() });
  await open(page, fixture);
  fixture.setSession({
    ...fixture.session,
    authenticated: false,
    expiresAt: null,
    currentRun: null,
  });
  await page.clock.fastForward(3000);
  await expect(page.locator('.timeline button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Access resource' })).toBeDisabled();
  const calls = fixture.calls.length;
  await page.evaluate(() =>
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await expect.poll(() => fixture.calls.length > calls).toBe(true);
  expect(fixture.calls.every((call) => call.method === 'GET' && !call.navigation)).toBe(true);
});

test('late resource completion cannot restore the signed-out UI', async ({ page }) => {
  const fixture = await open(page);
  let release: (() => void) | undefined;
  fixture.gateResource(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  try {
    await page.getByRole('button', { name: 'Access resource' }).click();
    await expect(page.locator('.workspace-status [role="status"]')).toHaveText(
      'Requesting the synthetic resource…',
    );
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
    release?.();
    await expect(page.getByRole('button', { name: 'Access resource' })).toBeDisabled();
    await expect(page.locator('.runtime-status')).not.toContainText('read allowed');
  } finally {
    release?.();
  }
});

test('private fixture preview and conceptual ePA remain completely isolated from backend execution', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.goto('/missions');
  await page.getByRole('combobox').selectOption('en');
  await expect(page.getByText('Fixture preview', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open private integration test' })).toBeVisible();
  await page.getByRole('link', { name: 'Preview fixture' }).click();
  await page.getByRole('button', { name: 'Load fixture samples' }).click();
  await expect(page.locator('.timeline button')).toHaveCount(4);
  await expect(page.locator('[data-runtime-action]')).toHaveCount(0);
  await page.goto('/missions/epa-concept/workspace');
  await expect(page.locator('.timeline button')).toHaveCount(0);
  await expect(page.locator('[data-runtime-action]')).toHaveCount(0);
  expect(fixture.calls).toEqual([]);
});
