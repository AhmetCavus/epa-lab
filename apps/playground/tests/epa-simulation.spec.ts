import { expect, test } from '@playwright/test';
import {
  initialEpaSimulation,
  reduceEpaSimulation,
} from '../src/features/mission/domain/epa-simulation';
import {
  epaConceptualResult,
  presentEpaSimulation,
} from '../src/features/mission/data/epa-simulation';

for (const scenario of ['success', 'par-rejected'] as const) {
  test(`conceptual ePA ${scenario} separates PAR and browser channels without inventing a data exchange`, () => {
    let state = initialEpaSimulation(1, scenario);
    expect(reduceEpaSimulation(state, { type: 'resource', attempt: state.attempt })).toBe(state);
    state = reduceEpaSimulation(state, { type: 'start' });
    for (let index = 0; index < 15; index += 1) {
      state = reduceEpaSimulation(state, { type: 'step', attempt: state.attempt });
    }
    expect(state.phase).toBe(scenario === 'success' ? 'session' : 'failed');
    expect(epaConceptualResult(state)).toBeNull();
    state = reduceEpaSimulation(state, { type: 'resource', attempt: state.attempt });
    const events = presentEpaSimulation(state);
    expect(events.length).toBe(scenario === 'success' ? 10 : 4);
    expect(
      events.every((event) => event.simulation.conceptual && event.visibility === 'simulated'),
    ).toBe(true);
    expect(events.find((event) => event.id.endsWith(':par'))).toMatchObject({
      sourceActorId: 'epa-authorization',
      targetActorId: 'sectoral-idp',
      channel: { kind: 'back' },
    });
    if (scenario === 'success') {
      expect(events.find((event) => event.id.endsWith(':redirect'))).toMatchObject({
        sourceActorId: 'epa-authorization',
        targetActorId: 'fdv',
        channel: { kind: 'front' },
      });
      expect(events.at(-1)).toMatchObject({ kind: 'internal', actorId: 'vau' });
      expect(epaConceptualResult(state)).toMatchObject({
        source: 'simulated',
        status: null,
        outcome: 'conceptual',
      });
      expect(epaConceptualResult(state)).not.toHaveProperty('resource');
    } else {
      expect(events.at(-1)?.simulation.outcome).toBe('rejected');
      expect(events.some((event) => event.id.endsWith(':redirect'))).toBe(false);
    }
    expect(reduceEpaSimulation(state, { type: 'resource', attempt: state.attempt })).toBe(state);
    const reset = reduceEpaSimulation(state, { type: 'reset' });
    expect(reset.phase).toBe('idle');
    expect(reset.attempt).toBe(2);
    expect(presentEpaSimulation(reset)).toEqual([]);
  });
}

test('epa rejects stale progression and resource commands from a reset generation', () => {
  const first = initialEpaSimulation();
  const reset = reduceEpaSimulation(first, { type: 'reset' });
  const current = reduceEpaSimulation(reset, { type: 'start' });
  expect(reduceEpaSimulation(current, { type: 'step', attempt: first.attempt })).toBe(current);
  expect(reduceEpaSimulation(current, { type: 'resource', attempt: first.attempt })).toBe(current);
});
