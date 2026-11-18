import { expect, test } from '@playwright/test';
import { parseSimulationEvent } from '../src/features/mission/data/simulation-contract';
import { oauthEventSchema } from '../src/features/mission/data/oauth-contract';

const example = {
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
    sequence: 1,
    elapsedMs: 0,
    outcome: 'pending',
    outcomeKey: 'protocol-flow:simulation.outcomes.pending',
    conceptual: false,
  },
};

test('simulated content has a distinct bounded provenance and cannot decode as live evidence', () => {
  expect(parseSimulationEvent(example)).toEqual(example);
  expect(oauthEventSchema.safeParse(example).success).toBe(false);
  expect(
    parseSimulationEvent({
      ...example,
      evidence: [
        { labelKey: 'mission:simulation.fields.pkce', value: { kind: 'literal', value: 'S256' } },
      ],
    }).evidence,
  ).toHaveLength(1);
});

test('simulation content rejects credential-shaped evidence, forged observations and conflicting metadata', () => {
  for (const extra of [
    { observation: {} },
    { report: {} },
    { token: 'unsafe' },
    { raw: {} },
    { observedAt: new Date().toISOString() },
  ]) {
    expect(() => parseSimulationEvent({ ...example, ...extra })).toThrow();
  }
  for (const changed of [
    { traceId: 'a-real-run-id' },
    { conceptual: true },
    { sequence: 33 },
    { elapsedMs: -1 },
    { outcomeKey: 'protocol-flow:simulation.outcomes.allowed' },
  ]) {
    expect(() =>
      parseSimulationEvent({ ...example, simulation: { ...example.simulation, ...changed } }),
    ).toThrow();
  }
  for (const value of [
    'eyJ.token.signature',
    'fictional-secret',
    'http://issuer/callback?code=secret',
  ]) {
    expect(() =>
      parseSimulationEvent({
        ...example,
        evidence: [
          { labelKey: 'mission:simulation.fields.pkce', value: { kind: 'literal', value } },
        ],
      }),
    ).toThrow();
  }
});
