import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test, type Page } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runtimeFixture,
  privateBaseUrl,
  workspacePath,
  csrfSentinel,
} from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect((await page.locator('body').textContent())?.includes(csrfSentinel)).toBe(false);
}

async function nativeScreenshot(page: Page, path: string) {
  // Capture the actual compositor viewport. Playwright fullPage clipping uses CSS
  // dimensions at native page zoom and can crop the physical screenshot in half.
  const session = await page.context().newCDPSession(page);
  try {
    const { data } = await session.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    });
    const png = Buffer.from(data, 'base64');
    expect(png.readUInt32BE(16)).toBe(await page.evaluate(() => outerWidth));
    await writeFile(path, png);
  } finally {
    await session.detach();
  }
}

for (const locale of ['de', 'en'] as const) {
  for (const width of [1366, 1024, 390, 320]) {
    test(`${locale} Explore preserves accessible actions at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 760 ? 844 : 768 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const fixture = runtimeFixture();
      await fixture.install(page);
      await page.goto(workspacePath);
      await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(locale);
      const fetch = page.locator('[data-runtime-action="resource"]');
      await expect(fetch).toBeEnabled();
      await fetch.focus();
      await expect(fetch).toHaveCSS('outline-style', 'solid');
      const calls = fixture.calls.length;
      await page.locator('.mc-stage').nth(1).focus();
      await page.keyboard.press('Space');
      await expect(page.locator('.mc-stage').nth(1)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.mc-stages [data-outcome="complete"]')).toHaveCount(2);
      expect(fixture.calls.length).toBe(calls);
      await expect(page.locator('.mc-stage-explanation')).toHaveAttribute('aria-live', 'polite');
      await expect(page.locator('.runtime-status')).toHaveAttribute('role', 'status');
      await accessible(page);
      await fetch.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.mc-resource-message')).toContainText(
        locale === 'en' ? 'read allowed' : 'Lesezugriff erlaubt',
      );
      await accessible(page);
      await page.screenshot({
        path: test.info().outputPath(`runtime-observed-${locale}-${width}.png`),
        fullPage: true,
      });
    });
  }

  test(`${locale} runtime state screenshots retain the navy Explore hierarchy`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    for (const state of [
      'empty',
      'restoring',
      'authenticated',
      'allowed',
      'denied',
      'failed',
      'signed-out',
    ]) {
      await page.unrouteAll({ behavior: 'wait' });
      const fixture = runtimeFixture(state !== 'empty');
      if (state === 'failed') fixture.setSessionResponse({ unsupported: true });
      await fixture.install(page);
      let release: (() => void) | undefined;
      if (state === 'restoring') {
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route(`${privateBaseUrl}/api/oauth/session`, async (route) => {
          await gate;
          await route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(fixture.session),
          });
        });
      }
      try {
        await page.goto(workspacePath);
        await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(locale);
        if (state === 'allowed' || state === 'denied') {
          fixture.setResourceStatus(state === 'allowed' ? 200 : 403);
          await page.locator('[data-runtime-action="resource"]').click();
          await expect(page.locator('.mc-resource-message')).toBeVisible();
        } else if (state === 'signed-out') {
          await page.locator('[data-runtime-action="logout"]').click();
          await expect(page.locator('.runtime-status')).toContainText(
            locale === 'en' ? 'Locally signed out' : 'Lokal abgemeldet',
          );
        } else if (state === 'restoring') {
          await expect(page.locator('[data-runtime-action="start"]')).toBeDisabled();
          await expect(page.locator('.timeline button')).toHaveCount(0);
        } else {
          await expect(page.locator('[data-runtime-action="start"]')).toBeEnabled();
        }
        await accessible(page);
        await page.screenshot({
          path: test.info().outputPath(`runtime-state-${locale}-${state}.png`),
          fullPage: true,
        });
      } finally {
        release?.();
        await page.waitForLoadState();
      }
    }
  });

  test(`${locale} actual Chromium 100% and 200% zoom preserves fixture and runtime access`, async () => {
    test.setTimeout(120000);
    const executablePath = process.env.PLAYGROUND_NATIVE_CHROMIUM;
    test.skip(
      !executablePath,
      'Set PLAYGROUND_NATIVE_CHROMIUM to a full Chromium executable for native zoom verification.',
    );
    const profile = await mkdtemp(join(tmpdir(), 'epa-spa-zoom-'));
    const context = await chromium.launchPersistentContext(profile, {
      executablePath,
      headless: true,
      viewport: null,
      args: ['--window-size=1366,900'],
    });
    const evidence: object[] = [];
    try {
      const settings = await context.newPage();
      await settings.goto('chrome://settings');
      for (const zoom of [1, 2]) {
        const actual: unknown = await settings.evaluate((factor) => {
          // Chrome's own Settings API, checked at runtime in a regular isolated profile.
          const browser = window as typeof window & {
            chrome?: {
              settingsPrivate?: {
                setDefaultZoom: (zoom: number, callback: () => void) => void;
                getDefaultZoom: (callback: (zoom: number) => void) => void;
              };
            };
          };
          const api = browser.chrome?.settingsPrivate;
          if (!api) throw new Error('Native browser zoom API unavailable');
          return new Promise<number>((resolve) =>
            api.setDefaultZoom(factor, () => api.getDefaultZoom(resolve)),
          );
        }, zoom);
        expect(actual).toBe(zoom);
        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const fixture = runtimeFixture();
        await fixture.install(page);
        await page.goto(`http://127.0.0.1:4173${workspacePath}`);
        await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(locale);
        await page
          .getByRole('button', {
            name: locale === 'en' ? 'Load fixture samples' : 'Beispiele laden',
            exact: true,
          })
          .click();
        await page.locator('.timeline button').nth(2).click();
        await accessible(page);
        await nativeScreenshot(
          page,
          test.info().outputPath(`native-${locale}-${zoom * 100}-fixture.png`),
        );
        await page.goto(`${privateBaseUrl}${workspacePath}`);
        await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(locale);
        await expect(page.locator('[data-runtime-action="resource"]')).toBeEnabled();
        await page.locator('.mc-stage').nth(1).click();
        await accessible(page);
        const metrics = await page.evaluate(() => ({
          innerWidth,
          innerHeight,
          outerWidth,
          devicePixelRatio,
          visualScale: visualViewport?.scale,
          cssZoom: document.documentElement.style.zoom,
        }));
        expect(metrics.devicePixelRatio).toBe(zoom);
        expect(metrics.visualScale).toBe(1);
        expect(metrics.cssZoom).toBe('');
        evidence.push({ locale, requestedZoom: zoom, readbackZoom: actual, ...metrics });
        await nativeScreenshot(
          page,
          test.info().outputPath(`native-${locale}-${zoom * 100}-observed.png`),
        );
        await page.locator('[data-runtime-action="resource"]').click();
        await expect(page.locator('.mc-resource-result')).toHaveAttribute(
          'data-outcome',
          'allowed',
        );
        await accessible(page);
        await nativeScreenshot(
          page,
          test.info().outputPath(`native-${locale}-${zoom * 100}-resource.png`),
        );
        fixture.setResourceStatus(403);
        await page.locator('[data-runtime-action="resource"]').click();
        await expect(page.locator('.mc-resource-message')).toContainText('403');
        await accessible(page);
        await page.locator('.mc-panel-tabs a').nth(1).click();
        await expect(page.locator('.flow-transport')).toHaveAttribute('data-playing', 'false');
        await page.locator('.flow-transport button').last().focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.flow-transport')).toHaveAttribute('data-playback-index', '1');
        await accessible(page);
        await nativeScreenshot(
          page,
          test.info().outputPath(`native-${locale}-${zoom * 100}-flow.png`),
        );
        await page.locator('.mc-navigation a').last().click();
        await expect(page.locator('.timeline button')).toHaveCount(15);
        await page.locator('.timeline button').nth(2).click();
        const filterToggle = page.locator('.mc-event-filter-disclosure summary');
        await filterToggle.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.mc-event-filters')).toBeVisible();
        await page.locator('.mc-event-filters select').first().focus();
        await page.keyboard.press('Escape');
        await expect(filterToggle).toBeFocused();
        await accessible(page);
        await nativeScreenshot(
          page,
          test.info().outputPath(`native-${locale}-${zoom * 100}-inspect.png`),
        );
        await page.locator('.mc-navigation a').nth(1).click();
        await page.locator('.mc-quick-links a').first().click();
        await page.locator('[data-runtime-action="logout"]').click();
        await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
        await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
        const calls = fixture.calls.length;
        await page.locator('.mc-stage').nth(0).click();
        await page.locator('.mc-stage').nth(2).click();
        expect(fixture.calls.length).toBe(calls);
        expect(await page.evaluate(() => devicePixelRatio)).toBe(zoom);
        await accessible(page);
        await nativeScreenshot(
          page,
          test.info().outputPath(`native-${locale}-${zoom * 100}-signed-out.png`),
        );
        await page.close();
      }
      const normal = evidence[0];
      expect(evidence).toHaveLength(2);
      expect(Boolean(normal)).toBe(true);
      await test.info().attach('native-browser-zoom', {
        body: JSON.stringify({ browser: context.browser()?.version(), evidence }, null, 2),
        contentType: 'application/json',
      });
      await writeFile(
        test.info().outputPath('native-zoom.json'),
        JSON.stringify({ browser: context.browser()?.version(), evidence }, null, 2),
      );
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  });
}
