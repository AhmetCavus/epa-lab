import { expect, test } from '@playwright/test';
import {
  initialOAuthSimulation,
  reduceOAuthSimulation,
  type OAuthSimulationScenario,
} from '../src/features/mission/domain/oauth-simulation';
import {
  presentOAuthSimulation,
  oauthSimulatedResource,
} from '../src/features/mission/data/oauth-simulation';

for (const scenario of [
  'success',
  'pkce-rejected',
  'missing-permission',
] satisfies OAuthSimulationScenario[]) {
  test(`OAuth ${scenario} is deterministic bounded and needs an explicit resource action`, () => {
    let state = initialOAuthSimulation(1, scenario);
    expect(presentOAuthSimulation(state)).toEqual([]);
    expect(reduceOAuthSimulation(state, { type: 'step', attempt: state.attempt })).toBe(state);
    expect(reduceOAuthSimulation(state, { type: 'resource', attempt: state.attempt })).toBe(state);
    state = reduceOAuthSimulation(state, { type: 'start' });
    expect(reduceOAuthSimulation(state, { type: 'start' })).toBe(state);
    for (let index = 0; index < 20; index += 1)
      state = reduceOAuthSimulation(state, { type: 'step', attempt: state.attempt });
    expect(state.phase).toBe(scenario === 'pkce-rejected' ? 'failed' : 'session');
    expect(oauthSimulatedResource(state)).toBeNull();
    const beforeResource = state;
    state = reduceOAuthSimulation(state, { type: 'resource', attempt: state.attempt });
    if (scenario === 'pkce-rejected') {
      expect(state).toBe(beforeResource);
      expect(presentOAuthSimulation(state).at(-1)?.simulation.outcome).toBe('rejected');
    } else {
      expect(oauthSimulatedResource(state)?.status).toBe(scenario === 'success' ? 200 : 403);
      expect(reduceOAuthSimulation(state, { type: 'resource', attempt: state.attempt })).toBe(
        state,
      );
    }
    const events = presentOAuthSimulation(state);
    expect(events.length).toBeLessThanOrEqual(11);
    expect(events.map((event) => event.simulation.sequence)).toEqual(
      events.map((_, index) => index + 1),
    );
    expect(events.map((event) => event.simulation.elapsedMs)).toEqual(
      events.map((_, index) => index * 800),
    );
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(
      events.every((event) => event.visibility === 'simulated' && !('observation' in event)),
    ).toBe(true);
    expect(events.find((event) => event.id.endsWith(':callback'))).toMatchObject({
      sourceActorId: 'browser',
      targetActorId: 'bff',
      channel: { kind: 'front' },
    });
    expect(events.find((event) => event.id.endsWith(':exchange'))).toMatchObject({
      sourceActorId: 'bff',
      targetActorId: 'authorization-server',
      channel: { kind: 'back' },
    });
    expect(events.find((event) => event.id.endsWith(':validation'))?.kind).toBe(
      scenario === 'pkce-rejected' ? undefined : 'internal',
    );
    const reset = reduceOAuthSimulation(state, { type: 'reset' });
    expect(reset.attempt).toBe(2);
    expect(reset.phase).toBe('idle');
    expect(presentOAuthSimulation(reset)).toEqual([]);
    let repeated = reduceOAuthSimulation(reset, { type: 'start' });
    for (let index = 0; index < 20; index += 1)
      repeated = reduceOAuthSimulation(repeated, { type: 'step', attempt: repeated.attempt });
    repeated = reduceOAuthSimulation(repeated, { type: 'resource', attempt: repeated.attempt });
    expect(
      presentOAuthSimulation(repeated).map((event) => ({
        title: event.titleKey,
        time: event.simulation.elapsedMs,
        outcome: event.simulation.outcome,
      })),
    ).toEqual(
      events.map((event) => ({
        title: event.titleKey,
        time: event.simulation.elapsedMs,
        outcome: event.simulation.outcome,
      })),
    );
  });
}

test('oauth rejects stale progression and resource commands from a reset generation', () => {
  const first = initialOAuthSimulation();
  const reset = reduceOAuthSimulation(first, { type: 'reset' });
  const current = reduceOAuthSimulation(reset, { type: 'start' });
  expect(reduceOAuthSimulation(current, { type: 'step', attempt: first.attempt })).toBe(current);
  expect(reduceOAuthSimulation(current, { type: 'resource', attempt: first.attempt })).toBe(
    current,
  );
});
