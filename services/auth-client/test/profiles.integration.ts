import { Logger } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseEnv } from 'node:util';
import { z } from 'zod';
import { configuration, readConfiguration } from '../src/config/configuration';
import { AuthorizationModule } from '../src/authorization/authorization.module';
import { clientProfile } from '../src/config/client-profile';
import type { ClientProfileId } from '../src/config/client-profile';
import { AuthorizationService } from '../src/authorization/authorization.service';
import { BrowserLoginStore } from '../src/authorization/browser-login/browser-login.store';
import { deriveCodeChallenge } from '../src/oidc/authorization-transaction';
import {
  OidcClientService,
  OidcUpstreamError,
  createClientAuthorization,
} from '../src/oidc/oidc-client.service';
import { AuthorizationError } from '../src/common/errors/authorization-error';
import { TokenService } from '../src/oidc/token.service';

const adminTokenSchema = z.object({ access_token: z.string().min(1) });
const usersSchema = z.array(z.object({ id: z.string(), username: z.string() }));
const realmSchema = z.object({ accessCodeLifespan: z.number().int().min(1).max(300) });

describe('real Keycloak profile separation (no mission browser routes or sessions)', () => {
  let module: TestingModule | undefined;
  let config: ConfigType<typeof configuration>;
  let authorization: AuthorizationService;
  let tokens: TokenService;
  let store: BrowserLoginStore;
  let transport: jest.SpiedFunction<OidcClientService['requestJson']>;
  let logs: jest.SpiedFunction<Logger['log']>;
  let warnings: jest.SpiedFunction<Logger['warn']>;
  let errors: jest.SpiedFunction<Logger['error']>;
  let environment: Record<string, string | undefined>;
  let userId: string | undefined;
  let codeLifetime: number;
  const username = `profile-verification-${randomBytes(8).toString('hex')}`;
  const password = randomBytes(32).toString('base64url');
  const sensitive = new Set<string>([password]);

  function remember(value: string): string {
    sensitive.add(value);
    return value;
  }

  async function admin(
    path: string,
    method = 'GET',
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const adminUsername = environment.KEYCLOAK_ADMIN_USERNAME;
    const adminPassword = environment.KEYCLOAK_ADMIN_PASSWORD;
    if (!adminUsername || !adminPassword) {
      throw new Error('Private admin credentials are required for disposable identity setup');
    }
    remember(adminPassword);
    const origin = new URL(config.issuer).origin;
    const authenticated = await fetch(`${origin}/realms/master/protocol/openid-connect/token`, {
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
    });
    if (!authenticated.ok) {
      throw new Error('Private administrator authentication failed');
    }
    const token = adminTokenSchema.safeParse(await authenticated.json());
    if (!token.success) {
      throw new Error('Invalid administrator token response');
    }
    remember(token.data.access_token);
    const response = await fetch(`${origin}/admin/realms/epa-demo${path}`, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(config.httpTimeoutMs),
      headers: {
        authorization: `Bearer ${token.data.access_token}`,
        'content-type': 'application/json',
      },
      body: body === undefined ? null : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Private test identity operation failed (HTTP ${response.status})`);
    }
    return response.status === 204 || response.status === 201 ? undefined : response.json();
  }

  beforeAll(async () => {
    environment = parseEnv(await readFile(resolve(__dirname, '../../../.env'), 'utf8'));
    const callback = environment.PLAYGROUND_OIDC_REDIRECT_URI;
    if (!callback) {
      throw new Error('The configured standard client/callback is required');
    }
    logs = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnings = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errors = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    // Use the production configuration factory in process-local Nest composition, without listeners.
    module = await Test.createTestingModule({
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
    authorization = module.get(AuthorizationService);
    tokens = module.get(TokenService);
    store = module.get(BrowserLoginStore);
    transport = jest.spyOn(module.get(OidcClientService), 'requestJson');
    remember(config.clientSecret);
    remember(clientProfile(config, 'playground-standard').clientSecret);
    await admin('/users', 'POST', {
      username,
      enabled: true,
      firstName: 'Fictional',
      lastName: 'Verifier',
      email: `${username}@example.invalid`,
      requiredActions: [],
      credentials: [{ type: 'password', value: password, temporary: false }],
    });
    const users = usersSchema.safeParse(await admin(`/users?username=${username}&exact=true`));
    if (!users.success || users.data.length !== 1 || users.data[0]?.username !== username) {
      throw new Error('Disposable test identity lookup failed');
    }
    userId = users.data[0].id;
    const realm = realmSchema.safeParse(await admin(''));
    if (!realm.success) {
      throw new Error('Expected a bounded authorization-code lifetime');
    }
    codeLifetime = realm.data.accessCodeLifespan;
  });

  beforeEach(() => transport?.mockClear());

  afterAll(async () => {
    try {
      if (userId) {
        await admin(`/users/${userId}`, 'DELETE');
      }
      const output = JSON.stringify([logs?.mock.calls, warnings?.mock.calls, errors?.mock.calls]);
      expect([...sensitive].some((value) => output.includes(value))).toBe(false);
    } finally {
      await module?.close();
      jest.restoreAllMocks();
    }
  });

  async function begin(id: ClientProfileId) {
    const binding = randomBytes(32).toString('base64url');
    if (id === 'playground-standard') {
      const result = await authorization.initiateStandard();
      remember(result.transaction.state);
      remember(result.transaction.nonce);
      remember(result.transaction.codeVerifier);
      return result;
    }
    const url = await authorization.initiate(
      { issuer: config.issuer, redirectUri: undefined, requestId: randomUUID() },
      binding,
    );
    const par = [...transport.mock.calls].reverse().find((call) => call[1] === 201);
    const body = par?.[2]?.body;
    if (typeof body !== 'string') {
      throw new Error('Expected the existing ePA PAR form');
    }
    const state = new URLSearchParams(body).get('state');
    if (!state) {
      throw new Error('Expected the existing ePA state');
    }
    const login = store.consume(state, binding);
    remember(login.transaction.state);
    remember(login.transaction.nonce);
    remember(login.transaction.codeVerifier);
    return { authorizationUrl: url, transaction: login.transaction, metadata: login.metadata };
  }

  async function login(started: Awaited<ReturnType<typeof begin>>): Promise<string> {
    let url = new URL(started.authorizationUrl);
    const providerOrigin = new URL(config.issuer).origin;
    const cookies = new Map<string, string>();
    let response: Response | undefined;
    for (let index = 0; index < 5; index += 1) {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(config.httpTimeoutMs),
        headers: { cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') },
      });
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0] ?? '';
        const separator = pair.indexOf('=');
        cookies.set(pair.slice(0, separator), remember(pair.slice(separator + 1)));
      }
      if (![302, 303].includes(response.status)) {
        break;
      }
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Missing internal provider redirect');
      }
      url = new URL(location, url);
      if (url.origin !== providerOrigin) {
        throw new Error('Unexpected internal provider origin');
      }
      await response.body?.cancel();
    }
    if (response?.status !== 200) {
      throw new Error('Expected provider login form');
    }
    const html = await response.text();
    const form = /<form\b[^>]*\bid="kc-form-login"[^>]*>/.exec(html)?.[0];
    const action = form === undefined ? undefined : /\baction="([^"]+)"/.exec(form)?.[1];
    if (!action) {
      throw new Error('Expected provider login action');
    }
    const actionUrl = new URL(action.replaceAll('&amp;', '&'), url);
    if (actionUrl.origin !== providerOrigin) {
      throw new Error('Unexpected provider login action');
    }
    const authenticated = await fetch(actionUrl, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(config.httpTimeoutMs),
      headers: {
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ username, password, credentialId: '' }),
    });
    if (authenticated.status !== 302) {
      throw new Error('Provider login did not complete');
    }
    const callback = new URL(authenticated.headers.get('location') ?? '');
    if (
      `${callback.origin}${callback.pathname}` !== started.transaction.profile.redirectUri ||
      callback.searchParams.get('state') !== started.transaction.state
    ) {
      throw new Error('Provider callback did not match the stored profile context');
    }
    const code = callback.searchParams.get('code');
    if (!code) {
      throw new Error('Provider callback did not contain an authorization code');
    }
    await authenticated.body?.cancel();
    return remember(code);
  }

  async function exchange(started: Awaited<ReturnType<typeof begin>>, code: string) {
    const result = await tokens.exchange(
      started.metadata,
      started.transaction,
      code,
      started.transaction.profile.id,
    );
    remember(result.tokens.access_token);
    remember(result.tokens.id_token);
    if (result.tokens.refresh_token) {
      remember(result.tokens.refresh_token);
    }
    return result;
  }

  async function expectRejected(
    operation: Promise<unknown>,
    expected: { status: number } | { upstreamStatus: number },
  ): Promise<void> {
    let failure: { status?: number; upstreamStatus?: number } | undefined;
    try {
      await operation;
    } catch (error) {
      if (error instanceof AuthorizationError) {
        failure = { status: error.getStatus() };
      } else if (error instanceof OidcUpstreamError && error.upstreamStatus !== undefined) {
        failure = { upstreamStatus: error.upstreamStatus };
      } else {
        failure = {};
      }
    }
    // An unexpected success must never make Jest print a VerifiedLogin containing real tokens.
    expect(failure).toMatchObject(expected);
  }

  it('starts the actual Nest module with both validated fixed profiles', () => {
    expect(clientProfile(config, 'playground-standard').clientId).toBe('playground-oidc');
    expect(clientProfile(config, 'epa-par').clientId).toBe(config.clientId);
  });

  it('completes a direct standard code/S256 exchange without a PAR request', async () => {
    const started = await begin('playground-standard');
    const url = new URL(started.authorizationUrl);
    expect(url.searchParams.has('request_uri')).toBe(false);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    const code = await login(started);
    const result = await exchange(started, code);
    expect(result.idToken.identity.issuer).toBe(config.issuer);
    expect(transport.mock.calls.filter((call) => call[1] === 201).length).toBe(0);
    const tokenCall = transport.mock.calls.find(
      ([endpoint]) => endpoint === started.metadata.token_endpoint,
    );
    expect(
      new Headers(tokenCall?.[2]?.headers).get('authorization') ===
        createClientAuthorization(
          'playground-oidc',
          clientProfile(config, 'playground-standard').clientSecret,
        ),
    ).toBe(true);
  });

  it('rejects cross-profile route substitution before transport without consuming the provider code', async () => {
    const started = await begin('playground-standard');
    const code = await login(started);
    const before = transport.mock.calls.length;
    await expectRejected(tokens.exchange(started.metadata, started.transaction, code, 'epa-par'), {
      status: 403,
    });
    expect(transport.mock.calls.length).toBe(before);
    await exchange(started, code);
  });

  it('preserves the existing ePA PAR construction and exchange credentials', async () => {
    const started = await begin('epa-par');
    expect(new URL(started.authorizationUrl).searchParams.has('request_uri')).toBe(true);
    await exchange(started, await login(started));
    expect(transport.mock.calls.filter((call) => call[1] === 201).length).toBe(1);
  });

  it.each<ClientProfileId>(['epa-par', 'playground-standard'])(
    'rejects a provider code issued for the other client (%s)',
    async (id) => {
      const issued = await begin(id === 'epa-par' ? 'playground-standard' : 'epa-par');
      const code = await login(issued);
      const substitute = await begin(id);
      await expectRejected(exchange(substitute, code), { upstreamStatus: 400 });
    },
  );

  it('rejects a wrong verifier at the real provider, even when the stored challenge is internally consistent', async () => {
    const started = await begin('playground-standard');
    const code = await login(started);
    const verifier = remember(randomBytes(32).toString('base64url'));
    const changed = {
      ...started,
      transaction: {
        ...started.transaction,
        codeVerifier: verifier,
        codeChallenge: deriveCodeChallenge(verifier),
      },
    };
    await expectRejected(exchange(changed, code), { upstreamStatus: 400 });
  });

  it('rejects a real authorization code after its successful exchange', async () => {
    const started = await begin('playground-standard');
    const code = await login(started);
    await exchange(started, code);
    await expectRejected(exchange(started, code), { upstreamStatus: 400 });
  });

  it('rejects actually expired standard and ePA codes without changing provider lifetimes', async () => {
    const pending = [];
    for (const id of ['epa-par', 'playground-standard'] as const) {
      const started = await begin(id);
      pending.push({ started, code: await login(started) });
    }
    await delay((codeLifetime + 2) * 1000);
    for (const { started, code } of pending) {
      await expectRejected(exchange(started, code), { upstreamStatus: 400 });
    }
  }, 320000);
});
