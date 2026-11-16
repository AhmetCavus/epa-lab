import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import type { Response as TestResponse } from 'supertest';
import { z } from 'zod';
import { AuthorizationModule } from '../src/authorization/authorization.module';
import { AuthorizationService } from '../src/authorization/authorization.service';
import { BrowserLoginStore } from '../src/authorization/browser-login/browser-login.store';
import {
  standardBindingCookie,
  standardContextCookie,
  standardCsrfHeader,
} from '../src/authorization/standard-login/standard-browser.controller';
import {
  standardContextLifetimeMs,
  standardPendingLifetimeMs,
  standardHistoryLimit,
} from '../src/authorization/standard-login/standard-browser-state';
import type { StandardSessionView } from '../src/authorization/standard-login/standard-browser-state';
import { AuthorizationErrorFilter } from '../src/common/errors/authorization-error.filter';
import { configureRequestLogging } from '../src/common/logging/request-logging';
import { IdTokenService } from '../src/oidc/id-token.service';
import { OidcClientService, OidcUpstreamError } from '../src/oidc/oidc-client.service';
import { deriveCodeChallenge } from '../src/oidc/authorization-transaction';
import { profileTestConfiguration, syntheticFhirResponse, testMetadata } from './fixtures';
import { protocolEventDocumentSchema } from '../src/authorization/run-observations/protocol-event';

type Browser = ReturnType<typeof request.agent>;
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const canonicalHost = 'localhost:3000';
const origin = `http://${canonicalHost}`;
const returnPath = '/missions/oauth-oidc/workspace';
const cookieSchema = z.array(z.string());

