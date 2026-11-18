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
  await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(locale);
  await expect(page.locator('.mc-runtime-badge')).toHaveText(
    locale === 'en' ? 'Real protocol execution' : 'Echte Protokollausführung',
  );
  await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
  return fixture;
}

async function inspect(page: Page) {
  await page
    .getByRole('navigation', { name: /Workspace|Arbeitsbereich/, exact: true })
    .getByRole('link', { name: 'Inspect', exact: true })
    .click();
}

async function explore(page: Page) {
  await page
    .getByRole('navigation', { name: /Workspace|Arbeitsbereich/, exact: true })
    .getByRole('link', { name: 'Explore', exact: true })
    .click();
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

test('private restoration is read-only and Inspector provenance stays synchronized', async ({
  page,
}) => {
  const fixture = await open(page);
  await expect(page.locator('.mc-page-heading')).toContainText('protected FHIR resource access');
  await inspect(page);
  await expect(page.locator('.timeline button')).toHaveCount(9);
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
  await expect(page.locator('.timeline button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.inspector')).toContainText('BFF');
  await expect(page.locator('.inspector')).toContainText('Browser');
  await page.locator('.timeline button').nth(6).click();
  await expect(page.locator('.inspector')).toContainText('Actor-local');
  await expect(page.locator('.inspector .badge').first()).toHaveText('Observed');
  await safeSurface(page);
});

test('language, stages, mode changes and status reads preserve run identity without executing', async ({
  page,
}) => {
  const fixture = await open(page);
  const run = fixture.document.runId;
  const ids = fixture.document.events.map((event) => event.eventId);
  await page.locator('.mc-stage').nth(1).click();
  await inspect(page);
  await page.locator('.timeline button').nth(3).click();
  const calls = fixture.calls.length;
  await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption('de');
  await expect(page.locator('.timeline button').nth(3)).toHaveAttribute('aria-pressed', 'true');
  await explore(page);
  await expect(page.locator('.mc-stage').nth(1)).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.calls.length).toBe(calls);
  await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption('en');
  await page.locator('[data-runtime-action="restore"]').click();
  await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
  await inspect(page);
  await expect(page.locator('.timeline button').nth(3)).toHaveAttribute('aria-pressed', 'true');
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
  await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
  const firstRun = fixture.document.runId;
  await page.locator('[data-runtime-action="start"]').click();
  await expect.poll(() => fixture.document.runId !== firstRun).toBe(true);
  await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
  await inspect(page);
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
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.mc-resource-message')).toBeVisible();
    await expect(page.locator('.runtime-status')).toContainText('Authentication successful');
    await expect(page.locator('.mc-resource-message')).toContainText(
      status === 200 ? 'read allowed' : `HTTP ${status}`,
    );
    await inspect(page);
    await expect(page.locator('.timeline button')).toHaveCount(12);
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
  await page.locator('[data-runtime-action="resource"]').click();
  await expect(page.locator('.mc-resource-message')).toBeVisible();
  await inspect(page);
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
  await page.locator('[data-runtime-action="logout"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
  await expect(page.locator('[data-runtime-action="start"]')).toBeFocused();
  await inspect(page);
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
  await page.locator('[data-runtime-action="logout"]').click();
  await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
  await expect(page.locator('.runtime-status')).toContainText('Some observations are unavailable');
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
  await inspect(page);
  await expect(page.locator('.timeline button')).toHaveCount(9);
  expect(fixture.document.events.map((event) => event.eventId)).toEqual(ids);
});

test('capacity rejection preserves independent sign-out capability', async ({ page }) => {
  const fixture = await open(page);
  await page.route(`${privateBaseUrl}/api/oauth/resource**`, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ errorCode: 'internalError', errorDetail: unsafeSentinel }),
    }),
  );
  await page.locator('[data-runtime-action="resource"]').click();
  await expect(page.getByRole('alert')).toContainText('Run capacity is unavailable');
  await expect(page.locator('[data-runtime-action="logout"]')).toBeEnabled();
  await page.locator('[data-runtime-action="logout"]').click();
  await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
  expect(fixture.calls.some((call) => call.path === '/api/oauth/logout')).toBe(true);
  await safeSurface(page);
});

