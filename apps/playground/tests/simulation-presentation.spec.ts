import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInstance } from 'i18next';
import { expect, test } from '@playwright/test';
import { buildSync } from 'esbuild';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { parseSimulationEvent } from '../src/features/mission/data/simulation-contract';
import { projectOAuthEvent } from '../src/features/mission/data/oauth-presentation';
import { loginEvents } from './oauth-runtime-fixture';
import type { SimulatedResourceResult } from '../src/features/mission/domain/synthetic-resource';
import deFlow from '../src/locales/de/protocol-flow.json' with { type: 'json' };
import enFlow from '../src/locales/en/protocol-flow.json' with { type: 'json' };
import deMission from '../src/locales/de/mission.json' with { type: 'json' };
import enMission from '../src/locales/en/mission.json' with { type: 'json' };

// Playwright's component transform emits mounting descriptors, not React SSR elements.
// Compile only these owned UI modules with the already installed Vite build tool.
const cache = resolve('node_modules/.cache');
mkdirSync(cache, { recursive: true });
const directory = mkdtempSync(join(cache, 'simulation-presentation-'));
const compiled = join(directory, 'presentation.cjs');
buildSync({
  stdin: {
    contents: `
      export { Inspector } from './src/features/protocol-flow/ui/Inspector';
      export { Timeline } from './src/features/protocol-flow/ui/Timeline';
      export { ResourceResult } from './src/features/mission/ui/workspace/ResourceResult';
      export { I18nextProvider } from 'react-i18next';
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  jsx: 'automatic',
  outfile: compiled,
});
// The static exports come from the three source modules immediately compiled above.
const { Inspector, Timeline, ResourceResult, I18nextProvider } = createRequire(import.meta.url)(
  compiled,
) as {
  Inspector: typeof import('../src/features/protocol-flow/ui/Inspector').Inspector;
  Timeline: typeof import('../src/features/protocol-flow/ui/Timeline').Timeline;
  ResourceResult: typeof import('../src/features/mission/ui/workspace/ResourceResult').ResourceResult;
  I18nextProvider: typeof import('react-i18next').I18nextProvider;
};
test.afterAll(() => rmSync(directory, { recursive: true, force: true }));

const simulated = parseSimulationEvent({
  id: 'simulation:oauth:1:authorization',
  visibility: 'simulated',
  kind: 'internal',
  actorId: 'bff',
  channel: { kind: 'internal', labelKey: 'protocol-flow:simulation.local' },
  titleKey: 'mission:simulation.oauth.authorization.title',
  summaryKey: 'mission:simulation.oauth.authorization.summary',
  explanationKey: 'mission:simulation.oauth.authorization.explanation',
  evidence: [],
  simulation: {
    traceId: 'simulation:oauth:1',
    sequence: 7,
    elapsedMs: 4800,
    outcome: 'succeeded',
    outcomeKey: 'protocol-flow:simulation.outcomes.succeeded',
    conceptual: false,
  },
});

for (const locale of ['de', 'en']) {
  test(`${locale} timeline and Inspector label virtual simulation without observed metadata`, async () => {
    const i18n = createInstance();
    await i18n.init({
      lng: locale,
      fallbackLng: 'de',
      resources: {
        de: { 'protocol-flow': deFlow, mission: deMission },
        en: { 'protocol-flow': enFlow, mission: enMission },
      },
    });
    const timeline = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(Timeline, {
          events: [simulated],
          selectedEventId: simulated.id,
          onSelectEvent() {},
          presentation: 'simulated',
          compact: true,
        }),
      ),
    );
    expect(timeline).toContain(locale === 'de' ? 'SIMULIERT' : 'SIMULATED');
    expect(timeline).toContain('4800');
    expect(timeline).toContain('07');
    expect(timeline).not.toContain('<time');
    const inspector = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(Inspector, {
          event: simulated,
          actor: undefined,
          contextTitle: undefined,
          contextExplanation: undefined,
          actors: [],
          presentation: 'simulated',
          detail: true,
        }),
      ),
    );
    expect(inspector).toContain(locale === 'de' ? 'Kein realer Beobachter' : 'No real observer');
    expect(inspector).toContain('4800');
    expect(inspector).not.toContain('auth-client');
    expect(inspector).not.toContain('<time');
    const live = loginEvents('11111111-1111-4111-8111-111111111111')[0];
    if (!live) {
      throw new Error('Missing live event');
    }
    const mismatch = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(Inspector, {
          event: projectOAuthEvent(live),
          actor: undefined,
          contextTitle: undefined,
          contextExplanation: undefined,
          actors: [],
          presentation: 'simulated',
          detail: true,
        }),
      ),
    );
    expect(mismatch).not.toContain('auth-client');
    const observed = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(Timeline, {
          events: [simulated],
          selectedEventId: simulated.id,
          onSelectEvent() {},
          presentation: 'observed',
        }),
      ),
    );
    expect(observed).not.toContain('4800');
  });
}

test('resource projection cannot present simulated content in a live result view', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'en', resources: { en: { mission: enMission } } });
  const result: SimulatedResourceResult = {
    source: 'simulated',
    status: 200,
    outcome: 'allowed',
    messageKey: 'execution.simulationNotice',
    resource: {
      resourceType: 'Basic',
      id: 'playground-demo',
      code: {
        coding: [
          {
            system: 'https://example.invalid/playground/demo',
            code: 'oauth-learning-demo',
            display: 'Fictional protocol learning resource',
          },
        ],
        text: 'Synthetic non-clinical OAuth demonstration; no patient data',
      },
    },
  };
  const render = (presentation: 'simulated' | 'observed') =>
    renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(ResourceResult, { result, loading: false, presentation }),
      ),
    );
  expect(render('simulated')).toContain('SIMULATION');
  expect(render('simulated')).toContain('playground-demo');
  expect(render('observed')).not.toContain('playground-demo');
});
