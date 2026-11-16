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

for (const locale of ['de', 'en'] as const) {
  for (const width of [1366, 1024, 390, 320]) {
    test(`${locale} observed runtime preserves accessible panels and readable map at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width < 760 ? 844 : 768 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const fixture = runtimeFixture();
      await fixture.install(page);
      await page.goto(workspacePath);
      await page.getByRole('combobox').selectOption(locale);
      await expect(page.locator('.timeline button')).toHaveCount(9);
      const response = page.locator('[data-runtime-action="resource"]');
      await response.focus();
      await expect(response).toHaveCSS('outline-style', 'solid');
      await page.keyboard.press('Enter');
      await expect(page.locator('.timeline button')).toHaveCount(12);
      await page.locator('.timeline button').nth(10).focus();
      await page.keyboard.press('Space');
      await expect(page.locator('.timeline button').nth(10)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.locator('.inspector')).toContainText('res-server');
      await accessible(page);
      await page
        .getByRole('button', { name: locale === 'en' ? 'Zoom in' : 'Vergrößern', exact: true })
        .click();
      await page
        .getByRole('button', { name: locale === 'en' ? 'Fit' : 'Einpassen', exact: true })
        .click();
      await expect(page.locator('output')).toHaveText('100%');
      const map = page.locator('.actor-map-scroll');
      expect(
        await map.evaluate((element) => {
          const label = element.querySelector('.actor strong');
          return label !== null && Number.parseFloat(getComputedStyle(label).fontSize) >= 13;
        }),
      ).toBe(true);
      if (width < 1200) {
        const inspector = await page.locator('.inspector').boundingBox();
        const canvas = await page.locator('.canvas-panel').boundingBox();
        expect(Boolean(inspector && canvas && inspector.y >= canvas.y + canvas.height)).toBe(true);
      }
      await page
        .getByText(
          locale === 'en' ? 'Actor map text alternative' : 'Textalternative zur Akteursübersicht',
          { exact: true },
        )
        .click();
      await expect(page.locator('.text-alternative')).toContainText('auth-client');
      await accessible(page);
      await page.screenshot({
        path: test.info().outputPath(`runtime-observed-${locale}-${width}.png`),
        fullPage: true,
      });
    });
  }

  test(`${locale} runtime state screenshots retain the existing hierarchy`, async ({ page }) => {
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
        await page.getByRole('combobox').selectOption(locale);
        if (state === 'allowed' || state === 'denied') {
          fixture.setResourceStatus(state === 'allowed' ? 200 : 403);
          await page.locator('[data-runtime-action="resource"]').click();
          await expect(page.locator('.timeline button')).toHaveCount(12);
          await page.locator('.timeline button').nth(10).click();
        } else if (state === 'signed-out') {
          await page.locator('[data-runtime-action="logout"]').click();
          await expect(page.locator('.timeline button')).toHaveCount(10);
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
        await page.getByRole('combobox').selectOption(locale);
        await page
          .getByRole('button', {
            name: locale === 'en' ? 'Load fixture samples' : 'Beispiele laden',
            exact: true,
          })
          .click();
        await page.locator('.timeline button').nth(2).click();
        await accessible(page);
        await page.screenshot({
          path: test.info().outputPath(`native-${locale}-${zoom * 100}-fixture.png`),
          fullPage: true,
        });
        await page.goto(`${privateBaseUrl}${workspacePath}`);
        await page.getByRole('combobox').selectOption(locale);
        await expect(page.locator('.timeline button')).toHaveCount(9);
        await page.locator('.timeline button').nth(6).click();
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
        await page.screenshot({
          path: test.info().outputPath(`native-${locale}-${zoom * 100}-observed.png`),
          fullPage: true,
        });
        fixture.setResourceStatus(403);
        await page.locator('[data-runtime-action="resource"]').click();
        await expect(page.locator('.timeline button')).toHaveCount(12);
        await page.locator('.timeline button').nth(10).click();
        await accessible(page);
        await page.locator('[data-runtime-action="logout"]').click();
        await expect(page.locator('[data-runtime-action="resource"]')).toBeDisabled();
        await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
        const calls = fixture.calls.length;
        await page
          .getByRole('button', {
            name: locale === 'en' ? 'Replay explanation' : 'Erklärung wiederholen',
            exact: true,
          })
          .click();
        await page
          .getByRole('button', {
            name: locale === 'en' ? 'Reset view' : 'Ansicht zurücksetzen',
            exact: true,
          })
          .click();
        expect(fixture.calls.length).toBe(calls);
        await expect(page.locator('output')).toHaveText('100%');
        expect(await page.evaluate(() => devicePixelRatio)).toBe(zoom);
        await accessible(page);
        await page.screenshot({
          path: test.info().outputPath(`native-${locale}-${zoom * 100}-signed-out.png`),
          fullPage: true,
        });
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
