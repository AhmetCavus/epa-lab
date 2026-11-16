import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AuthorizationModule } from './authorization.module';
import { AuthorizationService } from './authorization.service';
import { BrowserLoginStore } from './browser-login/browser-login.store';
import { OidcClientService, createClientAuthorization } from '../oidc/oidc-client.service';
import { deriveCodeChallenge } from '../oidc/authorization-transaction';
import { AuthorizationErrorFilter } from '../common/errors/authorization-error.filter';
import {
  profileTestConfiguration,
  standardTestMetadata,
  testConfiguration,
  testMetadata,
} from '../../test/fixtures';

describe('fixed authorization profiles', () => {
  const requestJson = jest.fn<Promise<unknown>, [string, number, RequestInit?]>();
  let app: INestApplication<Server>;
  let service: AuthorizationService;
  let store: BrowserLoginStore;
  let logs: jest.SpiedFunction<Logger['log']>;
  let warnings: jest.SpiedFunction<Logger['warn']>;

  beforeEach(async () => {
    logs = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warnings = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    requestJson
      .mockReset()
      .mockImplementation((_url, status) =>
        Promise.resolve(
          status === 201
            ? { request_uri: 'urn:example:epa-only', expires_in: 60 }
            : { ...testMetadata },
        ),
      );
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [registerAs('lab', () => profileTestConfiguration)],
        }),
        AuthorizationModule,
      ],
    })
      .overrideProvider(OidcClientService)
      .useValue({ requestJson })
      .compile();
    service = module.get(AuthorizationService);
    store = module.get(BrowserLoginStore);
    app = module.createNestApplication({ logger: false });
    app.useGlobalFilters(new AuthorizationErrorFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('constructs direct code/S256 requests without PAR or browser/session storage', async () => {
    requestJson.mockResolvedValue(standardTestMetadata);
    const save = jest.spyOn(store, 'save');
    const session = jest.spyOn(store, 'createSession');
    const result = await service.initiateStandard();
    const url = new URL(result.authorizationUrl);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'playground-oidc',
      response_type: 'code',
      redirect_uri: 'http://localhost:3000/api/oauth/callback',
      scope: 'openid demo.fhir.read',
      state: result.transaction.state,
      nonce: result.transaction.nonce,
      code_challenge: deriveCodeChallenge(result.transaction.codeVerifier),
      code_challenge_method: 'S256',
    });
    expect(requestJson.mock.calls.filter((call) => call[1] === 201).length).toBe(0);
    expect(result.metadata).not.toHaveProperty('pushed_authorization_request_endpoint');
    expect(save).not.toHaveBeenCalled();
    expect(session).not.toHaveBeenCalled();
    expect(Object.isFrozen(result.transaction.profile)).toBe(true);
    for (const value of [
      profileTestConfiguration.standardProfile?.clientSecret,
      result.transaction.codeVerifier,
    ]) {
      expect(Boolean(value && result.authorizationUrl.includes(value))).toBe(false);
    }
  });

  it('retries with fresh state, nonce and verifier, without leaking transaction values to logs', async () => {
    const first = await service.initiateStandard();
    const second = await service.initiateStandard();
    for (const key of ['state', 'nonce', 'codeVerifier', 'codeChallenge'] as const) {
      expect(first.transaction[key] === second.transaction[key]).toBe(false);
      expect(
        JSON.stringify([logs.mock.calls, warnings.mock.calls]).includes(first.transaction[key]),
      ).toBe(false);
    }
  });

  it('keeps the ePA header route on PAR despite caller profile/credential settings', async () => {
    const response = await request(app.getHttpServer())
      .get('/epa/authz/v1/send_authorization_request_fdv')
      .set('x-idp-iss', testConfiguration.issuer)
      .set('x-useragent', 'EPA-AUTH-LAB/0.1.0')
      .set('x-profile', 'playground-standard')
      .set('x-client-id', 'playground-oidc')
      .expect(302);
    const location = response.get('Location');
    if (!location) {
      throw new Error('Expected an ePA authorization redirect');
    }
    const url = new URL(location);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: testConfiguration.clientId,
      request_uri: 'urn:example:epa-only',
    });
    const par = requestJson.mock.calls.find((call) => call[1] === 201);
    expect(
      Boolean(
        par &&
        new Headers(par[2]?.headers).get('authorization') ===
          createClientAuthorization(testConfiguration.clientId, testConfiguration.clientSecret),
      ),
    ).toBe(true);
    await request(app.getHttpServer())
      .get('/epa/authz/v1/send_authorization_request_fdv')
      .set('x-idp-iss', 'http://localhost:9090/unknown')
      .set('x-useragent', 'EPA-AUTH-LAB/0.1.0')
      .expect(404);
  });

  it('rejects legacy login query profile selection and keeps standard resource/run ownership separate', async () => {
    await request(app.getHttpServer())
      .get('/login')
      .query({
        profile: 'playground-standard',
        client_id: 'playground-oidc',
        redirect_uri: 'http://localhost:3000/api/oauth/callback',
      })
      .expect(400);
    const response = await request(app.getHttpServer()).get('/login').expect(302);
    const location = response.get('Location');
    if (!location) {
      throw new Error('Expected an ePA login redirect');
    }
    expect(new URL(location).searchParams.get('client_id')).toBe(testConfiguration.clientId);
    await request(app.getHttpServer())
      .get('/api/oauth/resource')
      .set('Host', 'localhost:3000')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/oauth/runs/unowned/events')
      .set('Host', 'localhost:3000')
      .expect(404);
  });
});
