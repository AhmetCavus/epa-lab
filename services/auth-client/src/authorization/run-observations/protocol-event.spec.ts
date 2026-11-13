import { randomUUID } from 'node:crypto';
import { protocolEventSchema, protocolEventDocumentSchema } from './protocol-event';

const event = {
  schemaVersion: 1,
  eventId: randomUUID(),
  runId: randomUUID(),
  sequence: 1,
  observedAt: new Date().toISOString(),
  observedBy: 'auth-client',
  kind: 'authorization-started',
  channel: 'actor-local',
  actorId: 'bff',
  outcome: 'pending',
  evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
};

describe('version 1 finite protocol observations', () => {
  it('accepts the fixed local observation and preserves its recorded identity/time', () => {
    const parsed = protocolEventSchema.parse(event);
    expect(parsed).toEqual(event);
    expect(protocolEventSchema.parse(parsed)).toEqual(parsed);
  });

  it.each([
    { schemaVersion: 2 },
    { kind: 'keycloak-password-validated' },
    { observedBy: 'keycloak' },
    { actorId: 'identity-provider' },
    { channel: 'back-channel' },
    { sourceActorId: 'browser' },
    { observedAt: 'not-a-time' },
    { eventId: 'caller-selected' },
    { sequence: 0 },
    { sequence: 101 },
    { rawCallback: 'fictional-sensitive-callback' },
    { metadata: { token: 'fictional-sensitive-token' } },
  ])('rejects unknown versions/kinds/metadata and invalid provenance %#', (changes) => {
    expect(protocolEventSchema.safeParse({ ...event, ...changes }).success).toBe(false);
  });

  it.each([
    'access_token',
    'id_token',
    'refresh_token',
    'code',
    'state',
    'nonce',
    'code_verifier',
    'cookie',
    'password',
    'client_secret',
    'claims',
    'body',
    'url',
  ])('rejects the unapproved evidence key %s', (key) => {
    expect(
      protocolEventSchema.safeParse({
        ...event,
        evidence: { ...event.evidence, [key]: 'fictional-sensitive-evidence' },
      }).success,
    ).toBe(false);
  });

  it('represents a redirect instruction to the browser without claiming provider receipt', () => {
    const redirect = {
      ...event,
      kind: 'authorization-redirect-issued',
      channel: 'front-channel',
      sourceActorId: 'bff',
      targetActorId: 'browser',
      outcome: 'issued',
      evidence: {
        httpStatus: 302,
        destinationActorId: 'authorization-server',
        responseType: 'code',
        pkceMethod: 'S256',
      },
    };
    const { actorId: unused, ...network } = redirect;
    expect(unused).toBe('bff');
    expect(protocolEventSchema.safeParse(network).success).toBe(true);
    expect(
      protocolEventSchema.safeParse({ ...network, targetActorId: 'authorization-server' }).success,
    ).toBe(false);
  });

  it('requires explicit, status-consistent reports without a Resource Server timestamp or check list', () => {
    const response = {
      schemaVersion: 1,
      eventId: randomUUID(),
      runId: event.runId,
      sequence: 1,
      observedAt: event.observedAt,
      observedBy: 'auth-client',
      kind: 'resource-response-received',
      channel: 'back-channel',
      sourceActorId: 'resource-server',
      targetActorId: 'bff',
      outcome: 'received',
      evidence: {
        operation: 'read-demo-basic',
        httpStatus: 200,
        resourceServerReport: {
          available: true,
          reportedBy: 'res-server',
          decision: 'allowed',
          reason: 'demo-read-allowed',
        },
      },
    };
    expect(protocolEventSchema.safeParse(response).success).toBe(true);
    expect(
      protocolEventSchema.safeParse({
        ...response,
        evidence: { ...response.evidence, httpStatus: 403 },
      }).success,
    ).toBe(false);
    expect(
      protocolEventSchema.safeParse({
        ...response,
        evidence: {
          ...response.evidence,
          resourceServerReport: {
            ...response.evidence.resourceServerReport,
            observedAt: event.observedAt,
          },
        },
      }).success,
    ).toBe(false);
    expect(
      protocolEventSchema.safeParse({
        ...response,
        evidence: {
          ...response.evidence,
          resourceServerReport: {
            ...response.evidence.resourceServerReport,
            checks: ['signature'],
          },
        },
      }).success,
    ).toBe(false);
  });

  it('validates ownership association, stable sequence and unique event IDs without inventing missing events', () => {
    const document = {
      schemaVersion: 1,
      runId: event.runId,
      expiresAt: event.observedAt,
      complete: true,
      events: [event],
    };
    expect(protocolEventDocumentSchema.safeParse(document).success).toBe(true);
    expect(protocolEventDocumentSchema.safeParse({ ...document, complete: false }).success).toBe(
      true,
    );
    expect(
      protocolEventDocumentSchema.safeParse({ ...document, runId: randomUUID() }).success,
    ).toBe(false);
    expect(
      protocolEventDocumentSchema.safeParse({ ...document, events: [{ ...event, sequence: 2 }] })
        .success,
    ).toBe(false);
    expect(
      protocolEventDocumentSchema.safeParse({
        ...document,
        events: [event, { ...event, sequence: 2 }],
      }).success,
    ).toBe(false);
    expect(
      protocolEventDocumentSchema.safeParse({
        ...document,
        events: Array.from({ length: 101 }, (_, index) => ({
          ...event,
          eventId: randomUUID(),
          sequence: index + 1,
        })),
      }).success,
    ).toBe(false);
  });
});
