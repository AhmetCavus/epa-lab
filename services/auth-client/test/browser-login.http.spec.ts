import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHash, generateKeyPairSync } from 'node:crypto';
import type { Server } from 'node:http';
import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { AuthorizationModule } from '../src/authorization/authorization.module';
import { loginLifetimeMs } from '../src/authorization/browser-login/browser-login.store';
import { AuthorizationErrorFilter } from '../src/common/errors/authorization-error.filter';
import { configureRequestLogging } from '../src/common/logging/request-logging';
import { OidcClientService } from '../src/oidc/oidc-client.service';
import { testConfiguration, testMetadata } from './fixtures';

const signingKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicJwk = signingKeys.publicKey.export({ format: 'jwk' });
const callbackCode = 'fictional-authorization-code';
const accessToken = 'fictional-access-token';

describe('browser login and callback (real JWT signatures, mocked provider transport)', () => {
  let app: INestApplication<Server>;
  let claimsOverride: Record<string, unknown>;
  let tokenOverride: Record<string, unknown>;
  let invalidSignature: boolean;
  let unsupportedAlgorithm: boolean;
  let duplicateKeys: boolean;
  let signingKeyId: string;
  let logSpy: jest.SpiedFunction<Logger['log']>;
  let warnSpy: jest.SpiedFunction<Logger['warn']>;
  const requestJson = jest.fn<Promise<unknown>, [string, number, RequestInit?]>();

  function pushedParameters() {
    const body = [...requestJson.mock.calls].reverse().find((call) => call[1] === 201)?.[2]?.body;

    if (typeof body !== 'string') {
      throw new Error('PAR form was not captured');
    }

    return new URLSearchParams(body);
  }

  function tokenRequests() {
    return requestJson.mock.calls.filter((call) => call[0] === testMetadata.token_endpoint);
  }

  beforeEach(async () => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    claimsOverride = {};
    tokenOverride = {};
    invalidSignature = false;
    unsupportedAlgorithm = false;
    duplicateKeys = false;
    signingKeyId = 'demo-signing-key';
    requestJson.mockReset().mockImplementation((url) => {
      if (url === testMetadata.pushed_authorization_request_endpoint) {
        return Promise.resolve({ request_uri: 'urn:example:browser-login', expires_in: 60 });
      }

      if (url === testMetadata.jwks_uri) {
        const key = { ...publicJwk, kid: signingKeyId, alg: 'RS256', use: 'sig' };
        return Promise.resolve({ keys: duplicateKeys ? [key, key] : [key] });
      }

      if (url === testMetadata.token_endpoint) {
        const now = Math.floor(Date.now() / 1000);
        const claims = {
          sub: 'fictional-user',
          iss: testConfiguration.issuer,
          aud: testConfiguration.clientId,
          iat: now,
          exp: now + 300,
          nonce: pushedParameters().get('nonce'),
          preferred_username: 'demo-versicherte',
          ...claimsOverride,
        };
        const payload = Object.fromEntries(
          Object.entries(claims).filter(([, claim]) => claim !== undefined),
        );
        const idToken = unsupportedAlgorithm
          ? sign(payload, 'fictional-hmac-secret', { algorithm: 'HS256', keyid: signingKeyId })
          : sign(payload, invalidSignature ? otherKeys.privateKey : signingKeys.privateKey, {
              algorithm: 'RS256',
              keyid: signingKeyId,
            });

        return Promise.resolve({
          access_token: accessToken,
          id_token: idToken,
          token_type: 'Bearer',
          expires_in: 300,
          ...tokenOverride,
        });
      }

      return Promise.resolve(testMetadata);
    });

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [registerAs('lab', () => testConfiguration)],
        }),
        AuthorizationModule,
      ],
    })
      .overrideProvider(OidcClientService)
      .useValue({ requestJson })
      .compile();
    app = module.createNestApplication({ logger: false });
    configureRequestLogging(app);
    app.useGlobalFilters(new AuthorizationErrorFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  async function beginLogin() {
    const browser = request.agent(app.getHttpServer());
    const response = await browser.get('/login').redirects(0).expect(302);
    expect(response.get('Set-Cookie')).toEqual(
      expect.arrayContaining([expect.stringMatching(/epa_login=.+;.*HttpOnly; SameSite=Lax/)]),
    );
    return { browser, state: pushedParameters().get('state') ?? '' };
  }

  it('exchanges the original PKCE verifier and establishes a session without exposing tokens', async () => {
    const { browser, state } = await beginLogin();
    const response = await browser
      .get('/callback')
      .query({ state, code: callbackCode, iss: testConfiguration.issuer })
      .redirects(0)
      .expect(303);
    expect(response.get('Location')).toBe('/session');
    const session = await browser.get('/session').expect(200);
    expect(session.body).toMatchObject({
      authenticated: true,
      user: { subject: 'fictional-user', username: 'demo-versicherte' },
    });
    expect(session.text).not.toContain(accessToken);
    expect(session.text).not.toContain(callbackCode);
    expect(session.text).not.toContain('id_token');
    const body = tokenRequests()[0]?.[2]?.body;

    if (typeof body !== 'string') {
      throw new Error('Expected a token exchange form');
    }

    const exchange = new URLSearchParams(body);
    const verifier = exchange.get('code_verifier') ?? '';
    expect(exchange.get('code')).toBe(callbackCode);
    expect(exchange.get('redirect_uri')).toBe(testConfiguration.defaultRedirectUri);
    expect(exchange.get('grant_type')).toBe('authorization_code');
    expect(createHash('sha256').update(verifier).digest('base64url')).toBe(
      pushedParameters().get('code_challenge'),
    );
    const logs = JSON.stringify([logSpy.mock.calls, warnSpy.mock.calls]);
    expect(logs).not.toContain(accessToken);
    expect(logs).not.toContain(callbackCode);
    expect(logs).not.toContain(verifier);
    expect(logs).not.toContain(state);
  });

  it('rejects another browser without consuming the legitimate login', async () => {
    const { browser, state } = await beginLogin();
    await request(app.getHttpServer())
      .get('/callback')
      .query({ state, code: callbackCode })
      .expect(403);
    expect(tokenRequests()).toHaveLength(0);
    await browser.get('/callback').query({ state, code: callbackCode }).expect(303);
  });

  it('rejects callback replay after completion', async () => {
    const { browser, state } = await beginLogin();
    await browser.get('/callback').query({ state, code: callbackCode }).expect(303);
    await browser.get('/callback').query({ state, code: callbackCode }).expect(403);
    expect(tokenRequests()).toHaveLength(1);
  });

  it('rejects expired transactions before contacting the token endpoint', async () => {
    const { browser, state } = await beginLogin();
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + loginLifetimeMs + 1);
    await browser.get('/callback').query({ state, code: callbackCode }).expect(403);
    expect(tokenRequests()).toHaveLength(0);
  });

  it.each([
    {},
    { state: 'untracked' },
    { state: ['duplicate', 'state'], code: callbackCode },
    { state: 'a'.repeat(43), code: callbackCode, error: 'access_denied' },
  ])('rejects malformed callback input (%#)', async (query) => {
    await request(app.getHttpServer()).get('/callback').query(query).expect(400);
    expect(tokenRequests()).toHaveLength(0);
  });

  it('rejects a mismatched callback issuer without consuming the legitimate login', async () => {
    const { browser, state } = await beginLogin();
    await browser
      .get('/callback')
      .query({ state, code: callbackCode, iss: 'https://attacker.example' })
      .expect(403);
    expect(tokenRequests()).toHaveLength(0);
    await browser.get('/callback').query({ state, code: callbackCode }).expect(303);
  });

  it('consumes a provider-denied login without exchanging a code', async () => {
    const { browser, state } = await beginLogin();
    await browser.get('/callback').query({ state, error: 'access_denied' }).expect(403);
    await browser.get('/callback').query({ state, code: callbackCode }).expect(403);
    expect(tokenRequests()).toHaveLength(0);
  });

  it.each([
    { nonce: 'wrong-nonce' },
    { aud: 'another-client' },
    { iss: 'https://attacker.example' },
    { exp: 1 },
    { exp: undefined },
    { iat: Math.floor(Date.now() / 1000) + 3600 },
    { azp: 'another-client' },
    { aud: [testConfiguration.clientId, 'another-client'] },
    { at_hash: 'wrong-access-token-hash' },
  ])('rejects invalid ID-token claims and does not create a session (%#)', async (claims) => {
    claimsOverride = claims;
    const { browser, state } = await beginLogin();
    await browser.get('/callback').query({ state, code: callbackCode }).expect(403);
    await browser.get('/session').expect(200, { authenticated: false });
    await browser.get('/callback').query({ state, code: callbackCode }).expect(403);
    expect(tokenRequests()).toHaveLength(1);
  });

  it('rejects a forged signature', async () => {
    invalidSignature = true;
    const { browser, state } = await beginLogin();
    await browser.get('/callback').query({ state, code: callbackCode }).expect(403);
    await browser.get('/session').expect(200, { authenticated: false });
  });

  it('rejects an HMAC token before fetching provider keys', async () => {
    unsupportedAlgorithm = true;
    const { browser, state } = await beginLogin();
    await browser.get('/callback').query({ state, code: callbackCode }).expect(403);
    expect(requestJson.mock.calls.some((call) => call[0] === testMetadata.jwks_uri)).toBe(false);
  });

  it('rejects duplicate signing-key IDs, including cached keys on a subsequent login', async () => {
    duplicateKeys = true;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { browser, state } = await beginLogin();
      await browser.get('/callback').query({ state, code: callbackCode }).expect(403);
    }
  });

  it('rejects an incomplete token response', async () => {
    tokenOverride = { id_token: undefined };
    const { browser, state } = await beginLogin();
    await browser.get('/callback').query({ state, code: callbackCode }).expect(500);
    await browser.get('/session').expect(200, { authenticated: false });
  });

  it('caches signing keys and refreshes when the provider rotates its key ID', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.now());

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt === 2) {
        signingKeyId = 'rotated-signing-key';
      }

      const { browser, state } = await beginLogin();
      await browser.get('/callback').query({ state, code: callbackCode }).expect(303);
    }

    expect(requestJson.mock.calls.filter((call) => call[0] === testMetadata.jwks_uri)).toHaveLength(
      2,
    );
  });

  it('expires the browser session when its tokens expire', async () => {
    const { browser, state } = await beginLogin();
    await browser.get('/callback').query({ state, code: callbackCode }).expect(303);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 301000);
    await browser.get('/session').expect(200, { authenticated: false });
  });
});
