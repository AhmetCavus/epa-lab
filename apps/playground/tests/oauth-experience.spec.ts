import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { describeOAuthExperience } from '../src/features/mission/application/oauth-experience';
import { runtimeFixture } from './oauth-runtime-fixture';

type ExperienceInput = Parameters<typeof describeOAuthExperience>[0];

function describe(overrides: Partial<ExperienceInput> = {}) {
  const fixture = runtimeFixture();
  return describeOAuthExperience({
    session: fixture.session,
    document: fixture.document,
    phase: 'ready',
    problem: null,
    traceProblem: false,
    resourceOutcome: undefined,
    ...overrides,
  });
}

test('active current authentication makes Fetch dominant without claiming FHIR permission', () => {
  const experience = describe();
  expect(experience.status).toBe('authenticated');
  expect(experience.primaryAction).toBe('resource');
  expect(experience.stages.map((stage) => stage.outcome)).toEqual([
    'complete',
    'complete',
    'current',
  ]);
});

for (const phase of ['restoring', 'navigating', 'logout'] as const) {
  test(`${phase} has an honest pending state without a dominant execution action`, () => {
    const experience = describe({ phase });
    expect(experience.status).toBe(phase);
    expect(experience.primaryAction).toBeNull();
  });
}

for (const outcome of [
  'pending',
  'provider-denied',
  'authentication-failed',
  'signed-out',
  'cancelled',
  'expired',
] as const) {
  test(`restored ${outcome} state never borrows resource authority from old observations`, () => {
    const fixture = runtimeFixture(false);
    fixture.setSession({
      ...fixture.session,
      currentRun: {
        runId: fixture.document.runId,
        outcome,
        expiresAt: fixture.document.expiresAt,
        observationsAvailable: true,
      },
    });
    const experience = describe({ session: fixture.session, document: fixture.document });
    expect(experience.sessionActive).toBe(false);
    expect(experience.currentRunAuthenticated).toBe(false);
    expect(experience.stages[2]?.outcome).toBe('pending');
    expect(experience.primaryAction).toBe(outcome === 'pending' ? null : 'start');
  });
}

test('anonymous, expired and unknown session states offer honest recovery', () => {
  expect(describe({ session: runtimeFixture(false).session }).status).toBe('anonymous');
  expect(describe({ session: null }).status).toBe('failed');
  const fixture = runtimeFixture();
  expect(
    describe({ session: { ...fixture.session, expiresAt: new Date(0).toISOString() } }).status,
  ).toBe('expired');
});

test('a later failed run cannot become successful because earlier authentication remains', () => {
  const fixture = runtimeFixture();
  const prior = fixture.session.currentRun;
  if (!prior) throw new Error('Expected fixture run');
  const experience = describe({
    session: {
      ...fixture.session,
      currentRun: { ...prior, runId: randomUUID(), outcome: 'provider-denied' },
    },
    document: fixture.document,
  });
  expect(experience.status).toBe('failed');
  expect(experience.hasRetainedAuthentication).toBe(true);
  expect(experience.currentRunAuthenticated).toBe(false);
  expect(experience.primaryAction).toBe('start');
  expect(experience.stages.some((stage) => stage.outcome === 'complete')).toBe(false);
});

test('missing teaching history does not gate the authenticated resource action', () => {
  const experience = describe({ document: null, traceProblem: true });
  expect(experience.primaryAction).toBe('resource');
  expect(experience.evidenceIncomplete).toBe(true);
  expect(experience.stages.map((stage) => stage.outcome)).toEqual([
    'unavailable',
    'unavailable',
    'current',
  ]);
});

test('a resource denial or capacity failure does not end an active application session', () => {
  const experience = describe({
    resourceOutcome: 'mission:runtime.resource.permission-denied',
    problem: 'capacity',
  });
  expect(experience.status).toBe('authenticated');
  expect(experience.primaryAction).toBe('resource');
  expect(experience.stages[2]?.outcome).toBe('current');
});

test('only validated resource success completes the resource stage for current authentication', () => {
  expect(describe({ resourceOutcome: 'mission:runtime.resource.allowed' }).stages[2]?.outcome).toBe(
    'complete',
  );
  expect(describe({ resourceOutcome: 'unverified-200' }).stages[2]?.outcome).toBe('current');
  expect(
    describe({ phase: 'resource', resourceOutcome: 'mission:runtime.resource.allowed' }).stages[2]
      ?.outcome,
  ).toBe('current');
});