function cookies(response: TestResponse): string[] {
  const value: unknown = response.headers['set-cookie'];
  const parsed = cookieSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
function cookieValue(response: TestResponse, name: string): string {
  const value = cookies(response)
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split(';')[0]
    ?.slice(name.length + 1);
  if (!value) {
    throw new Error('Expected a scoped browser cookie');
  }
  return value;
}
function sessionBody(response: TestResponse): StandardSessionView {
  const value: unknown = response.body;
  const parsed = z
    .strictObject({
      authenticated: z.boolean(),
      expiresAt: z.string().nullable(),
      csrfToken: z.string(),
      currentRun: z
        .strictObject({
          runId: z.string(),
          outcome: z.enum([
            'pending',
            'authenticated',
            'provider-denied',
            'authentication-failed',
            'signed-out',
            'cancelled',
            'expired',
          ]),
          expiresAt: z.string(),
          observationsAvailable: z.boolean(),
        })
        .nullable(),
    })
    .safeParse(value);
  if (!parsed.success) {
    throw new Error('Invalid minimal session view');
  }
  if (parsed.data.authenticated && parsed.data.expiresAt !== null) {
    return { ...parsed.data, authenticated: true, expiresAt: parsed.data.expiresAt };
  }
  return { ...parsed.data, authenticated: false, expiresAt: null };
}

describe('standard OAuth browser lifecycle over isolated loopback HTTP', () => {
  let app: INestApplication<Server>;
  let store: BrowserLoginStore;
  let idTokens: IdTokenService;
  let authorization: AuthorizationService;
  let logs: jest.SpiedFunction<Logger['log']>;
  let warnings: jest.SpiedFunction<Logger['warn']>;
  const requestJson = jest.fn<Promise<unknown>, [string, number, RequestInit?]>();
  const issued = new Map<string, { nonce: string; challenge: string }>();
  const sensitive = new Set<string>();
  let claimsOverride: Record<string, unknown>;
  let providerFailure: boolean;
  let tokenGate: Promise<void> | undefined;
  let tokenEntered: (() => void) | undefined;
  let releaseGate: (() => void) | undefined;

  async function createApp(config = profileTestConfiguration) {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [registerAs('lab', () => config)],
        }),
        AuthorizationModule,
      ],
    })
      .overrideProvider(OidcClientService)
      .useValue({ requestJson })
      .compile();
    const instance = module.createNestApplication<INestApplication<Server>>({ logger: false });
    configureRequestLogging(instance);
    instance.useGlobalFilters(new AuthorizationErrorFilter());
    await instance.listen(0, '127.0.0.1');
    return { instance, module };
  }

  beforeEach(async () => {
    issued.clear();
    sensitive.clear();
    claimsOverride = {};
    providerFailure = false;
    tokenGate = undefined;
    tokenEntered = undefined;
    releaseGate = undefined;
    logs = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnings = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    requestJson.mockReset().mockImplementation(async (url, status, options) => {
      if (status === 201) {
        return { request_uri: 'urn:example:preserved-epa-par', expires_in: 60 };
      }
      if (url === testMetadata.jwks_uri) {
        return {
          keys: [
            {
              ...keys.publicKey.export({ format: 'jwk' }),
              kid: 'trusted',
              use: 'sig',
              alg: 'RS256',
            },
          ],
        };
      }
      if (url !== testMetadata.token_endpoint) {
        return testMetadata;
      }
      tokenEntered?.();
      if (tokenGate) {
        await tokenGate;
      }
      if (providerFailure) {
        throw new OidcUpstreamError('unexpected_status', 400);
      }
      const parameters = new URLSearchParams(typeof options?.body === 'string' ? options.body : '');
      const verifier = parameters.get('code_verifier');
      const authorizationHeader = new Headers(options?.headers).get('authorization');
      if (verifier) {
        sensitive.add(verifier);
      }
      if (authorizationHeader) {
        sensitive.add(authorizationHeader);
      }
      if (typeof options?.body === 'string') {
        sensitive.add(options.body);
      }
      const entry = issued.get(parameters.get('code') ?? '');
      if (
        !entry ||
        deriveCodeChallenge(parameters.get('code_verifier') ?? '') !== entry.challenge
      ) {
        throw new OidcUpstreamError('unexpected_status', 400);
      }
      const now = Math.floor(Date.now() / 1000);
      const token = sign(
        {
          sub: 'fictional-browser-owner',
          iss: profileTestConfiguration.issuer,
          aud: 'playground-oidc',
          nonce: entry.nonce,
          iat: now,
          exp: now + 300,
          ...claimsOverride,
        },
        keys.privateKey,
        { algorithm: 'RS256', keyid: 'trusted' },
      );
      sensitive.add(token);
      sensitive.add('fictional-standard-access');
      sensitive.add('fictional-standard-refresh');
      return {
        access_token: 'fictional-standard-access',
        id_token: token,
        refresh_token: 'fictional-standard-refresh',
        token_type: 'Bearer',
        expires_in: 300,
      };
    });
    const created = await createApp();
    app = created.instance;
    store = created.module.get(BrowserLoginStore);
    idTokens = created.module.get(IdTokenService);
    authorization = created.module.get(AuthorizationService);
  });

  afterEach(async () => {
    releaseGate?.();
    await app.close();
    const output = JSON.stringify([logs.mock.calls, warnings.mock.calls]);
    for (const value of [
      ...sensitive,
      profileTestConfiguration.clientSecret,
      profileTestConfiguration.standardProfile?.clientSecret ?? '',
    ]) {
      if (value) {
        expect(output.includes(value)).toBe(false);
      }
    }
    jest.restoreAllMocks();
  });

  function browser() {
    return request.agent(app.getHttpServer());
  }
  async function session(agent: Browser) {
    const response = await agent.get('/api/oauth/session').set('Host', canonicalHost).expect(200);
    sensitive.add(sessionBody(response).csrfToken);
    return response;
  }
  async function start(agent: Browser) {
    const response = await agent.get('/api/oauth/login').set('Host', canonicalHost).expect(302);
    const location = response.get('Location');
    if (!location) {
      throw new Error('Expected a provider redirect');
    }
    const url = new URL(location);
    const state = url.searchParams.get('state');
    const nonce = url.searchParams.get('nonce');
    const challenge = url.searchParams.get('code_challenge');
    if (!state || !nonce || !challenge) {
      throw new Error('Expected a complete correlated authorization request');
    }
    const code = `fictional-code-${state}`;
    issued.set(code, { nonce, challenge });
    sensitive.add(state);
    sensitive.add(nonce);
    sensitive.add(code);
    sensitive.add(cookieValue(response, standardContextCookie));
    sensitive.add(cookieValue(response, standardBindingCookie));
    return {
      response,
      url,
      state,
      code,
      context: cookieValue(response, standardContextCookie),
      binding: cookieValue(response, standardBindingCookie),
    };
  }
  async function complete(agent: Browser, started: Awaited<ReturnType<typeof start>>) {
    return agent
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .query({ state: started.state, code: started.code, iss: profileTestConfiguration.issuer });
  }
  async function authenticate(agent = browser()) {
    const started = await start(agent);
    const callback = await complete(agent, started);
    expect(callback.status).toBe(303);
    expect(callback.get('Location')).toBe(returnPath);
    const restored = await session(agent);
    sensitive.add(cookieValue(callback, standardContextCookie));
    return { agent, started, callback, view: sessionBody(restored) };
  }
  function logout(agent: Browser, csrf: string) {
    return agent
      .post('/api/oauth/logout')
      .set('Host', canonicalHost)
      .set('Origin', origin)
      .set(standardCsrfHeader, csrf);
  }
  function tokenCount() {
    return requestJson.mock.calls.filter(([url]) => url === testMetadata.token_endpoint).length;
  }

  async function events(agent: Browser, runId: string | undefined) {
    if (!runId) {
      throw new Error('Expected an owned run');
    }
    const response = await agent
      .get(`/api/oauth/runs/${runId}/events`)
      .set('Host', canonicalHost)
      .expect(200);
    const value: unknown = response.body;
    const parsed = protocolEventDocumentSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error('Unsafe observation response');
    }
    for (const secret of sensitive) {
      expect(response.text.includes(secret)).toBe(false);
    }
    expect(response.get('Cache-Control')).toBe('no-store');
    expect(response.get('Access-Control-Allow-Origin')).toBeUndefined();
    return parsed.data;
  }

  function resource(agent: Browser) {
    return agent.get('/api/oauth/resource').set('Host', canonicalHost);
  }

  function resourceFetch(
    status = 200,
    reports: Record<string, string> = {
      'x-playground-decision': 'allowed',
      'x-playground-reason': 'demo-read-allowed',
    },
  ) {
    return jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            status === 200
              ? JSON.stringify(syntheticFhirResponse)
              : 'fictional-sensitive-upstream-body',
            { status, headers: { 'content-type': 'application/fhir+json', ...reports } },
          ),
        ),
      );
  }

  it('records actual authorization/callback/exchange/validation/session observations with stable identities', async () => {
    const { agent, view } = await authenticate();
    const document = await events(agent, view.currentRun?.runId);
    expect(document.complete).toBe(true);
    expect(document.events.map((event) => event.kind)).toEqual([
      'authorization-started',
      'authorization-redirect-issued',
      'callback-accepted',
      'token-exchange-started',
      'token-response-received',
      'token-validation-started',
      'token-validation-succeeded',
      'session-established',
      'workspace-redirect-issued',
    ]);
    expect(document.events.map((event) => event.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(document.events.every((event) => event.observedBy === 'auth-client')).toBe(true);
    const redirect = document.events.find(
      (event) => event.kind === 'authorization-redirect-issued',
    );
    expect(redirect).toMatchObject({
      channel: 'front-channel',
      sourceActorId: 'bff',
      targetActorId: 'browser',
    });
    expect(
      document.events.some((event) => JSON.stringify(event).includes('identity-provider')),
    ).toBe(false);
    const calls = requestJson.mock.calls.length;
    expect(await events(agent, view.currentRun?.runId)).toEqual(document);
    await session(agent);
    expect(await events(agent, view.currentRun?.runId)).toEqual(document);
    expect(requestJson.mock.calls.length).toBe(calls);
  });

  it('returns only the synthetic view and attributes the HTTP response/report to their actual boundaries', async () => {
    const { agent, view } = await authenticate();
    const fetch = resourceFetch();
    const response = await resource(agent).expect(200);
    expect(response.body).toEqual({
      outcome: 'allowed',
      runId: view.currentRun?.runId,
      resource: { resourceType: 'Basic', id: 'playground-demo', code: 'oauth-learning-demo' },
      resourceServerReport: {
        available: true,
        reportedBy: 'res-server',
        decision: 'allowed',
        reason: 'demo-read-allowed',
      },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0] === profileTestConfiguration.standardProfile?.resourceUrl).toBe(
      true,
    );
    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('authorization') === 'Bearer fictional-standard-access').toBe(true);
    expect(headers.get('cookie')).toBeNull();
    const document = await events(agent, view.currentRun?.runId);
    expect(document.events.slice(-3).map((event) => event.kind)).toEqual([
      'resource-requested',
      'resource-response-received',
      'resource-allowed',
    ]);
    expect(document.events.at(-2)).toMatchObject({
      observedBy: 'auth-client',
      channel: 'back-channel',
      sourceActorId: 'resource-server',
      targetActorId: 'bff',
      evidence: { httpStatus: 200, resourceServerReport: { reportedBy: 'res-server' } },
    });
    for (const value of [...sensitive, 'fictional-resource-metadata']) {
      expect(response.text.includes(value)).toBe(false);
    }
  });

  it.each([401, 403])(
    'preserves authentication and safely reports a HAPI %s denial',
    async (status) => {
      const { agent, view } = await authenticate();
      resourceFetch(status, {
        'x-playground-decision': 'denied',
        'x-playground-reason': status === 401 ? 'invalid-token' : 'insufficient-permission',
      });
      const response = await resource(agent).expect(status);
      expect(response.body).toMatchObject({
        outcome: 'denied',
        resourceServerReport: { available: true, reportedBy: 'res-server', decision: 'denied' },
      });
      expect(response.text.includes('fictional-sensitive')).toBe(false);
      expect(sessionBody(await session(agent)).authenticated).toBe(true);
      expect((await events(agent, view.currentRun?.runId)).events.at(-1)).toMatchObject({
        kind: 'resource-denied',
        channel: 'actor-local',
        actorId: 'bff',
      });
    },
  );

  it('exposes unavailable report evidence without inferring a decision from a 200 status', async () => {
    const { agent, view } = await authenticate();
    resourceFetch(200, {
      'x-playground-decision': 'denied',
      'x-playground-reason': 'fictional-sensitive-report',
    });
    const response = await resource(agent).expect(200);
    expect(response.body).toMatchObject({
      outcome: 'allowed',
      resourceServerReport: { available: false },
    });
    expect(response.text.includes('fictional-sensitive')).toBe(false);
    const observed = (await events(agent, view.currentRun?.runId)).events.find(
      (event) => event.kind === 'resource-response-received',
    );
    expect(observed).toMatchObject({
      evidence: { httpStatus: 200, resourceServerReport: { available: false } },
    });
  });

  it('does not contact HAPI or fabricate a Resource Server denial for anonymous, expired, signed-out or ePA-only state', async () => {
    const fetch = resourceFetch();
    const anonymous = browser();
    await resource(anonymous).expect(401);
    await request(app.getHttpServer())
      .get('/api/oauth/resource')
      .set('Host', canonicalHost)
      .set('Cookie', `epa_session=${'a'.repeat(43)}`)
      .expect(401);
    const pending = await start(anonymous);
    const pendingView = sessionBody(await session(anonymous));
    await resource(anonymous).expect(401);
    const rejected = (await events(anonymous, pendingView.currentRun?.runId)).events.at(-1);
    expect(rejected).toMatchObject({
      kind: 'resource-rejected',
      channel: 'actor-local',
      actorId: 'bff',
      evidence: { reason: 'authentication-required' },
    });
    const { agent, view } = await authenticate();
    await logout(agent, view.csrfToken).expect(200);
    await resource(agent).expect(401);
    const expired = await authenticate();
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001);
    await resource(expired.agent).expect(401);
    expect(fetch).not.toHaveBeenCalled();
    expect(pending.state.length).toBe(43);
  });

  it.each([
    'url=https://attacker.example',
    'resource=Patient',
    'access_token=fictional-sensitive-token',
    'runId=unowned',
  ])('refuses caller-selected resource settings: %s', async (query) => {
    const { agent } = await authenticate();
    const fetch = resourceFetch();
    await agent.get(`/api/oauth/resource?${query}`).set('Host', canonicalHost).expect(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects supplied credentials, bodies and HEAD without creating upstream work', async () => {
    const { agent } = await authenticate();
    const fetch = resourceFetch();
    await resource(agent)
      .set('Authorization', 'Bearer fictional-sensitive-caller-token')
      .expect(400);
    await resource(agent).send({ access_token: 'fictional-sensitive-body-token' }).expect(400);
    await agent.head('/api/oauth/resource').set('Host', canonicalHost).expect(405);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('isolates event access by viewing owner, invalidates old cookies and retains safe history after logout', async () => {
    const first = await authenticate();
    const second = await authenticate();
    const runId = first.view.currentRun?.runId;
    const before = await events(first.agent, runId);
    const foreign = await second.agent
      .get(`/api/oauth/runs/${runId}/events`)
      .set('Host', canonicalHost)
      .expect(404);
    const unknown = await second.agent
      .get(`/api/oauth/runs/${randomUUID()}/events`)
      .set('Host', canonicalHost)
      .expect(404);
    expect(foreign.text).toBe(unknown.text);
    await browser().get(`/api/oauth/runs/${runId}/events`).set('Host', canonicalHost).expect(404);
    await browser()
      .get(`/api/oauth/runs/${runId}/events`)
      .set('Host', canonicalHost)
      .set('Cookie', `${standardContextCookie}=${first.started.context}`)
      .expect(404);
    expect(await events(first.agent, runId)).toEqual(before);
    const old = cookieValue(first.callback, standardContextCookie);
    await logout(first.agent, first.view.csrfToken).expect(200);
    const retained = await events(first.agent, runId);
    expect(retained.events.at(-1)).toMatchObject({ kind: 'session-ended', outcome: 'signed-out' });
    expect(retained.expiresAt).toBe(before.expiresAt);
    await browser()
      .get(`/api/oauth/runs/${runId}/events`)
      .set('Host', canonicalHost)
      .set('Cookie', `${standardContextCookie}=${old}`)
      .expect(404);
  });

  it('rejects resource work before upstream contact at trace capacity, while logout and owned bounded history still succeed', async () => {
    const capture = jest.spyOn(store.standard, 'record');
    const { agent, view } = await authenticate();
    const run = capture.mock.calls.at(-1)?.[0];
    if (!run) {
      throw new Error('Expected owned observations');
    }
    while (run.history.length < standardHistoryLimit) {
      store.standard.record(run, {
        kind: 'authorization-started',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'pending',
        evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
      });
    }
    const snapshot = run.history.map((event) => event.eventId);
    const fetch = resourceFetch();
    await resource(agent).expect(503);
    await logout(agent, view.csrfToken).expect(200);
    expect(sessionBody(await session(agent)).authenticated).toBe(false);
    const document = await events(agent, view.currentRun?.runId);
    expect(document.complete).toBe(false);
    expect(document.events.map((event) => event.eventId)).toEqual(snapshot);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('discards an in-flight resource result after logout and preserves honest received-response provenance', async () => {
    const { agent, view } = await authenticate();
    let entered: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release: ((response: Response) => void) | undefined;
    jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      entered?.();
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    });
    releaseGate = () =>
      release?.(
        new Response(JSON.stringify(syntheticFhirResponse), {
          status: 200,
          headers: {
            'content-type': 'application/fhir+json',
            'x-playground-decision': 'allowed',
            'x-playground-reason': 'demo-read-allowed',
          },
        }),
      );
    const inFlight = resource(agent).then((response) => response);
    await waiting;
    await logout(agent, view.csrfToken).expect(200);
    releaseGate();
    const response = await inFlight;
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ outcome: 'rejected', reason: 'session-no-longer-active' });
    expect(cookies(response).length).toBe(0);
    const document = await events(agent, view.currentRun?.runId);
    expect(document.events.slice(-2).map((event) => event.kind)).toEqual([
      'resource-response-received',
      'resource-rejected',
    ]);
    expect(document.events.some((event) => event.kind === 'resource-allowed')).toBe(false);
  });

  it('assigns resource work to the authenticated run while a later login is pending', async () => {
    const { agent, view } = await authenticate();
    const pending = await start(agent);
    const current = sessionBody(await session(agent));
    expect(current.currentRun?.runId).not.toBe(view.currentRun?.runId);
    const pendingHistory = await events(agent, current.currentRun?.runId);
    resourceFetch();
    const response = await resource(agent).expect(200);
    expect(response.body).toMatchObject({ runId: view.currentRun?.runId });
    expect((await events(agent, view.currentRun?.runId)).events.at(-1)?.kind).toBe(
      'resource-allowed',
    );
    expect(await events(agent, current.currentRun?.runId)).toEqual(pendingHistory);
    await logout(agent, current.csrfToken).expect(200);
    expect((await complete(agent, pending)).status).toBe(403);
  });

  it('reserves concurrent resource observations before contacting HAPI without overflowing or truncating history', async () => {
    const capture = jest.spyOn(store.standard, 'record');
    const { agent, view } = await authenticate();
    const run = capture.mock.calls.at(-1)?.[0];
    if (!run) {
      throw new Error('Expected owned observations');
    }
    while (run.history.length < standardHistoryLimit - 5) {
      store.standard.record(run, {
        kind: 'authorization-started',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'pending',
        evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
      });
    }
    let entered: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release: ((response: Response) => void) | undefined;
    const fetch = jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      entered?.();
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    });
    releaseGate = () =>
      release?.(
        new Response(JSON.stringify(syntheticFhirResponse), {
          status: 200,
          headers: { 'content-type': 'application/fhir+json' },
        }),
      );
    const first = resource(agent).then((response) => response);
    await waiting;
    await resource(agent).expect(503);
    expect(fetch).toHaveBeenCalledTimes(1);
    releaseGate();
    expect((await first).status).toBe(200);
    expect(run.reservedEvents).toBe(0);
    const document = await events(agent, view.currentRun?.runId);
    expect(document.events.length).toBe(standardHistoryLimit - 2);
    expect(document.complete).toBe(false);
    expect(document.events.map((event) => event.sequence)).toEqual(
      Array.from({ length: document.events.length }, (_, index) => index + 1),
    );
  });

  it('never lets a throwing recorder retain credentials or a pending login after logout', async () => {
    const { agent, callback } = await authenticate();
    const pending = await start(agent);
    const context = store.standard.context(cookieValue(callback, standardContextCookie));
    const active = sessionBody(await session(agent));
    const record = jest.spyOn(store.standard, 'record').mockImplementation(() => {
      throw new Error('fictional-sensitive-recorder-detail');
    });
    const fetch = resourceFetch();
    await resource(agent).expect(503);
    const response = await logout(agent, active.csrfToken).expect(200);
    expect(sessionBody(response).authenticated).toBe(false);
    expect(context?.authentication).toBeUndefined();
    expect((await complete(agent, pending)).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
    record.mockRestore();
    expect((await events(agent, active.currentRun?.runId)).complete).toBe(false);
  });

  it('records callback rejections only after proving ownership and never mutates history on replay', async () => {
    const agent = browser();
    const started = await start(agent);
    const view = sessionBody(await session(agent));
    const before = await events(agent, view.currentRun?.runId);
    await browser()
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .query({ state: started.state, code: started.code, iss: 'https://untrusted.example' })
      .expect(403);
    expect(await events(agent, view.currentRun?.runId)).toEqual(before);
    await agent
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .query({ state: started.state, code: started.code, error: 'unsafe-provider-detail' })
      .expect(400);
    await agent
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .query({ state: started.state, code: started.code, iss: 'https://untrusted.example' })
      .expect(403);
    expect((await events(agent, view.currentRun?.runId)).events.slice(-2)).toMatchObject([
      { kind: 'callback-rejected', evidence: { reason: 'malformed-callback' } },
      { kind: 'callback-rejected', evidence: { reason: 'issuer-mismatch' } },
    ]);
    expect(tokenCount()).toBe(0);
    expect((await complete(agent, started)).status).toBe(303);
    const committed = await events(agent, view.currentRun?.runId);
    expect((await complete(agent, started)).status).toBe(403);
    expect(await events(agent, view.currentRun?.runId)).toEqual(committed);
  });

  it('consumes but refuses a callback before token exchange when its complete trace cannot fit', async () => {
    const capture = jest.spyOn(store.standard, 'record');
    const agent = browser();
    const started = await start(agent);
    const run = capture.mock.calls.at(-1)?.[0];
    if (!run) {
      throw new Error('Expected owned observations');
    }
    while (run.history.length < standardHistoryLimit - 6) {
      store.standard.record(run, {
        kind: 'authorization-started',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'pending',
        evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
      });
    }
    expect((await complete(agent, started)).status).toBe(503);
    expect((await complete(agent, started)).status).toBe(403);
    expect(tokenCount()).toBe(0);
    expect((await events(agent, run.id)).complete).toBe(false);
  });

  it.each(['validation', 'exchange'])(
    'records the actual %s failure without later success events',
    async (failure) => {
      const agent = browser();
      const started = await start(agent);
      const view = sessionBody(await session(agent));
      if (failure === 'validation') {
        claimsOverride = { nonce: 'fictional-invalid-nonce' };
      } else {
        providerFailure = true;
      }
      expect((await complete(agent, started)).status).toBe(303);
      const document = await events(agent, view.currentRun?.runId);
      expect(document.events.slice(2).map((event) => event.kind)).toEqual(
        failure === 'validation'
          ? [
              'callback-accepted',
              'token-exchange-started',
              'token-response-received',
              'token-validation-started',
              'token-validation-failed',
              'workspace-redirect-issued',
            ]
          : [
              'callback-accepted',
              'token-exchange-started',
              'token-exchange-failed',
              'workspace-redirect-issued',
            ],
      );
      expect(sessionBody(await session(agent)).authenticated).toBe(false);
    },
  );

  it('expires owned event history and refuses to reconstruct it after a process restart', async () => {
    const { agent, view, callback } = await authenticate();
    const runId = view.currentRun?.runId;
    const restarted = await createApp();
    try {
      await request(restarted.instance.getHttpServer())
        .get(`/api/oauth/runs/${runId}/events`)
        .set('Host', canonicalHost)
        .set('Cookie', `${standardContextCookie}=${cookieValue(callback, standardContextCookie)}`)
        .expect(404);
    } finally {
      await restarted.instance.close();
    }
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + standardContextLifetimeMs + 1);
    await agent.get(`/api/oauth/runs/${runId}/events`).set('Host', canonicalHost).expect(404);
  });

  it('rejects corrupted/unsupported stored evidence without returning raw JSON and marks the trace unavailable', async () => {
    const capture = jest.spyOn(store.standard, 'record');
    const { agent, view } = await authenticate();
    const run = capture.mock.calls.at(-1)?.[0];
    const first = run?.history[0];
    if (!first) {
      throw new Error('Expected an observed event');
    }
    Object.assign(first.evidence, { rawToken: 'fictional-sensitive-unsafe-event' });
    const response = await agent
      .get(`/api/oauth/runs/${view.currentRun?.runId}/events`)
      .set('Host', canonicalHost)
      .expect(500);
    expect(response.text.includes('fictional-sensitive')).toBe(false);
    expect(sessionBody(await session(agent)).currentRun?.observationsAvailable).toBe(false);
  });

  it.each(['/api/oauth/callback', '/API/OAUTH/CALLBACK', '/api/OAUTH/callback'])(
    'never copies caller request IDs or raw callback queries into responses/logs at %s',
    async (path) => {
      const sentinel = randomUUID();
      sensitive.add(sentinel);
      sensitive.add('fictional-sensitive-callback-code');
      sensitive.add('fictional-sensitive-state');
      const response = await browser()
        .get(path)
        .set('Host', canonicalHost)
        .set('X-Request-ID', sentinel)
        .query({ code: 'fictional-sensitive-callback-code', state: 'fictional-sensitive-state' })
        .expect(400);
      expect(response.get('X-Request-ID') === sentinel).toBe(false);
      expect(response.text.includes('fictional-sensitive')).toBe(false);
    },
  );

  it('issues only scoped opaque HttpOnly cookies and starts a direct S256 request', async () => {
    const agent = browser();
    const started = await start(agent);
    expect(started.url.searchParams.get('client_id')).toBe('playground-oidc');
    expect(started.url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(started.url.searchParams.has('request_uri')).toBe(false);
    const headers = cookies(started.response);
    expect(
      headers.some(
        (cookie) =>
          cookie.includes('Path=/api/oauth;') &&
          cookie.includes('HttpOnly') &&
          cookie.includes('SameSite=Lax') &&
          Number(cookie.match(/Max-Age=(\d+)/)?.[1]) <= 900 &&
          Number(cookie.match(/Max-Age=(\d+)/)?.[1]) >= 895,
      ),
    ).toBe(true);
    expect(
      headers.some(
        (cookie) =>
          cookie.startsWith(`${standardBindingCookie}=`) &&
          cookie.includes('Path=/api/oauth/callback;') &&
          Number(cookie.match(/Max-Age=(\d+)/)?.[1]) <= 600 &&
          Number(cookie.match(/Max-Age=(\d+)/)?.[1]) >= 595 &&
          cookie.includes('HttpOnly'),
      ),
    ).toBe(true);
    expect(headers.some((cookie) => cookie.includes('Domain='))).toBe(false);
    expect(sessionBody(await session(agent))).toMatchObject({
      authenticated: false,
      currentRun: { outcome: 'pending' },
    });
  });

  it('rotates on callback, returns a clean 303, and restores the same minimal session on reload', async () => {
    const { agent, started, callback, view } = await authenticate();
    expect(view.authenticated).toBe(true);
    expect(view.currentRun?.outcome).toBe('authenticated');
    const current = cookieValue(callback, standardContextCookie);
    expect(current === started.context).toBe(false);
    const before = requestJson.mock.calls.length;
    const restored = await session(agent);
    expect(sessionBody(restored)).toEqual(view);
    expect(requestJson.mock.calls.length).toBe(before);
    expect(restored.get('Cache-Control')).toBe('no-store');
    expect(restored.get('Access-Control-Allow-Origin')).toBeUndefined();
    expect(restored.get('Access-Control-Allow-Credentials')).toBeUndefined();
    for (const value of [
      ...sensitive,
      'fictional-browser-owner',
      'fictional-standard-access',
      'fictional-standard-refresh',
    ]) {
      if (value !== view.csrfToken) {
        expect(restored.text.includes(value)).toBe(false);
      }
    }
    const old = await request(app.getHttpServer())
      .get('/api/oauth/session')
      .set('Host', canonicalHost)
      .set('Cookie', `${standardContextCookie}=${started.context}`)
      .expect(200);
    expect(sessionBody(old)).toMatchObject({ authenticated: false, currentRun: null });
  });

  it.each([
    'client_id=attacker',
    'returnTo=https://attacker.example',
    'issuer=http://localhost:9090',
    'profile=epa-par',
  ])('rejects login query overrides: %s', async (query) => {
    await browser().get(`/api/oauth/login?${query}`).set('Host', canonicalHost).expect(400);
    expect(requestJson).not.toHaveBeenCalled();
  });

  it.each([
    'missing-context',
    'wrong-context',
    'missing-binding',
    'wrong-binding',
    'duplicate-context',
  ])('does not consume a legitimate callback with %s', async (variant) => {
    const agent = browser();
    const started = await start(agent);
    let context = `${standardContextCookie}=${started.context}`;
    let binding = `${standardBindingCookie}=${started.binding}`;
    if (variant === 'missing-context') {
      context = '';
    }
    if (variant === 'wrong-context') {
      context = `${standardContextCookie}=${'b'.repeat(43)}`;
    }
    if (variant === 'duplicate-context') {
      context += `; ${standardContextCookie}=${started.context}`;
    }
    if (variant === 'missing-binding') {
      binding = '';
    }
    if (variant === 'wrong-binding') {
      binding = `${standardBindingCookie}=${'b'.repeat(43)}`;
    }
    await request(app.getHttpServer())
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .set('Cookie', [context, binding].filter(Boolean).join('; '))
      .query({ state: started.state, code: started.code })
      .expect(403);
    expect(tokenCount()).toBe(0);
    expect((await complete(agent, started)).status).toBe(303);
  });

  it('rejects another browser and wrong-host/issuer callbacks without touching the original run', async () => {
    const agent = browser();
    const started = await start(agent);
    const other = browser();
    await session(other);
    await other
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .query({ state: started.state, code: started.code })
      .expect(403);
    await agent
      .get('/api/oauth/callback')
      .set('Host', 'localhost:9999')
      .query({ state: started.state, code: started.code })
      .expect(403);
    await agent
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .query({ state: started.state, code: started.code, iss: 'http://localhost:9090/wrong' })
      .expect(403);
    expect(tokenCount()).toBe(0);
    expect((await complete(agent, started)).status).toBe(303);
  });

  it.each([
    {},
    { state: ['duplicate', 'state'], code: 'code' },
    { state: 'a'.repeat(43), code: 'code', error: 'access_denied' },
    { state: 'a'.repeat(43), profile: 'epa-par', code: 'code' },
  ])('rejects malformed callback shapes (%#)', async (query) => {
    await browser().get('/api/oauth/callback').set('Host', canonicalHost).query(query).expect(400);
    expect(tokenCount()).toBe(0);
  });

  it('returns correlated denial/exchange/token-validation failures to the fixed workspace without secrets', async () => {
    const agent = browser();
    const denied = await start(agent);
    await agent
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .query({
        state: denied.state,
        error: 'access_denied',
        error_description: 'Untrusted provider text',
      })
      .expect(303)
      .expect('Location', returnPath);
    expect(sessionBody(await session(agent)).currentRun?.outcome).toBe('provider-denied');
    expect(tokenCount()).toBe(0);
    const failed = await start(agent);
    providerFailure = true;
    expect((await complete(agent, failed)).get('Location')).toBe(returnPath);
    expect(sessionBody(await session(agent))).toMatchObject({
      authenticated: false,
      currentRun: { outcome: 'authentication-failed' },
    });
    providerFailure = false;
    claimsOverride = { nonce: 'incorrect-nonce' };
    const invalid = await start(agent);
    expect((await complete(agent, invalid)).status).toBe(303);
    expect(sessionBody(await session(agent)).authenticated).toBe(false);
    expect(
      JSON.stringify([logs.mock.calls, warnings.mock.calls]).includes('Untrusted provider text'),
    ).toBe(false);
  });

  it('rejects replay, expired state and callbacks lost after process restart', async () => {
    const { agent, started } = await authenticate();
    expect((await complete(agent, started)).status).toBe(403);
    expect(tokenCount()).toBe(1);
    const waiting = await start(agent);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + standardPendingLifetimeMs);
    expect((await complete(agent, waiting)).status).toBe(403);
    expect(tokenCount()).toBe(1);
    const fresh = await createApp();
    try {
      await request(fresh.instance.getHttpServer())
        .get('/api/oauth/callback')
        .set('Host', canonicalHost)
        .set(
          'Cookie',
          `${standardContextCookie}=${waiting.context}; ${standardBindingCookie}=${waiting.binding}`,
        )
        .query({ state: waiting.state, code: waiting.code })
        .expect(403);
    } finally {
      await fresh.instance.close();
    }
  });

  it('returns anonymous state after context expiry without exposing a previous owned run', async () => {
    const { agent, view } = await authenticate();
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + standardContextLifetimeMs);
    const current = sessionBody(await session(agent));
    expect(current).toMatchObject({ authenticated: false, expiresAt: null, currentRun: null });
    expect(current.csrfToken === view.csrfToken).toBe(false);
  });

  it.each(['no-origin', 'foreign-origin', 'origin-with-slash', 'no-csrf', 'wrong-csrf'])(
    'rejects unsafe logout %s without changing authentication',
    async (kind) => {
      const { agent, view } = await authenticate();
      let action = agent.post('/api/oauth/logout').set('Host', canonicalHost);
      if (kind !== 'no-origin') {
        action = action.set(
          'Origin',
          kind === 'foreign-origin'
            ? 'http://localhost:9999'
            : kind === 'origin-with-slash'
              ? `${origin}/`
              : origin,
        );
      }
      if (kind !== 'no-csrf') {
        action = action.set(standardCsrfHeader, kind === 'wrong-csrf' ? 'wrong' : view.csrfToken);
      }
      await action.expect(403);
      expect(sessionBody(await session(agent)).authenticated).toBe(true);
    },
  );

  it('performs local logout, rotates viewing ownership and rejects the old cookie/CSRF without provider logout', async () => {
    const { agent, callback, view } = await authenticate();
    const oldId = cookieValue(callback, standardContextCookie);
    const oldRecord = store.standard.context(oldId);
    const before = requestJson.mock.calls.length;
    await agent.get('/api/oauth/logout').set('Host', canonicalHost).expect(404);
    const response = await logout(agent, view.csrfToken).expect(200);
    const signedOut = sessionBody(response);
    expect(signedOut).toMatchObject({
      authenticated: false,
      currentRun: { runId: view.currentRun?.runId, outcome: 'signed-out' },
    });
    expect(signedOut.csrfToken === view.csrfToken).toBe(false);
    expect(oldRecord?.authentication).toBeUndefined();
    expect(requestJson.mock.calls.length).toBe(before);
    const old = await browser()
      .get('/api/oauth/session')
      .set('Host', canonicalHost)
      .set('Cookie', `${standardContextCookie}=${oldId}`)
      .expect(200);
    expect(sessionBody(old)).toMatchObject({ authenticated: false, currentRun: null });
    await logout(agent, view.csrfToken).expect(403);
    expect(sessionBody(await session(agent))).toEqual(signedOut);
  });

  it('rejects cross-context CSRF and does not affect other browsers or the ePA session', async () => {
    const first = await authenticate();
    const second = await authenticate();
    await logout(first.agent, second.view.csrfToken).expect(403);
    await logout(first.agent, first.view.csrfToken).expect(200);
    expect(sessionBody(await session(second.agent)).authenticated).toBe(true);
    await second.agent.get('/session').expect(200, { authenticated: false });
    await second.agent
      .get('/api/oauth/session?runId=foreign')
      .set('Host', canonicalHost)
      .expect(400);
  });

  it('permits only one of two concurrent callbacks to exchange a code', async () => {
    const agent = browser();
    const started = await start(agent);
    let entered: (() => void) | undefined;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    tokenEntered = () => entered?.();
    tokenGate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const first = complete(agent, started);
    await waiting;
    expect((await complete(agent, started)).status).toBe(403);
    expect(tokenCount()).toBe(1);
    releaseGate?.();
    expect((await first).status).toBe(303);
  });

  it.each(['token-exchange', 'id-token-validation'])(
    'logout prevents stale authentication while awaiting %s',
    async (phase) => {
      const { agent, view } = await authenticate();
      const started = await start(agent);
      let enter: (() => void) | undefined;
      const entered = new Promise<void>((resolve) => {
        enter = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        releaseGate = resolve;
      });
      if (phase === 'token-exchange') {
        tokenEntered = () => enter?.();
        tokenGate = gate;
      } else {
        const validate = idTokens.validate.bind(idTokens);
        jest.spyOn(idTokens, 'validate').mockImplementation(async (...args) => {
          enter?.();
          await gate;
          return validate(...args);
        });
      }
      const stale = complete(agent, started);
      await entered;
      const signedOut = sessionBody(await logout(agent, view.csrfToken).expect(200));
      releaseGate?.();
      const completed = await stale;
      expect(completed.status).toBe(403);
      expect(cookies(completed).length).toBe(0);
      expect(sessionBody(await session(agent))).toEqual(signedOut);
      tokenGate = undefined;
    },
  );

  it('cancels an unconsumed pending login on logout before exchange', async () => {
    const { agent, view } = await authenticate();
    const waiting = await start(agent);
    const before = tokenCount();
    await logout(agent, view.csrfToken).expect(200);
    expect((await complete(agent, waiting)).status).toBe(403);
    expect(tokenCount()).toBe(before);
    await request(app.getHttpServer())
      .get('/api/oauth/callback')
      .set('Host', canonicalHost)
      .set(
        'Cookie',
        `${standardContextCookie}=${waiting.context}; ${standardBindingCookie}=${waiting.binding}`,
      )
      .query({ state: waiting.state, code: waiting.code })
      .expect(403);
    expect(tokenCount()).toBe(before);
  });

  it('does not issue stale cookies when logout occurs while authorization discovery is preparing', async () => {
    const { agent, view } = await authenticate();
    let enter: (() => void) | undefined;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const initiate = authorization.initiateStandard.bind(authorization);
    jest.spyOn(authorization, 'initiateStandard').mockImplementation(async () => {
      enter?.();
      await gate;
      return initiate();
    });
    const starting = agent
      .get('/api/oauth/login')
      .set('Host', canonicalHost)
      .then((response) => response);
    await entered;
    const signedOut = sessionBody(await logout(agent, view.csrfToken).expect(200));
    releaseGate?.();
    const response = await starting;
    expect(response.status).toBe(403);
    expect(cookies(response).length).toBe(0);
    expect(sessionBody(await session(agent))).toEqual(signedOut);
  });

  it('continues logout when history is exhausted or recording throws, without fabricating observations', async () => {
    const capture = jest.spyOn(store.standard, 'record');
    const { agent, view } = await authenticate();
    const run = capture.mock.calls.at(-1)?.[0];
    if (!run) {
      throw new Error('Expected owned history');
    }
    while (run.history.length < standardHistoryLimit) {
      store.standard.record(run, {
        kind: 'authorization-started',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'pending',
        evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
      });
    }
    const response = await logout(agent, view.csrfToken).expect(200);
    expect(run.historyComplete).toBe(false);
    expect(run.history.length).toBe(standardHistoryLimit);
    expect(sessionBody(response)).toMatchObject({
      authenticated: false,
      currentRun: { observationsAvailable: false },
    });
    capture.mockImplementation(() => {
      throw new Error('sensitive-recorder-detail');
    });
    await logout(agent, sessionBody(response).csrfToken).expect(200);
    expect(
      JSON.stringify([logs.mock.calls, warnings.mock.calls]).includes('sensitive-recorder-detail'),
    ).toBe(false);
  });

  it('marks cookies Secure for HTTPS configuration and keeps disabled routes unavailable', async () => {
    const profile = profileTestConfiguration.standardProfile;
    if (!profile) {
      throw new Error('Expected enabled test profile');
    }
    const secure = await createApp({
      ...profileTestConfiguration,
      standardProfile: {
        ...profile,
        applicationOrigin: 'https://localhost:3000',
        defaultRedirectUri: 'https://localhost:3000/api/oauth/callback',
        allowedRedirectUris: ['https://localhost:3000/api/oauth/callback'],
      },
    });
    const disabled = await createApp({ ...profileTestConfiguration, standardProfile: undefined });
    try {
      const response = await request(secure.instance.getHttpServer())
        .get('/api/oauth/login')
        .set('Host', canonicalHost)
        .expect(302);
      expect(
        cookies(response).every(
          (cookie) => cookie.includes('Secure') && cookie.includes('HttpOnly'),
        ),
      ).toBe(true);
      await request(disabled.instance.getHttpServer())
        .get('/api/oauth/session')
        .set('Host', canonicalHost)
        .expect(404);
    } finally {
      await secure.instance.close();
      await disabled.instance.close();
    }
  });
});
