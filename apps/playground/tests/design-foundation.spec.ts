import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('canvas and timeline share one directed selection and internal annotations have no network edge', async ({
  page,
}) => {
  await page.goto('/missions/oauth-oidc/workspace');
  const canvas = page.getByRole('region', { name: 'Scrollable actor map' });
  const timeline = page.getByRole('region', { name: 'Event timeline' });
  const inspector = page.getByRole('complementary', { name: 'Inspector' });

  await expect(canvas.locator('.communication-edge')).toHaveCount(0);
  await expect(canvas.getByRole('button', { name: /^Inspect / })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('empty.png'), fullPage: true });
  await page.getByRole('button', { name: 'Load fixture samples' }).click();
  await expect(canvas.locator('.communication-edge')).toHaveCount(3);
  await expect(canvas.locator('.internal-marker')).toHaveCount(1);
  await expect(canvas.locator('.interaction-path[data-selected="true"]')).toHaveCount(0);

  await timeline.getByRole('button', { name: /Browser authorization redirect/ }).click();
  const redirect = canvas.locator('.interaction-path[data-event-id="authorization-example"]');
  await expect(redirect).toHaveAttribute('data-selected', 'true');
  await expect(redirect).toHaveAttribute('data-channel', 'front');
  const arrow = redirect.locator('.communication-edge');
  expect(await arrow.getAttribute('marker-end')).toContain('url(#direction-');
  const start = Number(await arrow.getAttribute('x1'));
  const end = Number(await arrow.getAttribute('x2'));
  expect(end).toBeGreaterThan(start);
  await expect(arrow).toHaveCSS('stroke-dasharray', 'none');
  await expect(
    inspector.getByRole('heading', { name: 'Browser authorization redirect' }),
  ).toBeVisible();

  const codeExchange = canvas.getByRole('button', { name: /^Inspect Direct code exchange/ });
  await codeExchange.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(codeExchange).toBeFocused();
  await expect(codeExchange).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(timeline.getByRole('button', { name: /Direct code exchange/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(inspector.getByRole('heading', { name: 'Direct code exchange' })).toBeVisible();
  await expect(redirect).toHaveAttribute('data-selected', 'false');
  const exchange = canvas.locator('.interaction-path[data-event-id="exchange-example"]');
  await expect(exchange).toHaveAttribute('data-selected', 'true');
  await expect(exchange.locator('.communication-edge')).toHaveCSS('stroke-dasharray', '8px, 5px');
  await expect(canvas.locator('.actor.highlighted')).toHaveCount(2);
  await expect(canvas.locator('.interaction-path[data-muted="true"]')).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath('selected-message.png'), fullPage: true });

  await timeline.getByRole('button', { name: /Provider-internal/ }).focus();
  await page.keyboard.press('Space');
  const internal = canvas.locator('.interaction-path[data-kind="internal"]');
  await expect(internal).toHaveAttribute('data-selected', 'true');
  await expect(internal.locator('.communication-edge')).toHaveCount(0);
  await expect(internal.locator('[marker-end]')).toHaveCount(0);
  await expect(canvas.locator('.actor.highlighted')).toHaveCount(1);
  await expect(inspector.getByText('Not observable', { exact: true })).toBeVisible();
  await expect(inspector.getByText(/internal annotation, no network request/)).toBeVisible();
  await expect(inspector.getByText('None — not observed')).toBeVisible();
  await expect(inspector.getByText('Not available', { exact: true })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath('internal-annotation.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(canvas.locator('.communication-edge')).toHaveCount(3);
  await expect(canvas.locator('.interaction-path[data-selected="true"]')).toHaveCount(0);
  await expect(timeline.locator('[aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Replay explanation' }).click();
  await expect(redirect).toHaveAttribute('data-selected', 'true');
  await page.getByRole('button', { name: /^Human user/ }).click();
  await expect(canvas.locator('.interaction-path[data-selected="true"]')).toHaveCount(0);
  await expect(timeline.locator('[aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review evidence limits' }).click();
  await expect(inspector.getByRole('heading', { name: 'Review evidence limits' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'No live run' })).toBeVisible();
  await page.getByText('Actor map text alternative', { exact: true }).click();
  await expect(page.locator('.text-alternative')).toContainText(
    'internal annotation, no network request',
  );
  await expect(page.locator('.text-alternative')).toContainText(
    'Browser / SPA → Authorization Server',
  );
});

test('the conceptual fixture uses the same canvas without operational relationships', async ({
  page,
}) => {
  await page.goto('/missions/epa-concept/workspace');
  await expect(page.locator('.communication-edge, .internal-marker')).toHaveCount(0);
  await expect(page.getByText('No communication paths defined', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^ePA Authorization Service/ }).focus();
  await page.keyboard.press('Enter');
  await expect(
    page
      .getByRole('complementary', { name: 'Inspector' })
      .getByRole('heading', { name: 'ePA Authorization Service' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset view' }).click();
  await expect(page.getByRole('button', { name: 'Load fixture samples' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay explanation' })).toBeDisabled();
  await page.screenshot({ path: test.info().outputPath('concept.png'), fullPage: true });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});

for (const viewport of [
  { width: 320, height: 768, deviceScaleFactor: 1 },
  { width: 683, height: 384, deviceScaleFactor: 2 },
]) {
  test(`selected paths and evidence remain usable at ${viewport.width}px and scale ${viewport.deviceScaleFactor}`, async ({
    browser,
  }) => {
    // 683×384 CSS pixels at scale 2 exercises the reflow equivalent of a 1366×768 display at 200% zoom.
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: viewport.deviceScaleFactor,
      reducedMotion: 'reduce',
    });
    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/missions/oauth-oidc/workspace');
      await page.getByRole('button', { name: 'Load fixture samples' }).click();
      await page
        .getByRole('region', { name: 'Event timeline' })
        .getByRole('button', { name: /Direct code exchange/ })
        .click();
      await expect(
        page
          .getByRole('complementary', { name: 'Inspector' })
          .getByRole('heading', { name: 'Direct code exchange' }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByRole('button', { name: 'Fit', exact: true }).click();
      expect(
        await page.getByRole('region', { name: 'Scrollable actor map' }).evaluate((map) => {
          const label = map.querySelector('.interaction-label strong');
          return label !== null && Number.parseFloat(getComputedStyle(label).fontSize) >= 13;
        }),
      ).toBe(true);
      await expect(page.locator('.communication-edge')).toHaveCount(3);
      await expect(page.locator('.interaction-path[data-selected="true"]')).toHaveCount(1);
      await page.getByText('Actor map text alternative', { exact: true }).click();
      await expect(page.locator('.text-alternative')).toContainText('Direct code exchange');
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: test.info().outputPath('selected-reflow.png'),
        fullPage: true,
      });
    } finally {
      await context.close();
    }
  });
}
