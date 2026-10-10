import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, registerAs } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AuthorizationModule } from '../src/authorization/authorization.module';
import { AuthorizationErrorFilter } from '../src/common/errors/authorization-error.filter';
import { configureRequestLogging } from '../src/common/logging/request-logging';
import { HealthModule } from '../src/health/health.module';
import { OidcClientService, OidcUpstreamError } from '../src/oidc/oidc-client.service';
import { testConfiguration, testMetadata } from './fixtures';

const endpoint = '/epa/authz/v1/send_authorization_request_fdv';
const validHeaders = {
  'x-idp-iss': testConfiguration.issuer,
  'x-useragent': 'EPA-AUTH-LAB/0.1.0',
};

function expectError(code: string) {
  return ({ body }: { body: unknown }) => {
    expect(body).toMatchObject({ errorCode: code });
  };
}

describe('sendAuthorizationRequestFdV HTTP contract (mocked provider transport)', () => {
  let app: INestApplication<Server>;
  let requestUri: string;
  const requestJson = jest.fn<Promise<unknown>, [string, number, RequestInit?]>();

  function pushedParameters(): URLSearchParams {
    const body = requestJson.mock.calls.find((call) => call[1] === 201)?.[2]?.body;

    if (typeof body !== 'string') {
      throw new Error('Expected a form encoded PAR request');
    }

    return new URLSearchParams(body);
  }

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    requestUri = `urn:example:${randomUUID()}`;
    requestJson.mockReset().mockImplementation((_url, status) => {
      if (status === 200) {
        return Promise.resolve(testMetadata);
      }

      return Promise.resolve({ request_uri: requestUri, expires_in: 60 });
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
        HealthModule,
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

  it('returns an empty HTTP 302 with discovered Location and the actual PAR reference', async () => {
    const requestId = randomUUID().toUpperCase();
    const response = await request(app.getHttpServer())
      .get(endpoint)
      .set(validHeaders)
      .set('X-Request-ID', requestId)
      .redirects(0)
      .expect(302);
    const location = new URL(response.get('Location') ?? '');
    expect(`${location.origin}${location.pathname}`).toBe(testMetadata.authorization_endpoint);
    expect(Object.fromEntries(location.searchParams)).toEqual({
      client_id: testConfiguration.clientId,
      request_uri: requestUri,
    });
    expect(response.get('X-Request-ID')).toBe(requestId);
    expect(response.get('Cache-Control')).toBe('no-store');
    expect(response.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.get('Set-Cookie')).toBeUndefined();
    expect(response.text).toBe('');

    const parameters = pushedParameters();
    expect(parameters.get('redirect_uri')).toBe(testConfiguration.defaultRedirectUri);
    expect(parameters.get('state')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(parameters.get('nonce')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it.each(['x-idp-iss', 'x-useragent'])('rejects missing mandatory %s', async (missing) => {
    const headers: Record<string, string> = { ...validHeaders };
    delete headers[missing];
    await request(app.getHttpServer())
      .get(endpoint)
      .set(headers)
      .expect(400)
      .expect(({ body }: { body: unknown }) => {
        expect(body).toMatchObject({ errorCode: 'malformedRequest' });
      });
    expect(requestJson).not.toHaveBeenCalled();
  });

  it.each(['no-version', 'CLIENT_NAME/1.0', 'a'.repeat(21) + '/1', 'client/' + '1'.repeat(16)])(
    'rejects invalid x-useragent %s',
    async (userAgent) => {
      await request(app.getHttpServer())
        .get(endpoint)
        .set(validHeaders)
        .set('x-useragent', userAgent)
        .expect(400)
        .expect(expectError('malformedRequest'));
      expect(requestJson).not.toHaveBeenCalled();
    },
  );

  it.each([
    'http://169.254.169.254/latest/meta-data',
    'https://attacker.example/issuer',
    testConfiguration.issuer + '/',
    'not-a-url',
  ])('rejects an unknown issuer before any discovery (%s)', async (issuer) => {
    await request(app.getHttpServer())
      .get(endpoint)
      .set(validHeaders)
      .set('x-idp-iss', issuer)
      .expect(404)
      .expect(expectError('noResource'));
    expect(requestJson).not.toHaveBeenCalled();
  });

  it.each(['https://attacker.example/callback', 'http://localhost:3000/callback?attack=1'])(
    'rejects an unregistered redirect URI %s',
    async (redirectUri) => {
      await request(app.getHttpServer())
        .get(endpoint)
        .set(validHeaders)
        .set('x-redirecturi', redirectUri)
        .expect(403)
        .expect(expectError('invalRedir'));
      expect(requestJson).not.toHaveBeenCalled();
    },
  );

  it('pushes an explicitly allowlisted redirect URI', async () => {
    const redirectUri = 'http://localhost:3000/registered';
    await request(app.getHttpServer())
      .get(endpoint)
      .set(validHeaders)
      .set('x-redirecturi', redirectUri)
      .expect(302);
    expect(pushedParameters().get('redirect_uri')).toBe(redirectUri);
  });

  it.each(['x-authorize-representative', 'x-authorize-egk'])(
    'rejects unsupported guest flow %s',
    async (header) => {
      await request(app.getHttpServer())
        .get(endpoint)
        .set(validHeaders)
        .set(header, 'true')
        .expect(403)
        .expect(expectError('invalAuth'));
      expect(requestJson).not.toHaveBeenCalled();
    },
  );

  it.each(['false', 'TRUE', '1'])(
    'rejects guest headers outside enum [true] (%s)',
    async (value) => {
      await request(app.getHttpServer())
        .get(endpoint)
        .set(validHeaders)
        .set('x-authorize-egk', value)
        .expect(400)
        .expect(expectError('malformedRequest'));
    },
  );

  it('rejects simultaneous guest modes as required by the contract', async () => {
    await request(app.getHttpServer())
      .get(endpoint)
      .set(validHeaders)
      .set('x-authorize-egk', 'true')
      .set('x-authorize-representative', 'true')
      .expect(400)
      .expect(expectError('malformedRequest'));
  });

  it('validates request IDs and echoes a valid ID on errors', async () => {
    await request(app.getHttpServer())
      .get(endpoint)
      .set(validHeaders)
      .set('X-Request-ID', 'invalid')
      .expect(400);
    const id = randomUUID();
    const response = await request(app.getHttpServer())
      .get(endpoint)
      .set('x-useragent', validHeaders['x-useragent'])
      .set('X-Request-ID', id)
      .expect(400);
    expect(response.get('X-Request-ID')).toBe(id);
  });

  it('rejects unexpected query parameters', async () => {
    await request(app.getHttpServer())
      .get(`${endpoint}?redirect_uri=https://attacker.example`)
      .set(validHeaders)
      .expect(400);
    expect(requestJson).not.toHaveBeenCalled();
  });

  it.each(['network_error', 'invalid_discovery', 'timeout'] as const)(
    'maps provider failure %s to sanitized HTTP 500',
    async (reason) => {
      requestJson.mockRejectedValueOnce(new OidcUpstreamError(reason));
      await request(app.getHttpServer()).get(endpoint).set(validHeaders).expect(500, {
        errorCode: 'internalError',
        errorDetail: 'Authorization provider unavailable or invalid response.',
      });
    },
  );

  it('maps a PAR rejection after successful discovery to HTTP 403', async () => {
    requestJson.mockResolvedValueOnce(testMetadata);
    requestJson.mockRejectedValueOnce(new OidcUpstreamError('unexpected_status', 400, true));
    await request(app.getHttpServer())
      .get(endpoint)
      .set(validHeaders)
      .expect(403)
      .expect(expectError('invalAuth'));
  });

  it('exposes liveness and discovery readiness without claiming authentication', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'up' });
    expect(requestJson).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200, { status: 'up', oidcDiscovery: 'available' });
  });
});
