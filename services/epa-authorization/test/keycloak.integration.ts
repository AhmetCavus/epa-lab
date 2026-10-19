import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { ConfigType } from '@nestjs/config';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configuration } from '../src/config/configuration';
import { AuthorizationErrorFilter } from '../src/common/errors/authorization-error.filter';
import { configureRequestLogging } from '../src/common/logging/request-logging';
import { OidcDiscoveryService } from '../src/oidc/oidc-discovery.service';
import type { OidcMetadata } from '../src/oidc/oidc-discovery.service';
import { createAuthorizationTransaction } from '../src/oidc/authorization-transaction';

async function openKeycloakLoginPage(
  url: URL,
  timeoutMs: number,
  cookies = new Map<string, string>(),
): Promise<Response> {
  const origin = url.origin;

  for (let redirectCount = 0; redirectCount < 3; redirectCount += 1) {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; ') },
    });

    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0] ?? '';
      const separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }

    if (response.status !== 302 && response.status !== 303) {
      return response;
    }

    const location = response.headers.get('location');

    if (!location) {
      throw new Error('Keycloak redirect is missing Location');
    }

    const nextUrl = new URL(location, url);

    if (nextUrl.origin !== origin) {
      throw new Error('Expected an internal Keycloak login redirect');
    }

    await response.body?.cancel();
    url = nextUrl;
  }

  throw new Error('Keycloak login redirect limit exceeded');
}

describe('real Keycloak 26.8.0 PAR integration (requires pnpm infra:up)', () => {
  let app: INestApplication<Server>;
  let config: ConfigType<typeof configuration>;
  let metadata: OidcMetadata;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    configureRequestLogging(app);
    app.useGlobalFilters(new AuthorizationErrorFilter());
    await app.init();
    config = app.get<ConfigType<typeof configuration>>(configuration.KEY);
    // No providers are mocked: discovery and PAR use the real HTTP transport.
    metadata = await app.get(OidcDiscoveryService).discover();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('retrieves real discovery, including PAR and required client authentication support', () => {
    expect(metadata.issuer).toBe(config.issuer);
    expect(new URL(metadata.pushed_authorization_request_endpoint).origin).toBe(
      new URL(config.issuer).origin,
    );
    expect(metadata.token_endpoint_auth_methods_supported).toContain('client_secret_basic');
    expect(metadata.code_challenge_methods_supported).toContain('S256');
  });

  it('returns a genuine Keycloak PAR reference which opens an unauthenticated login form', async () => {
    const requestId = randomUUID();
    const response = await request(app.getHttpServer())
      .get('/epa/authz/v1/send_authorization_request_fdv')
      .set('x-idp-iss', config.issuer)
      .set('x-useragent', 'EPA-AUTH-LAB/0.1.0')
      .set('X-Request-ID', requestId)
      .redirects(0)
      .expect(302);
    const authorizationUrl = new URL(response.get('Location') ?? '');
    expect(`${authorizationUrl.origin}${authorizationUrl.pathname}`).toBe(
      metadata.authorization_endpoint,
    );
    expect(authorizationUrl.searchParams.get('client_id')).toBe(config.clientId);
    expect(Boolean(authorizationUrl.searchParams.get('request_uri'))).toBe(true);
    expect([...authorizationUrl.searchParams.keys()].sort()).toEqual(['client_id', 'request_uri']);
    expect(response.get('X-Request-ID')).toBe(requestId);
    expect(response.get('Set-Cookie')).toBeUndefined();

    const login = await openKeycloakLoginPage(authorizationUrl, config.httpTimeoutMs);
    expect(login.status).toBe(200);
    expect(login.headers.get('content-type')).toContain('text/html');
    const loginPage = await login.text();
    // A recognized reference produces the real login form; an invented one does not.
    expect(loginPage.includes('id="kc-form-login"')).toBe(true);
    expect(loginPage.includes('name="username"')).toBe(true);
    expect(loginPage.includes('name="password"')).toBe(true);
  });

  it('enforces the imported PAR client policy for ordinary authorization requests', async () => {
    const transaction = createAuthorizationTransaction();
    const authorizationUrl = new URL(metadata.authorization_endpoint);
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.defaultRedirectUri,
      scope: 'openid',
      state: transaction.state,
      nonce: transaction.nonce,
      code_challenge: transaction.codeChallenge,
      code_challenge_method: 'S256',
    }).toString();
    const response = await fetch(authorizationUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(config.httpTimeoutMs),
    });
    const body = await response.text();
    expect(response.status).toBe(400);
    expect(body.includes('id="kc-form-login"')).toBe(false);
  });

  it('completes a real browser login, exchanges the code and validates the ID token', async () => {
    const environment = parseEnv(await readFile(resolve(__dirname, '../../../.env'), 'utf8'));
    const password = process.env.TEST_USER_PASSWORD ?? environment.TEST_USER_PASSWORD;

    if (!password) {
      throw new Error('TEST_USER_PASSWORD is required for the real browser login test');
    }

    const browser = request.agent(app.getHttpServer());
    const started = await browser.get('/login').redirects(0).expect(302);
    const cookies = new Map<string, string>();
    const loginPage = await openKeycloakLoginPage(
      new URL(started.get('Location') ?? ''),
      config.httpTimeoutMs,
      cookies,
    );
    const html = await loginPage.text();
    const form = /<form\b[^>]*\bid="kc-form-login"[^>]*>/.exec(html)?.[0];
    const action = form === undefined ? undefined : /\baction="([^"]+)"/.exec(form)?.[1];

    if (!action) {
      throw new Error('Keycloak login form action is missing');
    }

    const actionUrl = new URL(action.replace(/&amp;/g, '&'), metadata.authorization_endpoint);
    expect(actionUrl.origin).toBe(new URL(config.issuer).origin);
    const authenticated = await fetch(actionUrl, {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(config.httpTimeoutMs),
      headers: {
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ username: 'demo-versicherte', password, credentialId: '' }),
    });
    expect(authenticated.status).toBe(302);
    const callback = new URL(authenticated.headers.get('location') ?? '');
    expect(`${callback.origin}${callback.pathname}`).toBe(config.defaultRedirectUri);
    expect(Boolean(callback.searchParams.get('code'))).toBe(true);
    await authenticated.body?.cancel();
    const completed = await browser
      .get('/callback')
      .query(Object.fromEntries(callback.searchParams))
      .redirects(0)
      .expect(303);
    expect(completed.get('Location')).toBe('/session');
    const session = await browser.get('/session').expect(200);
    expect(session.body).toMatchObject({ authenticated: true, user: { issuer: config.issuer } });
    expect(session.text).not.toContain('access_token');
    expect(session.text).not.toContain('id_token');
  });

  it('rejects invented request_uri references', async () => {
    const authorizationUrl = new URL(metadata.authorization_endpoint);
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      request_uri: `urn:ietf:params:oauth:request_uri:${randomUUID()}`,
    }).toString();
    const response = await fetch(authorizationUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(config.httpTimeoutMs),
    });
    expect(response.status).toBe(400);
    expect((await response.text()).includes('id="kc-form-login"')).toBe(false);
  });

  it('requires confidential client credentials on the real PAR endpoint', async () => {
    const transaction = createAuthorizationTransaction();
    const response = await fetch(metadata.pushed_authorization_request_endpoint, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(config.httpTimeoutMs),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: config.defaultRedirectUri,
        scope: 'openid',
        state: transaction.state,
        nonce: transaction.nonce,
        code_challenge: transaction.codeChallenge,
        code_challenge_method: 'S256',
      }),
    });
    expect(response.status).toBe(401);
    await response.body?.cancel();
  });
});
