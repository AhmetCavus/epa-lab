import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import deProtocolFlow from '../src/locales/de/protocol-flow.json' with { type: 'json' };
import enProtocolFlow from '../src/locales/en/protocol-flow.json' with { type: 'json' };
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, type Page } from '@playwright/test';
import type { ActorGroup, FixtureEvent } from '../src/features/protocol-flow/contracts';
import { ActorCanvas } from '../src/features/protocol-flow';

async function expectAlignedSequence(page: Page) {
  const geometry = await page.evaluate(() => {
    const actors = [...document.querySelectorAll<HTMLElement>('.actor')];
    const center = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.x + bounds.width / 2;
    };
    const centers = new Map(actors.map((actor) => [actor.dataset.actorId, center(actor)]));
    const lines = [...document.querySelectorAll<SVGLineElement>('.actor-lifeline')];
    const edges = [...document.querySelectorAll<SVGLineElement>('.communication-edge')];
    const endpoint = (line: SVGLineElement, x: number, y: number) => {
      const matrix = line.getScreenCTM();
      if (!matrix) {
        throw new Error('Missing diagram coordinate transform');
      }
      return new DOMPoint(x, y).matrixTransform(matrix).x;
    };
    const alignmentErrors = lines.map((line) =>
      Math.abs(center(line) - (centers.get(line.dataset.actorId) ?? Infinity)),
    );
    edges.forEach((edge) => {
      alignmentErrors.push(
        Math.abs(
          endpoint(edge, edge.x1.baseVal.value, edge.y1.baseVal.value) -
            (centers.get(edge.dataset.source) ?? Infinity),
        ),
        Math.abs(
          endpoint(edge, edge.x2.baseVal.value, edge.y2.baseVal.value) -
            (centers.get(edge.dataset.target) ?? Infinity),
        ),
      );
    });
    const rows = [...document.querySelectorAll<HTMLElement>('.interaction-target')];
    const gaps = rows.map((row, index) => {
      const label = row.querySelector('.interaction-label');
      const path = row.querySelector('.path-drawing');
      if (!label || !path) {
        throw new Error('Missing message label or path band');
      }
      const previous = rows[index - 1];
      const previousBottom =
        previous?.getBoundingClientRect().bottom ??
        Math.max(...actors.map((actor) => actor.getBoundingClientRect().bottom));
      return {
        labelToPath: path.getBoundingClientRect().top - label.getBoundingClientRect().bottom,
        previousToLabel: label.getBoundingClientRect().top - previousBottom,
        labelInsideRow: row.getBoundingClientRect().bottom - label.getBoundingClientRect().bottom,
      };
    });
    return { alignmentErrors, gaps };
  });
  for (const error of geometry.alignmentErrors) {
    expect(error).toBeLessThanOrEqual(2);
  }
  for (const row of geometry.gaps) {
    expect(row.labelToPath).toBeGreaterThanOrEqual(8);
    expect(row.previousToLabel).toBeGreaterThanOrEqual(0);
    expect(row.labelInsideRow).toBeGreaterThan(0);
  }
}

test.beforeEach(async ({ page }) => {
  // Existing English regressions explicitly restore a supported preference.
  await page.addInitScript(() => localStorage.setItem('auth-protocol-playground.locale', 'en'));
});

