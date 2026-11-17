import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });
const scenarios = [
  { name: '00-navy', width: 706, height: 1249, panel: '', read: false },
  { name: '01-explore', width: 1672, height: 941, panel: '', read: true },
  { name: '02-inspect', width: 1585, height: 992, panel: '?mode=inspect', read: false },
  { name: '03-animated-flow', width: 1672, height: 941, panel: '?panel=flow', read: false },
  { name: '04-resource-explorer', width: 1672, height: 941, panel: '?panel=resources', read: true },
];

for (const scenario of scenarios) {
  test(`native visual acceptance capture ${scenario.name}`, async ({ page, browser }) => {
    const fixture = runtimeFixture();
    await fixture.install(page);
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await page.goto(`${workspacePath}${scenario.panel}`);
    await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
    if (scenario.read) {
      await page.locator('[data-runtime-action="resource"]').click();
      await expect(page.locator('.mc-resource-result')).toHaveAttribute('data-outcome', 'allowed');
    }
    if (scenario.name === '02-inspect') {
      await expect(page.locator('.timeline button')).toHaveCount(9);
      await page.locator('.timeline button').nth(2).click();
    }
    if (scenario.name === '03-animated-flow') {
      await expect(page.locator('.flow-overview button')).toHaveCount(9);
      await page.locator('.flow-overview button').nth(2).click();
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = await page.evaluate(() => {
      const selectors = [
        '.mc-header',
        '.mc-sidebar',
        '.mc-main',
        '.mc-page-heading h1',
        '.mc-stages',
        '.mc-auth-hero',
        '.mc-secondary-panel',
        '.mc-resource-form',
        '.mc-resource-result',
        '.flow-layout',
        '.timeline-panel',
        '.inspector',
        '.mc-run-metadata',
      ];
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        },
        devicePixelRatio,
        cssZoom: document.documentElement.style.zoom,
        visualScale: visualViewport?.scale,
        elements: selectors.flatMap((selector) => {
          const element = document.querySelector(selector);
          if (!element) return [];
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return [
            {
              selector,
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              color: style.color,
              background: style.backgroundColor,
            },
          ];
        }),
      };
    });
    await writeFile(test.info().outputPath('geometry.json'), JSON.stringify(metrics, null, 2));
    if (metrics.document.height > scenario.height && scenario.width > 1000)
      await page.screenshot({ path: test.info().outputPath('layout-review.png'), fullPage: true });
    expect(metrics.document.width).toBe(scenario.width);
    if (scenario.width > 1000) expect(metrics.document.height).toBe(scenario.height);
    expect(metrics.devicePixelRatio).toBe(1);
    expect(metrics.cssZoom).toBe('');
    expect(metrics.visualScale).toBe(1);
    await page.screenshot({
      path: test.info().outputPath(`${scenario.name}.png`),
      fullPage: false,
    });
    if (scenario.name === '00-navy')
      await page.screenshot({ path: test.info().outputPath('00-navy-full.png'), fullPage: true });
    await writeFile(
      test.info().outputPath(`${scenario.name}.json`),
      JSON.stringify(
        { fixtureEvidence: true, browser: browser.version(), scenario, ...metrics },
        null,
        2,
      ),
    );
  });
}