for (const invalid of ['version', 'secret', 'sequence', 'ownership']) {
  test(`unsupported ${invalid} event data has no raw fallback or fabricated progress`, async ({
    page,
  }) => {
    const diagnostics: string[] = [];
    page.on('console', (message) => diagnostics.push(message.text()));
    page.on('pageerror', (error) => diagnostics.push(error.message));
    const fixture = runtimeFixture();
    const document = structuredClone(fixture.document);
    if (invalid === 'version') Object.assign(document, { schemaVersion: 2, raw: unsafeSentinel });
    if (invalid === 'secret')
      Object.assign(document.events[0]?.evidence ?? {}, { token: unsafeSentinel });
    if (invalid === 'sequence') Object.assign(document.events[0] ?? {}, { sequence: 3 });
    if (invalid === 'ownership') Object.assign(document, { runId: crypto.randomUUID() });
    fixture.setEvents(document);
    await open(page, fixture);
    await expect(page.locator('.runtime-status')).toContainText(
      'Some observations are unavailable',
    );
    await inspect(page);
    await expect(page.locator('.timeline button')).toHaveCount(0);
    await expect(page.locator('[data-runtime-action="logout"]')).toBeEnabled();
    await safeSurface(page);
    expect(diagnostics.join(' ')).not.toContain(unsafeSentinel);
    expect(diagnostics.join(' ')).not.toContain(csrfSentinel);
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
  await expect(page.getByRole('alert')).toContainText('Unsupported or unsafe response rejected');
  await inspect(page);
  await expect(page.locator('.timeline button')).toHaveCount(0);
  await explore(page);
  await expect(page.getByRole('button', { name: 'Start authentication' })).toBeEnabled();
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
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
    await expect(page.locator('[data-runtime-action="start"]')).toBeEnabled();
    await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
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
  await inspect(page);
  await page.clock.fastForward(3000);
  await expect(page.locator('.timeline button')).toHaveCount(0);
  await explore(page);
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
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
    await page.locator('[data-runtime-action="resource"]').click();
    await expect(page.locator('.runtime-status')).toContainText('Fetching the resource');
    await page.locator('[data-runtime-action="logout"]').click();
    await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
    release?.();
    await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
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
  await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption('en');
  await page.getByRole('link', { name: 'Start simulation', exact: true }).first().click();
  await expect(page.locator('[data-execution="simulation"]')).toBeVisible();
  await page.locator('[data-runtime-action="start"]').first().click();
  await expect(page.locator('[data-runtime-action="logout"]')).toHaveCount(0);
  await page.goto('/missions/epa-concept/workspace');
  await expect(page.locator('[data-execution="simulation"]')).toBeVisible();
  await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
  expect(fixture.calls).toEqual([]);
});

test('logout commits immediately while observation history is held pending', async ({ page }) => {
  const fixture = await open(page);
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
    await page.locator('[data-runtime-action="logout"]').click();
    await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
    await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
    await expect(page.locator('[data-runtime-action="start"]')).toBeEnabled();
    await expect(page.locator('[data-runtime-action="start"]')).toBeFocused();
    expect(fixture.calls.filter((call) => call.path === '/api/oauth/logout')).toHaveLength(1);
  } finally {
    release?.();
  }
});

test('a delayed earlier history response cannot replace the new signed-out context', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  const earlier = structuredClone(fixture.document);
  await fixture.install(page);
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let reads = 0;
  await page.route(`${privateBaseUrl}/api/oauth/runs/*/events`, async (route) => {
    reads += 1;
    if (reads === 1) {
      await pending;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(earlier) });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(fixture.document),
    });
  });
  try {
    await page.goto(workspacePath);
    await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption('en');
    await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
    await page.locator('[data-runtime-action="logout"]').click();
    await expect(page.locator('.runtime-status')).toContainText('Locally signed out');
    await inspect(page);
    await expect(page.locator('.timeline button')).toHaveCount(10);
    release?.();
    await expect(page.locator('.timeline button')).toHaveCount(10);
    await explore(page);
    await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
    await safeSurface(page);
  } finally {
    release?.();
  }
});
