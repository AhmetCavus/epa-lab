import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
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
import {
  standardBindingCookie,
  standardContextCookie,
  standardCsrfHeader,
} from '../src/authorization/standard-login/standard-browser.controller';
import { AuthorizationErrorFilter } from '../src/common/errors/authorization-error.filter';
import { configureRequestLogging } from '../src/common/logging/request-logging';
import { OidcClientService } from '../src/oidc/oidc-client.service';

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
        observationsAvailable: z.literal(false),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .refine((view) => view.authenticated === (view.expiresAt !== null));

describe('standard browser HTTP lifecycle with the real private Keycloak', () => {
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
                PLAYGROUND_APP_ORIGIN: new URL(callback).origin,
              }),
            ),
          ],
        }),
        AuthorizationModule,
      ],
    }).compile();
    config = module.get<ConfigType<typeof configuration>>(configuration.KEY);
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
  });

  afterAll(async () => {
    try {
      if (identityId) {
        await admin(`/users/${identityId}`, 'DELETE');
      }
      const output = JSON.stringify([logs?.mock.calls, warnings?.mock.calls]);
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

  async function providerCallback(location: string): Promise<URL> {
    let url = new URL(location);
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
});
