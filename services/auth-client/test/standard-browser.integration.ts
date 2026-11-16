import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import request from 'supertest';
import type { Response as TestResponse } from 'supertest';
import { z } from 'zod';
import { configuration, readConfiguration } from '../src/config/configuration';
import { clientProfile } from '../src/config/client-profile';
import { AuthorizationModule } from '../src/authorization/authorization.module';
import { BrowserLoginStore } from '../src/authorization/browser-login/browser-login.store';
import { protocolEventDocumentSchema } from '../src/authorization/run-observations/protocol-event';
import {
  standardBindingCookie,
  standardContextCookie,
  standardCsrfHeader,
} from '../src/authorization/standard-login/standard-browser.controller';
import { AuthorizationErrorFilter } from '../src/common/errors/authorization-error.filter';
import { configureRequestLogging } from '../src/common/logging/request-logging';
import { OidcClientService } from '../src/oidc/oidc-client.service';
import { IdTokenService } from '../src/oidc/id-token.service';
import {
  standardContextLifetimeMs,
  standardPendingLifetimeMs,
} from '../src/authorization/standard-login/standard-browser-state';

const viewSchema = z
  .object({
    authenticated: z.boolean(),
    expiresAt: z.string().nullable(),
    csrfToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    currentRun: z
      .object({
        runId: z.string(),
        outcome: z.string(),
        expiresAt: z.string(),
        observationsAvailable: z.boolean(),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .refine((view) => view.authenticated === (view.expiresAt !== null));

describe('standard browser HTTP lifecycle with real private Keycloak and secured HAPI', () => {
  let app: INestApplication<Server> | undefined;
  let config: ConfigType<typeof configuration>;
  let environment: Record<string, string | undefined>;
  let host: string;
  let origin: string;
  let adminToken: string;
  let identityId: string | undefined;
  let transport: jest.SpiedFunction<OidcClientService['requestJson']>;
  let logs: jest.SpiedFunction<Logger['log']>;
  let warnings: jest.SpiedFunction<Logger['warn']>;
  let store: BrowserLoginStore;
  let upstream: jest.SpiedFunction<typeof fetch>;
  const username = `browser-lifecycle-${randomBytes(8).toString('hex')}`;
  const password = randomBytes(32).toString('base64url');
  const sensitive = new Set<string>([password]);
  const providerCookies = new Map<string, string>();
  let passwordSubmissions = 0;

  async function admin(
    path: string,
    method = 'GET',
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const response = await fetch(`${new URL(config.issuer).origin}/admin/realms/epa-demo${path}`, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(config.httpTimeoutMs),
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      body: body === undefined ? null : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Private identity operation failed (HTTP ${response.status})`);
    }
    if (response.status === 201 || response.status === 204) {
      return undefined;
    }
    const result: unknown = await response.json();
    return result;
  }

  async function refreshAdmin() {
    const adminUsername = environment.KEYCLOAK_ADMIN_USERNAME;
    const adminPassword = environment.KEYCLOAK_ADMIN_PASSWORD;
    if (!adminUsername || !adminPassword) {
      throw new Error('Private admin credentials required for disposable identity');
    }
    sensitive.add(adminPassword);
    const authenticated = await fetch(
      `${new URL(config.issuer).origin}/realms/master/protocol/openid-connect/token`,
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(config.httpTimeoutMs),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: 'admin-cli',
          grant_type: 'password',
          username: adminUsername,
          password: adminPassword,
        }),
      },
    );
    if (!authenticated.ok) {
      throw new Error('Private administrator authentication failed');
    }
    const parsed = z.object({ access_token: z.string() }).safeParse(await authenticated.json());
    if (!parsed.success) {
      throw new Error('Invalid private administrator response');
    }
    adminToken = parsed.data.access_token;
    sensitive.add(adminToken);
  }

  beforeAll(async () => {
    environment = parseEnv(await readFile(resolve(__dirname, '../../../.env'), 'utf8'));
    const callback = environment.PLAYGROUND_OIDC_REDIRECT_URI;
    if (!callback) {
      throw new Error('Configured standard client/callback required');
    }
    logs = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnings = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [
            registerAs('lab', () =>
              readConfiguration({
                ...environment,
                PLAYGROUND_OIDC_ENABLED: 'true',
                PLAYGROUND_FHIR_RESOURCE_URL:
                  environment.PLAYGROUND_FHIR_RESOURCE_URL ??
                  'http://127.0.0.1:18083/fhir/Basic/playground-demo',
                PLAYGROUND_APP_ORIGIN: new URL(callback).origin,
              }),
            ),
          ],
        }),
        AuthorizationModule,
      ],
    }).compile();
    config = module.get<ConfigType<typeof configuration>>(configuration.KEY);
    store = module.get(BrowserLoginStore);
    const profile = clientProfile(config, 'playground-standard');
    origin = profile.applicationOrigin;
    host = new URL(origin).host;
    sensitive.add(config.clientSecret);
    sensitive.add(profile.clientSecret);
    const client = module.get(OidcClientService);
    const original = client.requestJson.bind(client);
    transport = jest.spyOn(client, 'requestJson').mockImplementation(async (...args) => {
      const options = args[2];
      const authorizationHeader = new Headers(options?.headers).get('authorization');
      if (authorizationHeader) {
        sensitive.add(authorizationHeader);
      }
      if (typeof options?.body === 'string') {
        sensitive.add(options.body);
        const parameters = new URLSearchParams(options.body);
        for (const name of ['code', 'code_verifier']) {
          const value = parameters.get(name);
          if (value) {
            sensitive.add(value);
          }
        }
      }
      const result = await original(...args);
      const parsed = z
        .object({
          access_token: z.string(),
          id_token: z.string(),
          refresh_token: z.string().optional(),
        })
        .safeParse(result);
      if (parsed.success) {
        for (const value of Object.values(parsed.data)) {
          if (value) {
            sensitive.add(value);
          }
        }
      }
      return result;
    });
    await refreshAdmin();
    await admin('/users', 'POST', {
      username,
      enabled: true,
      firstName: 'Fictional',
      lastName: 'BrowserVerifier',
      email: `${username}@example.invalid`,
      requiredActions: [],
      credentials: [{ type: 'password', value: password, temporary: false }],
    });
    const users = z
      .array(z.object({ id: z.string(), username: z.string() }))
      .safeParse(await admin(`/users?username=${username}&exact=true`));
    if (!users.success || users.data.length !== 1 || users.data[0]?.username !== username) {
      throw new Error('Disposable identity lookup failed');
    }
    identityId = users.data[0].id;
    app = module.createNestApplication<INestApplication<Server>>({ logger: false });
    configureRequestLogging(app);
    app.useGlobalFilters(new AuthorizationErrorFilter());
    await app.listen(0, '127.0.0.1');
    const originalFetch = globalThis.fetch;
    upstream = jest.spyOn(globalThis, 'fetch').mockImplementation((...args) => {
      const authorization = new Headers(args[1]?.headers).get('authorization');
      if (authorization) {
        sensitive.add(authorization);
      }
      return originalFetch(...args);
    });
  });

  afterAll(async () => {
    try {
      if (identityId) {
        await refreshAdmin();
        await admin(`/users/${identityId}`, 'DELETE');
      }
      await app?.close();
      const hapi = spawnSync('docker', ['logs', 'epa-lab-integration-res-server'], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      });
      if (hapi.status !== 0) {
        throw new Error('Private HAPI log verification failed');
      }
      const output = JSON.stringify([
        logs?.mock.calls,
        warnings?.mock.calls,
        hapi.stdout,
        hapi.stderr,
      ]);
      expect([...sensitive].some((value) => output.includes(value))).toBe(false);
    } finally {
      await app?.close();
      jest.restoreAllMocks();
    }
  });

  function server() {
    if (!app) {
      throw new Error('Expected isolated application');
    }
    return app.getHttpServer();
  }
  function cookie(response: TestResponse, name: string) {
    const raw: unknown = response.headers['set-cookie'];
    const parsed = z.array(z.string()).safeParse(raw);
    const header = parsed.success
      ? parsed.data.find((value) => value.startsWith(`${name}=`))
      : undefined;
    const value = header?.split(';')[0]?.slice(name.length + 1);
    if (!header || !value) {
      throw new Error('Expected scoped opaque browser cookie');
    }
    sensitive.add(value);
    return { header, value };
  }
  function view(response: TestResponse) {
    const value: unknown = response.body;
    const parsed = viewSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error('Session response violated its minimal allowlist');
    }
    sensitive.add(parsed.data.csrfToken);
    for (const secret of sensitive) {
      if (secret !== parsed.data.csrfToken) {
        expect(response.text.includes(secret)).toBe(false);
      }
    }
    return parsed.data;
  }

  function safeResponse(response: TestResponse) {
    expect([...sensitive].some((value) => response.text.includes(value))).toBe(false);
    expect(response.get('Cache-Control')).toBe('no-store');
    expect(response.get('Access-Control-Allow-Origin')).toBeUndefined();
  }

  async function events(browser: ReturnType<typeof request.agent>, runId: string | undefined) {
    if (!runId) {
      throw new Error('Expected a current authentication run');
    }
    const response = await browser
      .get(`/api/oauth/runs/${runId}/events`)
      .set('Host', host)
      .expect(200);
    safeResponse(response);
    const value: unknown = response.body;
    const parsed = protocolEventDocumentSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error('Unsafe protocol event document');
    }
    return parsed.data;
  }

  function resourceRequests() {
    const target = clientProfile(config, 'playground-standard').resourceUrl;
    return upstream.mock.calls.filter(([url]) => url === target).length;
  }

  async function authenticate(scope?: 'openid') {
    const browser = request.agent(server());
    const started = await browser.get('/api/oauth/login').set('Host', host).expect(302);
    cookie(started, standardContextCookie);
    cookie(started, standardBindingCookie);
    const location = started.get('Location');
    if (!location) {
      throw new Error('Provider redirect missing');
    }
    const callback = await providerCallback(location, scope);
    const completed = await browser
      .get('/api/oauth/callback')
      .set('Host', host)
      .query(Object.fromEntries(callback.searchParams))
      .expect(303);
    const context = cookie(completed, standardContextCookie);
    const session = view(await browser.get('/api/oauth/session').set('Host', host).expect(200));
    expect(session.authenticated).toBe(true);
    return { browser, context, session };
  }
  function providerHeaders() {
    return { cookie: [...providerCookies].map(([name, value]) => `${name}=${value}`).join('; ') };
  }
  function saveProviderCookies(response: Response) {
    for (const raw of response.headers.getSetCookie()) {
      const pair = raw.split(';')[0] ?? '';
      const index = pair.indexOf('=');
      const value = pair.slice(index + 1);
      const name = pair.slice(0, index);
      if (value) {
        providerCookies.set(name, value);
        sensitive.add(value);
      } else {
        providerCookies.delete(name);
      }
    }
  }

  async function providerCallback(location: string, scope?: 'openid'): Promise<URL> {
    let url = new URL(location);
    if (scope) {
      // Test-only narrower grant: the public BFF continues to select its fixed scope.
      url.searchParams.set('scope', scope);
    }
    const state = url.searchParams.get('state');
    const nonce = url.searchParams.get('nonce');
    if (!state || !nonce) {
      throw new Error('Expected a correlated standard request');
    }
    sensitive.add(state);
    sensitive.add(nonce);
    const providerOrigin = new URL(config.issuer).origin;
    for (let step = 0; step < 8; step += 1) {
      if (url.origin === origin && url.pathname === '/api/oauth/callback') {
        const code = url.searchParams.get('code');
        if (!code || url.searchParams.get('state') !== state) {
          throw new Error('Provider did not return the expected correlation');
        }
        sensitive.add(code);
        return url;
      }
      if (url.origin !== providerOrigin) {
        throw new Error('Unexpected provider redirect origin');
      }
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(config.httpTimeoutMs),
        headers: providerHeaders(),
      });
      saveProviderCookies(response);
      if ([302, 303].includes(response.status)) {
        const next = response.headers.get('location');
        if (!next) {
          throw new Error('Missing provider redirect');
        }
        await response.body?.cancel();
        url = new URL(next, url);
        continue;
      }
      if (response.status !== 200) {
        throw new Error('Expected a provider login form');
      }
      const html = await response.text();
      const form = /<form\b[^>]*\bid="kc-form-login"[^>]*>/.exec(html)?.[0];
      const action = form === undefined ? undefined : /\baction="([^"]+)"/.exec(form)?.[1];
      if (!action) {
        throw new Error('Provider login action missing');
      }
      const actionUrl = new URL(action.replaceAll('&amp;', '&'), url);
      if (actionUrl.origin !== providerOrigin) {
        throw new Error('Unexpected provider form origin');
      }
      const completed = await fetch(actionUrl, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(config.httpTimeoutMs),
        headers: { ...providerHeaders(), 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password, credentialId: '' }),
      });
      passwordSubmissions += 1;
      saveProviderCookies(completed);
      const next = completed.headers.get('location');
      if (![302, 303].includes(completed.status) || !next) {
        throw new Error('Provider authentication did not complete');
      }
      await completed.body?.cancel();
      url = new URL(next, actionUrl);
    }
    throw new Error('Provider navigation exceeded its safe bound');
  }

  it('completes real HTTP login/callback and restores a minimal session after a reload request', async () => {
    const browser = request.agent(server());
    const started = await browser.get('/api/oauth/login').set('Host', host).expect(302);
    const location = started.get('Location');
    if (!location) {
      throw new Error('Provider redirect missing');
    }
    const context = cookie(started, standardContextCookie);
    const binding = cookie(started, standardBindingCookie);
    expect(context.header.includes('HttpOnly') && context.header.includes('Path=/api/oauth;')).toBe(
      true,
    );
    expect(
      binding.header.includes('HttpOnly') && binding.header.includes('Path=/api/oauth/callback;'),
    ).toBe(true);
    expect(new URL(location).searchParams.has('request_uri')).toBe(false);
    const callback = await providerCallback(location);
    const completed = await browser
      .get('/api/oauth/callback')
      .set('Host', host)
      .query(Object.fromEntries(callback.searchParams))
      .expect(303);
    expect(completed.get('Location') === '/missions/oauth-oidc/workspace').toBe(true);
    const active = cookie(completed, standardContextCookie);
    expect(active.value === context.value).toBe(false);
    const first = view(await browser.get('/api/oauth/session').set('Host', host).expect(200));
    expect(first.authenticated).toBe(true);
    expect(first.currentRun?.outcome).toBe('authenticated');
    const reload = view(
      await request(server())
        .get('/api/oauth/session')
        .set('Host', host)
        .set('Cookie', `${standardContextCookie}=${active.value}`)
        .expect(200),
    );
    expect(
      reload.currentRun?.runId === first.currentRun?.runId && reload.csrfToken === first.csrfToken,
    ).toBe(true);
    const calls = transport.mock.calls.length;
    await browser
      .get('/api/oauth/callback')
      .set('Host', host)
      .query(Object.fromEntries(callback.searchParams))
      .expect(403);
    expect(transport.mock.calls.length).toBe(calls);
    expect(transport.mock.calls.filter((call) => call[1] === 201).length).toBe(0);
    const loggedOut = await browser
      .post('/api/oauth/logout')
      .set('Host', host)
      .set('Origin', origin)
      .set(standardCsrfHeader, first.csrfToken)
      .expect(200);
    expect(view(loggedOut).authenticated).toBe(false);
  });

  it('keeps Keycloak SSO independent of local logout while rotating context and rejecting old cookies/CSRF', async () => {
    const browser = request.agent(server());
    const started = await browser.get('/api/oauth/login').set('Host', host).expect(302);
    const location = started.get('Location');
    if (!location) {
      throw new Error('Provider redirect missing');
    }
    const callback = await providerCallback(location);
    const completed = await browser
      .get('/api/oauth/callback')
      .set('Host', host)
      .query(Object.fromEntries(callback.searchParams))
      .expect(303);
    const authenticatedCookie = cookie(completed, standardContextCookie);
    const active = view(await browser.get('/api/oauth/session').set('Host', host).expect(200));
    await browser
      .post('/api/oauth/logout')
      .set('Host', host)
      .set('Origin', `${origin}/`)
      .set(standardCsrfHeader, active.csrfToken)
      .expect(403);
    expect(
      view(await browser.get('/api/oauth/session').set('Host', host).expect(200)).authenticated,
    ).toBe(true);
    const before = transport.mock.calls.length;
    const signedOut = view(
      await browser
        .post('/api/oauth/logout')
        .set('Host', host)
        .set('Origin', origin)
        .set(standardCsrfHeader, active.csrfToken)
        .expect(200),
    );
    expect(transport.mock.calls.length).toBe(before);
    expect(signedOut.authenticated).toBe(false);
    expect(signedOut.currentRun?.runId === active.currentRun?.runId).toBe(true);
    expect(signedOut.currentRun?.expiresAt === active.currentRun?.expiresAt).toBe(true);
    await browser
      .post('/api/oauth/logout')
      .set('Host', host)
      .set('Origin', origin)
      .set(standardCsrfHeader, active.csrfToken)
      .expect(403);
    const old = view(
      await request(server())
        .get('/api/oauth/session')
        .set('Host', host)
        .set('Cookie', `${standardContextCookie}=${authenticatedCookie.value}`)
        .expect(200),
    );
    expect(!old.authenticated && old.currentRun === null).toBe(true);
    const submissions = passwordSubmissions;
    const retry = await browser.get('/api/oauth/login').set('Host', host).expect(302);
    const retryLocation = retry.get('Location');
    if (!retryLocation) {
      throw new Error('Retry provider redirect missing');
    }
    const retryCallback = await providerCallback(retryLocation);
    expect(passwordSubmissions).toBe(submissions);
    await browser
      .get('/api/oauth/callback')
      .set('Host', host)
      .query(Object.fromEntries(retryCallback.searchParams))
      .expect(303);
    const restored = view(await browser.get('/api/oauth/session').set('Host', host).expect(200));
    expect(restored.authenticated && restored.currentRun?.runId !== active.currentRun?.runId).toBe(
      true,
    );
    await browser
      .post('/api/oauth/logout')
      .set('Host', host)
      .set('Origin', origin)
      .set(standardCsrfHeader, restored.csrfToken)
      .expect(200);
  });

  it('reads only the synthetic HAPI resource and preserves truthful owned history across reload and logout', async () => {
    const { browser, context, session } = await authenticate();
    const before = await events(browser, session.currentRun?.runId);
    expect(before.events.map((event) => event.kind)).toEqual([
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
    const calls = resourceRequests();
    const resource = await browser.get('/api/oauth/resource').set('Host', host).expect(200);
    safeResponse(resource);
    expect(resource.body).toEqual({
      outcome: 'allowed',
      runId: session.currentRun?.runId,
      resource: { resourceType: 'Basic', id: 'playground-demo', code: 'oauth-learning-demo' },
      resourceServerReport: {
        available: true,
        reportedBy: 'res-server',
        decision: 'allowed',
        reason: 'demo-read-allowed',
      },
    });
    expect(resourceRequests()).toBe(calls + 1);
    const observed = await events(browser, session.currentRun?.runId);
    expect(observed.complete).toBe(true);
    expect(observed.events.slice(-3).map((event) => event.kind)).toEqual([
      'resource-requested',
      'resource-response-received',
      'resource-allowed',
    ]);
    expect(observed.events.every((event) => event.observedBy === 'auth-client')).toBe(true);
    expect(observed.events.at(-2)).toMatchObject({
      sourceActorId: 'resource-server',
      targetActorId: 'bff',
      evidence: { httpStatus: 200, resourceServerReport: { reportedBy: 'res-server' } },
    });
    expect(observed.events.map((event) => event.sequence)).toEqual(
      Array.from({ length: observed.events.length }, (_, index) => index + 1),
    );
    const times = observed.events.map((event) => Date.parse(event.observedAt));
    expect(times.every((time, index) => index === 0 || time >= (times[index - 1] ?? 0))).toBe(true);
    const restored = view(await browser.get('/api/oauth/session').set('Host', host).expect(200));
    expect(restored.currentRun?.runId).toBe(session.currentRun?.runId);
    expect(await events(browser, session.currentRun?.runId)).toEqual(observed);
    await request(server())
      .get(`/api/oauth/runs/${session.currentRun?.runId}/events`)
      .set('Host', host)
      .expect(404);
    const signedOut = await browser
      .post('/api/oauth/logout')
      .set('Host', host)
      .set('Origin', origin)
      .set(standardCsrfHeader, session.csrfToken)
      .expect(200);
    cookie(signedOut, standardContextCookie);
    expect(view(signedOut).authenticated).toBe(false);
    const local = await browser.get('/api/oauth/resource').set('Host', host).expect(401);
    safeResponse(local);
    expect(resourceRequests()).toBe(calls + 1);
    const retained = await events(browser, session.currentRun?.runId);
    expect(retained.expiresAt).toBe(observed.expiresAt);
    expect(retained.events.slice(0, observed.events.length)).toEqual(observed.events);
    expect(retained.events.slice(-2).map((event) => event.kind)).toEqual([
      'session-ended',
      'resource-rejected',
    ]);
    await request(server())
      .get(`/api/oauth/runs/${session.currentRun?.runId}/events`)
      .set('Host', host)
      .set('Cookie', `${standardContextCookie}=${context.value}`)
      .expect(404);
  });

  it('keeps real authentication while HAPI denies a narrower grant without demo.fhir.read', async () => {
    const { browser, session } = await authenticate('openid');
    const response = await browser.get('/api/oauth/resource').set('Host', host).expect(403);
    safeResponse(response);
    expect(response.body).toEqual({
      outcome: 'denied',
      runId: session.currentRun?.runId,
      resourceServerReport: {
        available: true,
        reportedBy: 'res-server',
        decision: 'denied',
        reason: 'insufficient-permission',
      },
    });
    expect(
      view(await browser.get('/api/oauth/session').set('Host', host).expect(200)).authenticated,
    ).toBe(true);
    const observed = await events(browser, session.currentRun?.runId);
    expect(observed.events.at(-1)?.kind).toBe('resource-denied');
    expect(observed.events.at(-2)).toMatchObject({
      evidence: { httpStatus: 403, resourceServerReport: { reason: 'insufficient-permission' } },
    });
    await browser
      .post('/api/oauth/logout')
      .set('Host', host)
      .set('Origin', origin)
      .set(standardCsrfHeader, session.csrfToken)
      .expect(200);
  });

  it('reports an actual HAPI authentication failure for a corrupted server-held Access Token', async () => {
    const { browser, context, session } = await authenticate();
    const authentication = store.standard.context(context.value)?.authentication;
    if (!authentication) {
      throw new Error('Expected server-held standard credentials');
    }
    authentication.tokens.access_token = 'fictional-invalid-access-token';
    sensitive.add(authentication.tokens.access_token);
    const response = await browser.get('/api/oauth/resource').set('Host', host).expect(401);
    safeResponse(response);
    expect(response.body).toMatchObject({
      outcome: 'denied',
      resourceServerReport: { available: true, reportedBy: 'res-server', reason: 'invalid-token' },
    });
    const observed = await events(browser, session.currentRun?.runId);
    expect(observed.events.at(-2)).toMatchObject({
      evidence: { httpStatus: 401, resourceServerReport: { reason: 'invalid-token' } },
    });
    expect(observed.events.at(-1)?.kind).toBe('resource-denied');
    await browser
      .post('/api/oauth/logout')
      .set('Host', host)
      .set('Origin', origin)
      .set(standardCsrfHeader, session.csrfToken)
      .expect(200);
  });

  async function beginCallback(browser = request.agent(server())) {
    const started = await browser.get('/api/oauth/login').set('Host', host).expect(302);
    const context = cookie(started, standardContextCookie);
    const binding = cookie(started, standardBindingCookie);
    const location = started.get('Location');
    if (!location) {
      throw new Error('Provider redirect missing');
    }
    const callback = await providerCallback(location);
    return { browser, context, binding, callback };
  }

  function complete(started: Awaited<ReturnType<typeof beginCallback>>) {
    return started.browser
      .get('/api/oauth/callback')
      .set('Host', host)
      .query(Object.fromEntries(started.callback.searchParams));
  }

  function signOut(browser: ReturnType<typeof request.agent>, csrf: string) {
    return browser
      .post('/api/oauth/logout')
      .set('Host', host)
      .set('Origin', origin)
      .set(standardCsrfHeader, csrf);
  }

  function tokenRequests() {
    return transport.mock.calls.filter(([url]) => new URL(url).pathname.endsWith('/token')).length;
  }

  function deferred() {
    let release: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
      release = resolve;
    });
    return { promise, release };
  }

  function pauseRealCompletion(phase: 'token-exchange' | 'id-token-validation') {
    const entered = deferred();
    const gate = deferred();
    if (phase === 'token-exchange') {
      const original = transport.getMockImplementation();
      if (!original) {
        throw new Error('Expected real provider transport');
      }
      transport.mockImplementation(async (...args) => {
        const result = await original(...args);
        if (new URL(args[0]).pathname.endsWith('/token')) {
          entered.release();
          await gate.promise;
        }
        return result;
      });
      return {
        entered: entered.promise,
        release: gate.release,
        restore: () => transport.mockImplementation(original),
      };
    }
    if (!app) {
      throw new Error('Expected private application');
    }
    const validator = app.get(IdTokenService);
    const original = validator.validate.bind(validator);
    const validation = jest.spyOn(validator, 'validate').mockImplementation(async (...args) => {
      const result = await original(...args);
      entered.release();
      await gate.promise;
      return result;
    });
    return {
      entered: entered.promise,
      release: gate.release,
      restore: () => validation.mockRestore(),
    };
  }

  describe('integrated negative acceptance with real provider codes and private HAPI', () => {
    it.each([
      'missing-cookies',
      'missing-binding',
      'wrong-binding',
      'wrong-context',
      'duplicate-context',
      'unknown-state',
      'missing-state',
      'duplicate-state',
      'code-and-error',
      'profile-override',
      'issuer-mismatch',
      'wrong-host',
      'epa-route',
    ])('rejects %s without exchanging or consuming the legitimate real code', async (kind) => {
      const started = await beginCallback();
      const query: Record<string, string | string[]> = Object.fromEntries(
        started.callback.searchParams,
      );
      let context = `${standardContextCookie}=${started.context.value}`;
      let binding = `${standardBindingCookie}=${started.binding.value}`;
      let expected = 403;
      if (kind === 'missing-cookies') {
        context = '';
        binding = '';
      }
      if (kind === 'missing-binding') {
        binding = '';
      }
      if (kind === 'wrong-binding') {
        binding = `${standardBindingCookie}=${'b'.repeat(43)}`;
      }
      if (kind === 'wrong-context') {
        context = `${standardContextCookie}=${'c'.repeat(43)}`;
      }
      if (kind === 'duplicate-context') {
        context += `; ${context}`;
      }
      if (kind === 'unknown-state') {
        query.state = randomBytes(32).toString('base64url');
      }
      if (kind === 'missing-state') {
        delete query.state;
        expected = 400;
      }
      if (kind === 'duplicate-state') {
        query.state = [started.callback.searchParams.get('state') ?? '', 'duplicate'];
        expected = 400;
      }
      if (kind === 'code-and-error') {
        query.error = 'access_denied';
        expected = 400;
      }
      if (kind === 'profile-override') {
        query.profile = 'epa-par';
        expected = 400;
      }
      if (kind === 'issuer-mismatch') {
        query.iss = 'http://localhost:5555/realms/untrusted';
      }
      const before = tokenRequests();
      let rejected = request(server())
        .get(kind === 'epa-route' ? '/callback' : '/api/oauth/callback')
        .set('Host', kind === 'wrong-host' ? 'localhost:65534' : host)
        .query(query);
      const cookies = [context, binding].filter(Boolean).join('; ');
      if (cookies) {
        rejected = rejected.set('Cookie', cookies);
      }
      safeResponse(await rejected.expect(expected));
      expect(tokenRequests()).toBe(before);
      await complete(started).expect(303);
      const active = view(
        await started.browser.get('/api/oauth/session').set('Host', host).expect(200),
      );
      expect(active.authenticated).toBe(true);
      expect(tokenRequests()).toBe(before + 1);
      await signOut(started.browser, active.csrfToken).expect(200);
    });

    it('classifies a real Keycloak prompt=none denial without exchanging or exposing provider text', async () => {
      const browser = request.agent(server());
      const started = await browser.get('/api/oauth/login').set('Host', host).expect(302);
      cookie(started, standardContextCookie);
      cookie(started, standardBindingCookie);
      const url = new URL(started.get('Location') ?? '');
      url.searchParams.set('prompt', 'none');
      const provider = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(config.httpTimeoutMs),
      });
      expect(provider.status).toBe(302);
      const callback = new URL(provider.headers.get('location') ?? '');
      expect(callback.origin === origin && callback.searchParams.has('error')).toBe(true);
      await provider.body?.cancel();
      const before = tokenRequests();
      const completed = await browser
        .get('/api/oauth/callback')
        .set('Host', host)
        .query(Object.fromEntries(callback.searchParams))
        .expect(303);
      safeResponse(completed);
      expect(completed.get('Location')).toBe('/missions/oauth-oidc/workspace');
      expect(tokenRequests()).toBe(before);
      const current = view(await browser.get('/api/oauth/session').set('Host', host).expect(200));
      expect(current.authenticated).toBe(false);
      expect(current.currentRun?.outcome).toBe('provider-denied');
      expect((await events(browser, current.currentRun?.runId)).events.at(-2)).toMatchObject({
        kind: 'callback-rejected',
        evidence: { reason: 'provider-denied' },
      });
    });

    it('permits one exchange for concurrent real-code callbacks and rejects replay', async () => {
      const started = await beginCallback();
      const paused = pauseRealCompletion('token-exchange');
      const before = tokenRequests();
      const first = complete(started).then((response) => response);
      try {
        await paused.entered;
        safeResponse(await complete(started).expect(403));
        expect(tokenRequests()).toBe(before + 1);
        paused.release();
        expect((await first).status).toBe(303);
        await complete(started).expect(403);
        expect(tokenRequests()).toBe(before + 1);
        const active = view(
          await started.browser.get('/api/oauth/session').set('Host', host).expect(200),
        );
        await signOut(started.browser, active.csrfToken).expect(200);
      } finally {
        paused.release();
        paused.restore();
      }
    });

    it.each(['token-exchange', 'id-token-validation'] as const)(
      'logout cancels an in-flight callback after real %s completes',
      async (phase) => {
        const active = await authenticate();
        const originalContext = store.standard.context(active.context.value);
        const pending = await beginCallback(active.browser);
        const paused = pauseRealCompletion(phase);
        const stale = complete(pending).then((response) => response);
        try {
          await paused.entered;
          const signedOut = view(
            await signOut(active.browser, active.session.csrfToken).expect(200),
          );
          expect(originalContext?.authentication).toBeUndefined();
          paused.release();
          const rejected = await stale;
          expect(rejected.status).toBe(403);
          expect(rejected.get('Set-Cookie')).toBeUndefined();
          safeResponse(rejected);
          const restored = view(
            await active.browser.get('/api/oauth/session').set('Host', host).expect(200),
          );
          expect(!restored.authenticated && restored.csrfToken === signedOut.csrfToken).toBe(true);
          const calls = resourceRequests();
          await active.browser.get('/api/oauth/resource').set('Host', host).expect(401);
          expect(resourceRequests()).toBe(calls);
        } finally {
          paused.release();
          paused.restore();
        }
      },
    );

    it.each(['signature', 'nonce'] as const)(
      'rejects fault-injected %s validation of a real signed Keycloak ID Token',
      async (fault) => {
        const started = await beginCallback();
        if (!app) {
          throw new Error('Expected private application');
        }
        const validator = app.get(IdTokenService);
        const original = validator.validate.bind(validator);
        const validation = jest
          .spyOn(validator, 'validate')
          .mockImplementationOnce((metadata, idToken, transaction, accessToken, profile) => {
            if (fault === 'nonce') {
              const nonce = randomBytes(32).toString('base64url');
              sensitive.add(nonce);
              return original(metadata, idToken, { ...transaction, nonce }, accessToken, profile);
            }
            const parts = idToken.split('.');
            const signature = parts[2];
            if (!signature) {
              throw new Error('Expected actual signed provider token');
            }
            const first = signature[0] === 'A' ? 'B' : 'A';
            const changed = `${parts[0]}.${parts[1]}.${first}${signature.slice(1)}`;
            sensitive.add(changed);
            return original(metadata, changed, transaction, accessToken, profile);
          });
        try {
          const result = await complete(started).expect(303);
          safeResponse(result);
          const current = view(
            await started.browser.get('/api/oauth/session').set('Host', host).expect(200),
          );
          expect(current.authenticated).toBe(false);
          expect(current.currentRun?.outcome).toBe('authentication-failed');
          expect(
            (await events(started.browser, current.currentRun?.runId)).events.map(
              (event) => event.kind,
            ),
          ).toContain('token-validation-failed');
        } finally {
          validation.mockRestore();
        }
      },
    );

    it('keeps cross-browser histories and CSRF independent after real authentication', async () => {
      const first = await authenticate();
      const second = await authenticate();
      const before = await events(second.browser, second.session.currentRun?.runId);
      safeResponse(
        await first.browser
          .get(`/api/oauth/runs/${second.session.currentRun?.runId}/events`)
          .set('Host', host)
          .expect(404),
      );
      await signOut(first.browser, second.session.csrfToken).expect(403);
      for (const headers of [
        { csrf: first.session.csrfToken },
        { origin: 'http://localhost:65534', csrf: first.session.csrfToken },
        { origin, csrf: 'wrong' },
        { origin },
      ]) {
        let rejected = first.browser.post('/api/oauth/logout').set('Host', host);
        if (headers.origin) {
          rejected = rejected.set('Origin', headers.origin);
        }
        if (headers.csrf) {
          rejected = rejected.set(standardCsrfHeader, headers.csrf);
        }
        await rejected.expect(403);
      }
      await first.browser.get('/api/oauth/logout').set('Host', host).expect(404);
      expect(
        view(await first.browser.get('/api/oauth/session').set('Host', host).expect(200))
          .authenticated,
      ).toBe(true);
      await signOut(first.browser, first.session.csrfToken).expect(200);
      expect(
        view(await second.browser.get('/api/oauth/session').set('Host', host).expect(200))
          .authenticated,
      ).toBe(true);
      expect(await events(second.browser, second.session.currentRun?.runId)).toEqual(before);
      await signOut(second.browser, second.session.csrfToken).expect(200);
    });

    it('rejects pending expiry, expired authentication and history using the BFF clock only', async () => {
      const pending = await beginCallback();
      const calls = tokenRequests();
      const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + standardPendingLifetimeMs);
      try {
        await request(server())
          .get('/api/oauth/callback')
          .set('Host', host)
          .set(
            'Cookie',
            `${standardContextCookie}=${pending.context.value}; ${standardBindingCookie}=${pending.binding.value}`,
          )
          .query(Object.fromEntries(pending.callback.searchParams))
          .expect(403);
        expect(tokenRequests()).toBe(calls);
      } finally {
        clock.mockRestore();
      }
      const active = await authenticate();
      const expiry = Date.parse(active.session.expiresAt ?? '');
      const tokenClock = jest.spyOn(Date, 'now').mockReturnValue(expiry + 1);
      const resourceCalls = resourceRequests();
      try {
        await active.browser.get('/api/oauth/resource').set('Host', host).expect(401);
        expect(resourceRequests()).toBe(resourceCalls);
        expect(
          view(await active.browser.get('/api/oauth/session').set('Host', host).expect(200))
            .authenticated,
        ).toBe(false);
      } finally {
        tokenClock.mockRestore();
      }
      const historyClock = jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.now() + standardContextLifetimeMs);
      try {
        await active.browser
          .get(`/api/oauth/runs/${active.session.currentRun?.runId}/events`)
          .set('Host', host)
          .expect(404);
      } finally {
        historyClock.mockRestore();
      }
    });

    it('rejects a real pending callback on a fresh process-local application instance', async () => {
      const started = await beginCallback();
      const freshModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            ignoreEnvFile: true,
            skipProcessEnv: true,
            load: [registerAs('lab', () => config)],
          }),
          AuthorizationModule,
        ],
      }).compile();
      const fresh = freshModule.createNestApplication<INestApplication<Server>>({ logger: false });
      configureRequestLogging(fresh);
      fresh.useGlobalFilters(new AuthorizationErrorFilter());
      await fresh.listen(0, '127.0.0.1');
      const before = upstream.mock.calls.length;
      try {
        await request(fresh.getHttpServer())
          .get('/api/oauth/callback')
          .set('Host', host)
          .set(
            'Cookie',
            `${standardContextCookie}=${started.context.value}; ${standardBindingCookie}=${started.binding.value}`,
          )
          .query(Object.fromEntries(started.callback.searchParams))
          .expect(403);
        const anonymous = view(
          await request(fresh.getHttpServer())
            .get('/api/oauth/session')
            .set('Host', host)
            .expect(200),
        );
        expect(!anonymous.authenticated && anonymous.currentRun === null).toBe(true);
        expect(upstream.mock.calls.length).toBe(before);
      } finally {
        await fresh.close();
      }
    });

    it('exhausts actual observations and still cleans up credentials and a pending real callback', async () => {
      const started = await beginCallback();
      // One actual rejected callback plus login's nine observations yields ten.
      await started.browser
        .get('/api/oauth/callback')
        .set('Host', host)
        .query({
          ...Object.fromEntries(started.callback.searchParams),
          iss: 'http://localhost:5555/untrusted',
        })
        .expect(403);
      const completed = await complete(started).expect(303);
      const activeCookie = cookie(completed, standardContextCookie);
      const activeContext = store.standard.context(activeCookie.value);
      const active = view(
        await started.browser.get('/api/oauth/session').set('Host', host).expect(200),
      );
      for (let index = 0; index < 30; index += 1) {
        safeResponse(
          await started.browser.get('/api/oauth/resource').set('Host', host).expect(200),
        );
      }
      const full = await events(started.browser, active.currentRun?.runId);
      expect(full.events.length).toBe(100);
      const requests = resourceRequests();
      await started.browser.get('/api/oauth/resource').set('Host', host).expect(503);
      expect(resourceRequests()).toBe(requests);
      const waiting = await beginCallback(started.browser);
      const before = tokenRequests();
      const signedOut = view(await signOut(started.browser, active.csrfToken).expect(200));
      expect(signedOut.authenticated).toBe(false);
      expect(activeContext?.authentication).toBeUndefined();
      await complete(waiting).expect(403);
      expect(tokenRequests()).toBe(before);
      await started.browser.get('/api/oauth/resource').set('Host', host).expect(401);
      expect(resourceRequests()).toBe(requests);
      const retained = await events(started.browser, active.currentRun?.runId);
      expect(retained.events).toEqual(full.events);
      expect(retained.expiresAt).toBe(full.expiresAt);
      expect(retained.complete).toBe(false);
    });

    it('finishes real-session logout despite a throwing event recorder and cancels its pending code', async () => {
      const active = await authenticate();
      const prior = store.standard.context(active.context.value);
      const waiting = await beginCallback(active.browser);
      const before = tokenRequests();
      const marker = 'fictional-private-recorder-failure';
      sensitive.add(marker);
      const recorder = jest.spyOn(store.standard, 'record').mockImplementation(() => {
        throw new Error(marker);
      });
      try {
        const signedOut = view(await signOut(active.browser, active.session.csrfToken).expect(200));
        expect(signedOut.authenticated).toBe(false);
        expect(prior?.authentication).toBeUndefined();
        await complete(waiting).expect(403);
        expect(tokenRequests()).toBe(before);
        expect((await events(active.browser, active.session.currentRun?.runId)).complete).toBe(
          false,
        );
      } finally {
        recorder.mockRestore();
      }
    });
  });
});