test('shipped sequence geometry, order, selection and readable Fit survive resizing', async ({
  page,
}) => {
  await page.goto('/missions/oauth-oidc/workspace');
  await page.getByRole('button', { name: 'Load fixture samples' }).click();
  const order = await page
    .locator('.interaction-target')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-event-id')));
  for (const width of [1366, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page
      .getByRole('region', { name: 'Event timeline' })
      .getByRole('button', { name: /Direct code exchange/ })
      .click();
    await page.getByRole('button', { name: 'Fit', exact: true }).click();
    await expect(page.getByLabel('Map zoom')).toHaveText('100%');
    await expect(page.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled();
    await expectAlignedSequence(page);
    expect(
      await page
        .locator('.interaction-target')
        .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-event-id'))),
    ).toEqual(order);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const map = page.getByRole('region', { name: 'Scrollable actor map' });
    if (width < 760) {
      expect(await map.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
      await map.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      await expectAlignedSequence(page);
      await expect(page.getByRole('button', { name: /^Resource Server/ })).toBeInViewport();
    }
    const fonts = await page
      .locator('.actor strong, .message-heading strong, .message-direction, .interaction-channel')
      .evaluateAll((labels) =>
        labels.map((label) => Number.parseFloat(getComputedStyle(label).fontSize)),
      );
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(13);
    await page.screenshot({
      path: test.info().outputPath(`selected-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByRole('button', { name: 'Replay explanation' }).click();
  await expect(page.locator('.interaction-target[aria-pressed="true"]')).toHaveAttribute(
    'data-event-id',
    order[0] ?? '',
  );
});

test('long wrapped text, reverse arrows and uneven groups retain collision-free geometry', async ({
  page,
}) => {
  const groups: readonly ActorGroup[] = [
    {
      id: 'outside',
      labelKey: 'layout:copy0',
      actors: [
        {
          id: 'reader',
          labelKey: 'layout:copy1',
          roleKey: 'layout:copy2',
          descriptionKey: 'layout:copy3',
        },
      ],
    },
    {
      id: 'shared',
      labelKey: 'layout:copy4',
      actors: [
        {
          id: 'relay',
          labelKey: 'layout:copy5',
          roleKey: 'layout:copy6',
          descriptionKey: 'layout:copy7',
        },
        {
          id: 'store',
          labelKey: 'layout:copy8',
          roleKey: 'layout:copy9',
          descriptionKey: 'layout:copy10',
        },
      ],
    },
  ];
  const common = {
    visibility: 'explained',
    summaryKey: 'layout:copy11',
    explanationKey: 'layout:copy12',
    evidence: [],
  } as const;
  const events: readonly FixtureEvent[] = [
    {
      ...common,
      id: 'forward',
      kind: 'message',
      titleKey: 'layout:copy13',
      sourceActorId: 'reader',
      targetActorId: 'store',
      channel: {
        kind: 'front',
        labelKey: 'layout:copy14',
      },
    },
    {
      ...common,
      id: 'reverse',
      kind: 'message',
      titleKey: 'layout:copy15',
      sourceActorId: 'store',
      targetActorId: 'reader',
      channel: { kind: 'back', labelKey: 'layout:copy16' },
    },
    {
      ...common,
      id: 'internal',
      kind: 'internal',
      titleKey: 'layout:copy17',
      actorId: 'relay',
      visibility: 'not-observable',
      channel: { kind: 'internal', labelKey: 'layout:copy18' },
    },
  ];

  const layoutText = {
    copy0: 'External participant',
    copy1: 'Reader with a long descriptive participant name',
    copy2: 'Initiator',
    copy3: 'Layout fixture only.',
    copy4: 'Two logical roles sharing a deployment with a longer heading',
    copy5: 'Relay',
    copy6: 'Intermediary',
    copy7: 'Layout fixture only.',
    copy8: 'Store',
    copy9: 'Destination',
    copy10: 'Layout fixture only.',
    copy11: 'Test-only layout example.',
    copy12: 'No operational result.',
    copy13:
      'A deliberately long message label that wraps over several lines without covering its own directional arrow or another message label, even when participant groups have different sizes',
    copy14: 'A long mission-defined communication channel description that also wraps',
    copy15: 'Response in the opposite direction',
    copy16: 'Direct response',
    copy17: 'A local explanation with no network communication',
    copy18: 'Internal explanation',
  };
  const styles = readFileSync('src/styles.css', 'utf8');
  for (const language of ['de', 'en']) {
    const i18n = createInstance();
    await i18n.init({
      lng: language,
      fallbackLng: 'de',
      defaultNS: 'protocol-flow',
      resources: {
        en: { 'protocol-flow': enProtocolFlow, layout: layoutText },
        de: {
          'protocol-flow': deProtocolFlow,
          layout: Object.fromEntries(
            Object.entries(layoutText).map(([key, value]) => [
              key,
              'AusfÃ¼hrliche Testbeschreibung: ' + value,
            ]),
          ),
        },
      },
    });
    for (const { width, scale } of [
      { width: 1366, scale: 1 },
      { width: 390, scale: 1 },
      { width: 390, scale: 1.5 },
    ]) {
      await page.setViewportSize({ width, height: 844 });
      // Render the real component with test-only content; no product route or mission is added.
      const markup = renderToStaticMarkup(
        createElement(
          I18nextProvider,
          { i18n },
          createElement(ActorCanvas, {
            groups,
            channels: events.map((event) => event.channel),
            events,
            event: undefined,
            highlightedActorIds: [],
            selectedActorId: null,
            scale,
            viewportRef: { current: null },
            onSelectActor: () => {},
            onSelectEvent: () => {},
          }),
        ),
      );
      await page.setContent(
        `<main class="panel canvas-panel" style="max-width:850px">${markup}</main>`,
      );
      await page.addStyleTag({ content: styles });
      await expectAlignedSequence(page);
      await expect(
        page.locator('.interaction-path[data-kind="internal"] .communication-edge'),
      ).toHaveCount(0);
      expect(
        Number(
          await page.locator('[data-event-id="reverse"] .communication-edge').getAttribute('x1'),
        ),
      ).toBeGreaterThan(
        Number(
          await page.locator('[data-event-id="reverse"] .communication-edge').getAttribute('x2'),
        ),
      );
      const rowHeights = await page
        .locator('.interaction-target')
        .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height));
      expect(rowHeights[0]).toBeGreaterThan(rowHeights[1] ?? Infinity);
      await page.screenshot({
        path: test.info().outputPath(`long-labels-${language}-${width}-${scale}.png`),
        fullPage: true,
      });
    }
  }
});
