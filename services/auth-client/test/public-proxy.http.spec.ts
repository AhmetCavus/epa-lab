import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { ConfigModule, registerAs } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthorizationModule } from '../src/authorization/authorization.module';
import { AuthorizationErrorFilter } from '../src/common/errors/authorization-error.filter';
import { readConfiguration } from '../src/config/configuration';
import { standardTestEnvironment } from './fixtures';

const environment = {
  ...standardTestEnvironment,
  PLAYGROUND_PUBLIC_RUNTIME: 'true',
  PLAYGROUND_PUBLIC_PROXY_ADDRESSES: '127.0.0.1,::1',
  PLAYGROUND_OIDC_ISSUER: 'https://auth-playground.yappai.de/realms/playground-public',
  PLAYGROUND_APP_ORIGIN: 'https://auth-playground.yappai.de',
  PLAYGROUND_OIDC_REDIRECT_URI: 'https://auth-playground.yappai.de/api/oauth/callback',
};
const headers = {
  Host: 'auth-playground.yappai.de',
  'X-Forwarded-Host': 'auth-playground.yappai.de',
  'X-Forwarded-Proto': 'https',
  'X-Forwarded-Port': '443',
  'X-Forwarded-For': '192.0.2.10',
};

describe('public OAuth proxy boundary', () => {
  let app: INestApplication<Server>;
  async function create(peers = environment.PLAYGROUND_PUBLIC_PROXY_ADDRESSES) {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            registerAs('lab', () =>
              readConfiguration({ ...environment, PLAYGROUND_PUBLIC_PROXY_ADDRESSES: peers }),
            ),
          ],
        }),
        AuthorizationModule,
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalFilters(new AuthorizationErrorFilter());
    await app.init();
  }
  afterEach(async () => app?.close());

  it('returns only anonymous state and scoped secure cookies through the trusted HTTPS peer', async () => {
    await create();
    const response = await request(app.getHttpServer())
      .get('/api/oauth/session')
      .set(headers)
      .expect(200);
    expect(response.body).toMatchObject({ authenticated: false });
    const cookie: unknown = response.headers['set-cookie'];
    expect(cookie).toEqual([
      expect.stringMatching(
        /playground_context=.*; Path=\/api\/oauth;.*HttpOnly; Secure; SameSite=Lax/,
      ),
    ]);
    expect(JSON.stringify(cookie)).not.toContain('Domain=');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it.each([
    ['X-Forwarded-Proto', 'http'],
    ['X-Forwarded-Host', 'attacker.example'],
    ['X-Forwarded-Port', '80'],
    ['X-Forwarded-For', '192.0.2.10, 127.0.0.1'],
    ['Forwarded', 'for=127.0.0.1;proto=https'],
    ['Host', 'attacker.example'],
  ])('rejects invalid %s without issuing cookies', async (name, value) => {
    await create();
    const response = await request(app.getHttpServer())
      .get('/api/oauth/session')
      .set({ ...headers, [name]: value })
      .expect(403);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(value);
  });

  it('rejects direct requests and forwarded headers from an untrusted peer', async () => {
    await create('192.0.2.30');
    await request(app.getHttpServer())
      .get('/api/oauth/session')
      .set('Host', headers.Host)
      .expect(403);
    await request(app.getHttpServer()).get('/api/oauth/session').set(headers).expect(403);
  });

  it('does not create sessions for implicit HEAD or wrong methods', async () => {
    await create();
    await request(app.getHttpServer()).head('/api/oauth/session').set(headers).expect(405);
    await request(app.getHttpServer()).post('/api/oauth/session').set(headers).expect(404);
  });

  it('preserves exact Origin and context-bound CSRF validation for logout', async () => {
    await create();
    const session = await request(app.getHttpServer())
      .get('/api/oauth/session')
      .set(headers)
      .expect(200);
    const body: unknown = session.body;
    expect(body).toHaveProperty('csrfToken');
    await request(app.getHttpServer())
      .post('/api/oauth/logout')
      .set(headers)
      .set('Origin', 'https://attacker.example')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/oauth/logout')
      .set(headers)
      .set('Origin', environment.PLAYGROUND_APP_ORIGIN)
      .expect(403);
  });
});
