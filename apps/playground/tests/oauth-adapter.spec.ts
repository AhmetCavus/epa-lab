import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { z } from 'zod';
import {
  oauthEventDocumentSchema,
  oauthEventSchema,
  oauthSessionSchema,
} from '../src/features/mission/data/oauth-contract';
import {
  endOAuthSession,
  OAuthApiError,
  readOAuthEvents,
  readOAuthResource,
  readOAuthSession,
} from '../src/features/mission/data/oauth-api';
import { projectOAuthEvent } from '../src/features/mission/data/oauth-presentation';
import {
  csrfSentinel,
  loginEvents,
  observedEvent,
  runtimeFixture,
  unsafeSentinel,
} from './oauth-runtime-fixture';
import config, { privateOrigin } from '../vite.config';

test('consumer accepts the actual producer contract and projects only neutral safe fields', () => {
  // Execute the trusted pure producer schema in the test process. The standalone SPA bundle
  // and its Docker context never import backend source or backend dependencies.
  const source = readFileSync(
    '../../services/auth-client/src/authorization/run-observations/protocol-event.ts',
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports: Record<string, unknown> = {};
  new Function('require', 'exports', compiled.outputText)(createRequire(import.meta.url), exports);
  const producer = exports.protocolEventSchema;
  if (!(producer instanceof z.ZodType)) throw new Error('Producer contract unavailable');
  const fixture = runtimeFixture();
  const local = { channel: 'actor-local', actorId: 'bff' };
  const remaining = [
    {
      ...local,
      kind: 'authorization-failed',
      outcome: 'failed',
      evidence: { reason: 'authorization-unavailable' },
    },
    {
      ...local,
      kind: 'authorization-cancelled',
      outcome: 'cancelled',
      evidence: { reason: 'local-logout' },
    },
    {
      ...local,
      kind: 'callback-rejected',
      outcome: 'rejected',
      evidence: { reason: 'context-ineligible' },
    },
    {
      ...local,
      kind: 'token-exchange-failed',
      outcome: 'failed',
      evidence: { reason: 'provider-rejected', httpStatus: 400 },
    },
    {
      ...local,
      kind: 'token-validation-failed',
      outcome: 'rejected',
      evidence: { reason: 'oidc-validation-failed' },
    },
    {
      ...local,
      kind: 'session-ended',
      outcome: 'signed-out',
      evidence: { reason: 'local-logout', authenticationRemoved: true },
    },
    {
      channel: 'back-channel',
      sourceActorId: 'bff',
      targetActorId: 'resource-server',
      kind: 'resource-requested',
      outcome: 'pending',
      evidence: { operation: 'read-demo-basic', method: 'GET' },
    },
    {
      channel: 'back-channel',
      sourceActorId: 'resource-server',
      targetActorId: 'bff',
      kind: 'resource-response-received',
      outcome: 'received',
      evidence: {
        operation: 'read-demo-basic',
        httpStatus: 200,
        resourceServerReport: { available: false },
      },
    },
    {
      ...local,
      kind: 'resource-allowed',
      outcome: 'allowed',
      evidence: { operation: 'read-demo-basic', httpStatus: 200 },
    },
    {
      ...local,
      kind: 'resource-denied',
      outcome: 'denied',
      evidence: { operation: 'read-demo-basic', httpStatus: 403 },
    },
    {
      ...local,
      kind: 'resource-rejected',
      outcome: 'rejected',
      evidence: {
        operation: 'read-demo-basic',
        httpStatus: 401,
        reason: 'authentication-required',
      },
    },
    {
      ...local,
      kind: 'resource-failed',
      outcome: 'failed',
      evidence: { operation: 'read-demo-basic', reason: 'timeout' },
    },
  ];
  const examples = [
    ...fixture.document.events,
    ...remaining.map((event, index) => observedEvent(fixture.document.runId, index + 10, event)),
  ];
  for (const event of examples) {
    expect(producer.safeParse(event).success).toBe(true);
    const accepted = oauthEventSchema.parse(event);
    const presentation = projectOAuthEvent(accepted);
    expect(presentation.id).toBe(event.eventId);
    expect(presentation.observation).toMatchObject({
      runId: event.runId,
      sequence: event.sequence,
      observedAt: event.observedAt,
      observedBy: 'auth-client',
      outcome: event.outcome,
    });
    expect(presentation.visibility).toBe('observed');
    if (event.channel === 'actor-local') {
      expect(presentation.kind).toBe('internal');
      expect('sourceActorId' in presentation).toBe(false);
    }
  }
  expect(new Set(examples.map((event) => event.kind)).size).toBe(21);
  expect(producer instanceof z.ZodDiscriminatedUnion && producer.options.length).toBe(21);
  expect(oauthEventSchema.options.length).toBe(21);
});

for (const unsafeKey of [
  'access_token',
  'id_token',
  'refresh_token',
  'code',
  'state',
  'nonce',
  'code_verifier',
  'clientSecret',
  'cookie',
  'claims',
  'rawCallback',
  'body',
  'headers',
]) {
  test(`rejects secret-bearing event evidence: ${unsafeKey}`, () => {
    const event = loginEvents(crypto.randomUUID())[0];
    if (!event) throw new Error('Expected example');
    expect(
      oauthEventSchema.safeParse({
        ...event,
        evidence: { ...event.evidence, [unsafeKey]: unsafeSentinel },
      }).success,
    ).toBe(false);
  });
}

test('rejects unsupported versions, fields, observer/actor/channel substitutions and broken document sequences', () => {
  const fixture = runtimeFixture();
  const event = fixture.document.events[0];
  if (!event) throw new Error('Expected example');
  for (const changes of [
    { schemaVersion: 2 },
    { kind: 'provider-password-verified' },
    { observedBy: 'res-server' },
    { actorId: 'identity-provider' },
    { channel: 'back-channel' },
    { arbitrary: unsafeSentinel },
  ]) {
    expect(oauthEventSchema.safeParse({ ...event, ...changes }).success).toBe(false);
  }
  const document = fixture.document;
  for (const events of [
    [{ ...event, sequence: 2 }],
    [{ ...event, runId: crypto.randomUUID() }],
    [event, { ...event, sequence: 2 }],
    Array.from({ length: 101 }, () => event),
  ]) {
    expect(oauthEventDocumentSchema.safeParse({ ...document, events }).success).toBe(false);
  }
  expect(
    oauthSessionSchema.safeParse({ ...fixture.session, claims: { sub: unsafeSentinel } }).success,
  ).toBe(false);
  expect(oauthSessionSchema.safeParse({ ...fixture.session, authenticated: false }).success).toBe(
    false,
  );
});

async function withResponse(response: Response, run: (calls: RequestInit[]) => Promise<void>) {
  const original = globalThis.fetch;
  const calls: RequestInit[] = [];
  globalThis.fetch = (_input, options) => {
    calls.push(options ?? {});
    return Promise.resolve(response);
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('API requests use same-origin cookies, fixed operations and context-bound CSRF only', async () => {
  const session = runtimeFixture(false).session;
  await withResponse(json(session), async (calls) => {
    await readOAuthSession(new AbortController().signal);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      method: 'GET',
      credentials: 'same-origin',
      mode: 'same-origin',
      redirect: 'error',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    expect(new Headers(calls[0]?.headers).has('authorization')).toBe(false);
  });
  await withResponse(json(session), async (calls) => {
    await endOAuthSession(csrfSentinel, new AbortController().signal);
    expect(calls[0]?.method).toBe('POST');
    expect(new Headers(calls[0]?.headers).get('X-Playground-CSRF')).toBe(csrfSentinel);
    expect(new Headers(calls[0]?.headers).has('origin')).toBe(false);
    expect(calls[0]?.body).toBeUndefined();
  });
});

test('response limits, invalid media/JSON, forbidden redirects and unknown DTOs fail without raw diagnostics', async () => {
  const responses = [
    new Response(unsafeSentinel),
    new Response('{', { headers: { 'content-type': 'application/json' } }),
    json({ ...runtimeFixture().session, token: unsafeSentinel }),
    json({ content: unsafeSentinel.repeat(8000) }),
    json({ errorDetail: unsafeSentinel }, 500),
  ];
  for (const response of responses) {
    await withResponse(response, async () => {
      try {
        await readOAuthSession(new AbortController().signal);
        throw new Error('Expected rejection');
      } catch (error) {
        expect(error instanceof OAuthApiError).toBe(true);
        expect(String(error).includes(unsafeSentinel)).toBe(false);
      }
    });
  }
  await withResponse(json({}), async (calls) => {
    await expect(readOAuthEvents('../other', new AbortController().signal)).rejects.toBeInstanceOf(
      OAuthApiError,
    );
    expect(calls).toHaveLength(0);
  });
});

test('resource status/report consistency and logout response authentication are enforced', async () => {
  const runId = crypto.randomUUID();
  for (const [status, body] of [
    [200, { outcome: 'denied', runId, resourceServerReport: { available: false } }],
    [
      403,
      {
        outcome: 'denied',
        runId,
        resourceServerReport: {
          available: true,
          reportedBy: 'res-server',
          decision: 'allowed',
          reason: 'demo-read-allowed',
        },
      },
    ],
    [
      401,
      {
        outcome: 'denied',
        runId,
        resourceServerReport: {
          available: true,
          reportedBy: 'res-server',
          decision: 'denied',
          reason: 'insufficient-permission',
        },
      },
    ],
  ] as const) {
    await withResponse(json(body, status), async () => {
      await expect(readOAuthResource(new AbortController().signal)).rejects.toBeInstanceOf(
        OAuthApiError,
      );
    });
  }
  await withResponse(json(runtimeFixture().session), async () => {
    await expect(
      endOAuthSession(csrfSentinel, new AbortController().signal),
    ).rejects.toBeInstanceOf(OAuthApiError);
  });
});

test('private configuration rejects public origins and never enables production or preview execution', async () => {
  for (const origin of [
    'https://public.example',
    'http://127.public.example',
    'http://user:secret@127.0.0.1:3000',
    'http://127.0.0.1:3000/path',
    'http://127.1:3000',
    'http://192.168.178.131:3000?code=unsafe',
    'http://192.168.178.131:3000#unsafe',
  ]) {
    expect(() => privateOrigin(origin)).toThrow('Private runtime requires');
  }
  for (const origin of [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.178.131:3000',
    'https://[::1]:3000',
  ]) {
    expect(privateOrigin(origin)).toBe(origin);
  }
  if (typeof config !== 'function') throw new Error('Expected Vite configuration');
  for (const environment of [
    { command: 'build', mode: 'private' },
    { command: 'serve', mode: 'production', isPreview: true },
    { command: 'serve', mode: 'private', isPreview: true },
  ] as const) {
    const resolved = await config(environment);
    expect(resolved.define?.__PLAYGROUND_PRIVATE_OAUTH__).toBe('false');
    expect(resolved.server?.proxy).toBeUndefined();
  }
});
