import AxeBuilder from '@axe-core/playwright';
import { chromium, expect, test, type Page } from '@playwright/test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });
const surfaces = ['catalog', 'oauth-explore', 'oauth-inspect', 'oauth-live', 'epa'] as const;
type Surface = (typeof surfaces)[number];

async function prepare(page: Page, surface: Surface, locale: string) {
  const paths: Record<Surface, string> = {
    catalog: '/missions',
    'oauth-explore': `${workspacePath}?execution=simulation`,
    'oauth-inspect': `${workspacePath}?execution=simulation&mode=inspect`,
    'oauth-live': `${workspacePath}?execution=live`,
    epa: '/missions/epa-concept/workspace?execution=simulation&panel=flow',
  };
  await page.goto(`${privateBaseUrl}${paths[surface]}`);
  await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(locale);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((image) => image.decode().catch(() => undefined)),
    );
  });
  if (surface === 'oauth-inspect' || surface === 'epa') {
    await page.locator('[data-runtime-action="start"]').first().click();
    const count = surface === 'epa' ? 3 : 5;
    for (let index = 0; index < count; index += 1) {
      await page.locator('[data-runtime-action="advance"]').first().click();
    }
    if (surface === 'oauth-inspect') {
      await page.locator('.timeline button').nth(1).click();
    }
  }
}

async function checkAccessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(
    page.locator('body > #root > .app-shell > .mc-header').or(page.locator('.mc-header')),
  ).toHaveCount(1);
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
}

for (const locale of ['de', 'en']) {
  test(`${locale} five surfaces preserve the shared navy shell and accessible reflow`, async ({
    page,
  }) => {
    test.setTimeout(240000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const fixture = runtimeFixture();
    await fixture.install(page);
    const metrics: object[] = [];
    for (const width of [1672, 1585, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1585 ? 992 : width < 500 ? 844 : 941 });
      for (const surface of surfaces) {
        await prepare(page, surface, locale);
        await checkAccessible(page);
        const header = await page.locator('.mc-header').boundingBox();
        metrics.push({ locale, surface, width, header });
        if (width > 500) {
          expect(header?.height).toBe(58);
        }
        await page.screenshot({
          path: test.info().outputPath(`${locale}-${width}-${surface}.png`),
          fullPage: true,
        });
      }
    }
    await writeFile(test.info().outputPath('geometry.json'), JSON.stringify(metrics, null, 2));
  });

  test(`${locale} five surfaces at actual native 100 and 200 percent browser zoom`, async () => {
    test.setTimeout(180000);
    const executablePath = process.env.PLAYGROUND_NATIVE_CHROMIUM;
    test.skip(
      !executablePath,
      'Set PLAYGROUND_NATIVE_CHROMIUM to a full Chromium executable for native zoom acceptance.',
    );
    const profile = await mkdtemp(join(tmpdir(), 'epa-unified-native-'));
    const context = await chromium.launchPersistentContext(profile, {
      executablePath,
      headless: true,
      viewport: null,
      args: ['--window-size=1366,900'],
    });
    try {
      const settings = await context.newPage();
      await settings.goto('chrome://settings');
      const evidence: object[] = [];
      for (const zoom of [1, 2]) {
        const actual = await settings.evaluate((factor) => {
          const browser = window as typeof window & {
            chrome?: {
              settingsPrivate?: {
                setDefaultZoom: (factor: number, callback: () => void) => void;
                getDefaultZoom: (callback: (factor: number) => void) => void;
              };
            };
          };
          const api = browser.chrome?.settingsPrivate;
          if (!api) {
            throw new Error('Native browser zoom API unavailable');
          }
          return new Promise<number>((resolve) =>
            api.setDefaultZoom(factor, () => api.getDefaultZoom(resolve)),
          );
        }, zoom);
        expect(actual).toBe(zoom);
        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await runtimeFixture().install(page);
        for (const surface of surfaces) {
          await prepare(page, surface, locale);
          await checkAccessible(page);
          const geometry = await page.evaluate(() => ({
            width: innerWidth,
            dpr: devicePixelRatio,
            cssZoom: document.documentElement.style.zoom,
            scale: visualViewport?.scale,
          }));
          expect(geometry.dpr).toBe(zoom);
          expect(geometry.cssZoom).toBe('');
          expect(geometry.scale).toBe(1);
          evidence.push({ surface, locale, zoom, actual, ...geometry });
          const cdp = await context.newCDPSession(page);
          const capture = await cdp.send('Page.captureScreenshot', {
            format: 'png',
            captureBeyondViewport: false,
          });
          await writeFile(
            test.info().outputPath(`native-${locale}-${zoom * 100}-${surface}.png`),
            Buffer.from(capture.data, 'base64'),
          );
          await cdp.detach();
        }
        await page.close();
      }
      await writeFile(
        test.info().outputPath('native-zoom.json'),
        JSON.stringify(evidence, null, 2),
      );
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  });
}
