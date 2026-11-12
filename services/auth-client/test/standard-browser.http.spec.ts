import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { generateKeyPairSync } from 'node:crypto';
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
import { profileTestConfiguration, testMetadata } from './fixtures';

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
    .object({
      authenticated: z.boolean(),
      expiresAt: z.string().nullable(),
      csrfToken: z.string(),
      currentRun: z
        .object({
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
          observationsAvailable: z.literal(false),
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
    await app.close();
    jest.restoreAllMocks();
  });

  function browser() {
    return request.agent(app.getHttpServer());
  }
  async function session(agent: Browser) {
    return agent.get('/api/oauth/session').set('Host', canonicalHost).expect(200);
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
      expect(restored.text.includes(value)).toBe(false);
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
      store.standard.record(run, 'pending');
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
