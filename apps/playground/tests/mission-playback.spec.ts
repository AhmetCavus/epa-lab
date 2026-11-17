import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  loginEvents,
  observedEvent,
  privateBaseUrl,
  runtimeFixture,
  workspacePath,
} from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });
const flowPath = `${workspacePath}?panel=flow`;

test('recorded playback is deterministic, bounded, paused at end and never executes protocol work', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.clock.install();
  await page.goto(flowPath);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  const transport = page.locator('.flow-transport');
  await expect(transport).toHaveAttribute('data-playback-index', '0');
  const calls = fixture.calls.length;
  await expect(transport.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.fastForward(1201);
  await expect(transport).toHaveAttribute('data-playback-index', '1');
  await transport.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.fastForward(5000);
  await expect(transport).toHaveAttribute('data-playback-index', '1');
  await transport.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(transport).toHaveAttribute('data-playback-index', '2');
  await transport.getByRole('button', { name: 'Previous', exact: true }).click();
  await transport.getByRole('button', { name: 'Replay', exact: true }).click();
  await expect(transport).toHaveAttribute('data-playback-index', '0');
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  for (let index = 1; index < 9; index += 1) {
    await page.clock.fastForward(1201);
    await expect(transport).toHaveAttribute('data-playback-index', String(index));
  }
  await expect(transport).toHaveAttribute('data-playing', 'false');
  await expect(transport.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  expect(fixture.calls).toHaveLength(calls);
});

for (const count of [0, 3]) {
  test(`playback retains only ${count} incomplete frames and cannot invent completion`, async ({
    page,
  }) => {
    const fixture = runtimeFixture();
    fixture.setEvents({
      ...fixture.document,
      complete: false,
      events: fixture.document.events.slice(0, count),
    });
    await fixture.install(page);
    await page.clock.install();
    await page.goto(flowPath);
    await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
    const transport = page.locator('.flow-transport');
    await expect(transport).toHaveAttribute('data-playback-index', count ? '0' : '-1');
    if (count) {
      await transport.getByRole('button', { name: 'Play', exact: true }).click();
      for (let index = 1; index < count; index += 1) {
        await page.clock.fastForward(1201);
        await expect(transport).toHaveAttribute('data-playback-index', String(index));
      }
      await expect(transport).toHaveAttribute('data-playing', 'false');
    } else {
      await expect(transport.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
      await expect(transport.getByRole('button', { name: 'Replay', exact: true })).toBeDisabled();
    }
    await expect(transport.locator('output')).toHaveText(`Event ${count} / ${count}`);
    expect(fixture.calls.filter((call) => /login|logout|resource/.test(call.path))).toHaveLength(0);
  });
}

test('leaving playback cancels timers and a replacement trace restores paused at its first real frame', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.clock.install();
  await page.goto(flowPath);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  const transport = page.locator('.flow-transport');
  await expect(transport).toHaveAttribute('data-playback-index', '0');
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Workspace', exact: true })
    .getByRole('link', { name: 'Inspect', exact: true })
    .click();
  await expect(page.locator('[data-view="inspect"]')).toBeVisible();
  const selected = await page
    .locator('.timeline [aria-pressed="true"] .sample-number')
    .textContent();
  await page.clock.fastForward(5000);
  await expect(page.locator('.timeline [aria-pressed="true"] .sample-number')).toHaveText(
    selected ?? '',
  );
  await page
    .getByRole('navigation', { name: 'Workspace', exact: true })
    .getByRole('link', { name: 'Explore', exact: true })
    .click();
  await expect(transport).toHaveAttribute('data-playing', 'false');
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  const runId = crypto.randomUUID();
  fixture.setSession({
    ...fixture.session,
    currentRun: {
      runId,
      outcome: 'authenticated',
      expiresAt: fixture.document.expiresAt,
      observationsAvailable: true,
    },
  });
  fixture.setEvents({ ...fixture.document, runId, events: loginEvents(runId) });
  await page.locator('[data-runtime-action="restore"]').click();
  await expect(transport).toHaveAttribute('data-playing', 'false');
  await expect(transport).toHaveAttribute('data-playback-index', '0');
  await page.clock.fastForward(5000);
  await expect(transport).toHaveAttribute('data-playback-index', '0');
  expect(fixture.calls.filter((call) => /login|logout|resource/.test(call.path))).toHaveLength(0);
});

test('four-participant diagram maps actual channels, groups Keycloak roles and keeps local checks arrowless', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.setViewportSize({ width: 1672, height: 941 });
  await page.goto(flowPath);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  await expect(page.locator('.flow-participant')).toHaveCount(4);
  await expect(page.locator('.flow-participant[data-participant="bff"]')).toHaveAttribute(
    'data-active',
    'true',
  );
  await expect(page.locator('.flow-path')).toHaveCount(0);
  const overview = page.locator('.flow-overview button');
  const calls = fixture.calls.length;
  await overview.nth(2).click();
  await expect(page.locator('.flow-path > path')).toHaveAttribute('data-source', 'browser');
  await expect(page.locator('.flow-path > path')).toHaveAttribute('data-target', 'bff');
  await expect(page.locator('.flow-path > path')).toHaveAttribute('data-channel', 'front');
  await overview.nth(3).click();
  await expect(page.locator('.flow-path > path')).toHaveAttribute('data-source-participant', 'bff');
  await expect(page.locator('.flow-path > path')).toHaveAttribute(
    'data-target-participant',
    'keycloak',
  );
  await expect(page.locator('.flow-path > path')).toHaveAttribute('data-channel', 'back');
  await expect(page.locator('.flow-participant[data-participant="keycloak"]')).toHaveAttribute(
    'data-active',
    'true',
  );
  await overview.nth(6).click();
  await expect(page.locator('.flow-path')).toHaveCount(0);
  await expect(page.locator('.flow-participant[data-active="true"]')).toHaveCount(1);
  await expect(page.locator('.flow-connection')).toContainText('no network arrow');
  expect(fixture.calls).toHaveLength(calls);
  await overview.nth(2).click();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('de');
  await page.screenshot({ path: test.info().outputPath('04-animated-flow.png'), fullPage: true });
});

