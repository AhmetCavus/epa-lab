import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test.use({ baseURL: privateBaseUrl, trace: 'off' });

for (const locale of ['de', 'en']) {
  test(`${locale} all completed views reflow accessibly at reference and narrow sizes`, async ({
    page,
  }) => {
    test.setTimeout(240000);
    const evidence: object[] = [];
    for (const width of [1672, 1585, 1366, 1024, 706, 390, 320]) {
      const height = width === 1585 ? 992 : width === 706 ? 1249 : width < 760 ? 844 : 941;
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const view of ['explore', 'inspect', 'flow', 'resources']) {
        await page.unrouteAll({ behavior: 'wait' });
        const fixture = runtimeFixture();
        await fixture.install(page);
        const query =
          view === 'explore' ? '' : view === 'inspect' ? '?mode=inspect' : `?panel=${view}`;
        await page.goto(`${workspacePath}${query}`);
        await page.getByRole('combobox', { name: /^(Language|Sprache)$/ }).selectOption(locale);
        await expect(page.locator('[data-runtime-action="restore"]')).toBeEnabled();
        if (view === 'resources' || view === 'explore') {
          await page.locator('[data-runtime-action="resource"]').click();
          await expect(page.locator('.mc-resource-result')).toHaveAttribute(
            'data-outcome',
            'allowed',
          );
        }
        if (view === 'inspect') {
          await expect(page.locator('.timeline button')).toHaveCount(9);
          await page.locator('.timeline button').nth(2).click();
          const disclosure = page.locator('.evidence-section summary');
          await disclosure.focus();
          await page.keyboard.press('Enter');
          await expect(page.locator('.evidence-section')).toHaveAttribute('open', '');
        }
        if (view === 'flow') {
          await expect(page.locator('.flow-overview button')).toHaveCount(9);
          await page.locator('.flow-overview button').nth(2).click();
          await expect(page.locator('.flow-transport button').nth(1)).toBeDisabled();
          const diagram = page.locator('.flow-diagram-scroll');
          await diagram.focus();
          const overflows = await diagram.evaluate(
            (element) => element.scrollWidth > element.clientWidth,
          );
          if (overflows) {
            await page.keyboard.press('ArrowRight');
            await expect
              .poll(() => diagram.evaluate((element) => element.scrollLeft))
              .toBeGreaterThan(0);
            await page.keyboard.press('ArrowLeft');
          }
          await expect(page.locator('.flow-participant strong').first()).toHaveCSS(
            'font-size',
            '16px',
          );
        }
        const focusTarget = page.locator(
          view === 'inspect'
            ? '.mc-event-navigation button:last-child'
            : '[data-runtime-action="resource"]',
        );
        if (view !== 'flow') {
          await page.keyboard.press('Tab');
          await focusTarget.focus();
          await expect(focusTarget).toHaveCSS('outline-style', 'solid');
        }
        const scan = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(scan.violations, `${locale}/${width}/${view}`).toEqual([]);
        const metrics = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          height: innerHeight,
          documentHeight: document.documentElement.scrollHeight,
          dpr: devicePixelRatio,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        }));
        expect(metrics.document, `${locale}/${width}/${view}`).toBeLessThanOrEqual(width);
        expect(metrics.reducedMotion).toBe(true);
        if (width === 1672 || (width === 1585 && view === 'inspect'))
          expect(metrics.documentHeight).toBe(metrics.height);
        evidence.push({ locale, width, view, axeViolations: scan.violations.length, ...metrics });
        if (width === 320 || width === 1366)
          await page.screenshot({
            path: test.info().outputPath(`matrix-${locale}-${width}-${view}.png`),
            fullPage: true,
          });
      }
    }
    await writeFile(
      test.info().outputPath(`accessibility-${locale}.json`),
      JSON.stringify({ fixtureEvidence: true, cases: evidence }, null, 2),
    );
  });
}