test('a failed recorded run stops at its real rejection and never plays an ideal success sequence', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  const failed = observedEvent(fixture.document.runId, 3, {
    kind: 'authorization-failed',
    channel: 'actor-local',
    actorId: 'bff',
    outcome: 'failed',
    evidence: { reason: 'authorization-unavailable' },
  });
  const cleanup = observedEvent(fixture.document.runId, 4, {
    kind: 'session-ended',
    channel: 'actor-local',
    actorId: 'bff',
    outcome: 'signed-out',
    evidence: { reason: 'local-logout', authenticationRemoved: false },
  });
  fixture.setSession({
    ...fixture.session,
    authenticated: false,
    expiresAt: null,
    currentRun: {
      runId: fixture.document.runId,
      outcome: 'authentication-failed',
      expiresAt: fixture.document.expiresAt,
      observationsAvailable: true,
    },
  });
  fixture.setEvents({
    ...fixture.document,
    complete: false,
    events: [...fixture.document.events.slice(0, 2), failed, cleanup],
  });
  await fixture.install(page);
  await page.clock.install();
  await page.goto(flowPath);
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  const transport = page.locator('.flow-transport');
  await expect(transport).toHaveAttribute('data-playing', 'false');
  await expect(page.locator('.flow-overview button')).toHaveCount(4);
  const calls = fixture.calls.length;
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  for (let index = 1; index <= 2; index += 1) {
    await page.clock.fastForward(1201);
    await expect(transport).toHaveAttribute('data-playback-index', String(index));
  }
  await expect(transport).toHaveAttribute('data-playing', 'false');
  await page.clock.fastForward(10000);
  await expect(transport).toHaveAttribute('data-playback-index', '2');
  await expect(page.locator('.mc-stages [data-outcome="complete"]')).toHaveCount(0);
  await expect(page.locator('.flow-gap')).toBeVisible();
  expect(fixture.calls).toHaveLength(calls);
});

for (const locale of ['de', 'en']) {
  for (const width of [1672, 1024, 320]) {
    test(`reduced-motion playback provides instant keyboard frames in ${locale} at ${width}px`, async ({
      page,
    }) => {
      const fixture = runtimeFixture();
      await fixture.install(page);
      await page.clock.install();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 941 });
      await page.goto(flowPath);
      await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption(locale);
      const transport = page.locator('.flow-transport');
      await expect(transport).toHaveAttribute('data-playback-index', '0');
      const calls = fixture.calls.length;
      await expect(
        transport.getByRole('button', {
          name: locale === 'de' ? 'Abspielen' : 'Play',
          exact: true,
        }),
      ).toBeDisabled();
      const next = transport.getByRole('button', {
        name: locale === 'de' ? 'Weiter' : 'Next',
        exact: true,
      });
      await next.focus();
      await page.keyboard.press('Enter');
      await expect(transport).toHaveAttribute('data-playback-index', '1');
      await expect(next).toBeFocused();
      await expect(page.locator('.flow-path > path')).toHaveCSS('animation-name', 'none');
      await page.clock.fastForward(5000);
      await expect(transport).toHaveAttribute('data-playback-index', '1');
      expect(fixture.calls).toHaveLength(calls);
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
}

test('locale retains playback intent and a changed reduced-motion preference cancels autoplay', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  await page.clock.install();
  await page.goto(flowPath);
  const transport = page.locator('.flow-transport');
  await expect(transport).toHaveAttribute('data-playback-index', '0');
  await transport.getByRole('button', { name: 'Abspielen', exact: true }).click();
  await page.getByRole('combobox', { name: 'Sprache', exact: true }).selectOption('en');
  await expect(transport).toHaveAttribute('data-playing', 'true');
  await expect(transport).toHaveAttribute('data-playback-index', '0');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(transport).toHaveAttribute('data-playing', 'false');
  await page.clock.fastForward(5000);
  await expect(transport).toHaveAttribute('data-playback-index', '0');
  expect(fixture.calls.filter((call) => /login|resource|logout/.test(call.path))).toHaveLength(0);
});
