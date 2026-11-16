import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { sign } from 'jsonwebtoken';
import { configuration } from '../config/configuration';
import { clientProfile } from '../config/client-profile';
import type { ClientProfileId } from '../config/client-profile';
import {
  createBoundAuthorizationTransaction,
  deriveCodeChallenge,
} from './authorization-transaction';
import {
  OidcClientService,
  OidcUpstreamError,
  createClientAuthorization,
} from './oidc-client.service';
import { IdTokenService } from './id-token.service';
import { TokenService } from './token.service';
import { profileTestConfiguration, standardTestMetadata, testMetadata } from '../../test/fixtures';

const trusted = generateKeyPairSync('rsa', { modulusLength: 2048 });
const untrusted = generateKeyPairSync('rsa', { modulusLength: 2048 });
const weak = generateKeyPairSync('rsa', { modulusLength: 1024 });
const accessToken = 'fictional-profile-access-token';
const code = 'fictional-profile-code';

describe.each<ClientProfileId>(['epa-par', 'playground-standard'])(
  'profile-bound exchange and real JWT validation: %s',
  (id) => {
    const requestJson = jest.fn<Promise<unknown>, [string, number, RequestInit?]>();
    const profile = clientProfile(profileTestConfiguration, id);
    const metadata = id === 'epa-par' ? testMetadata : standardTestMetadata;
    let transaction: ReturnType<typeof createBoundAuthorizationTransaction>;
    let claimsOverride: Record<string, unknown>;
    let responseOverride: Record<string, unknown>;
    let jwtMode: 'trusted' | 'forged' | 'hmac' | 'unsigned' | 'weak';
    let jwks: unknown;
    let token: string;
    let service: TokenService;
    let logSpy: jest.SpiedFunction<Logger['log']>;
    let warnSpy: jest.SpiedFunction<Logger['warn']>;

    beforeEach(async () => {
      transaction = createBoundAuthorizationTransaction(profile);
      claimsOverride = {};
      responseOverride = {};
      jwtMode = 'trusted';
      token = '';
      jwks = {
        keys: [
          {
            ...trusted.publicKey.export({ format: 'jwk' }),
            kid: 'trusted',
            alg: 'RS256',
            use: 'sig',
          },
        ],
      };
      logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
      warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      requestJson.mockReset().mockImplementation((url) => {
        if (url === metadata.jwks_uri) {
          return Promise.resolve(jwks);
        }
        if (url !== metadata.token_endpoint) {
          throw new Error('Unexpected test endpoint');
        }
        const now = Math.floor(Date.now() / 1000);
        const payload = Object.fromEntries(
          Object.entries({
            sub: 'fictional-profile-user',
            iss: profile.issuer,
            aud: profile.clientId,
            iat: now,
            exp: now + 300,
            nonce: transaction.nonce,
            ...claimsOverride,
          }).filter(([, value]) => value !== undefined),
        );
        if (jwtMode === 'hmac') {
          token = sign(payload, 'fictional-hmac-key', { algorithm: 'HS256', keyid: 'trusted' });
        } else if (jwtMode === 'unsigned') {
          token = sign(payload, null, { algorithm: 'none', keyid: 'trusted' });
        } else {
          let key = trusted.privateKey;
          if (jwtMode === 'forged') {
            key = untrusted.privateKey;
          } else if (jwtMode === 'weak') {
            key = weak.privateKey;
          }
          token = sign(payload, key, {
            algorithm: 'RS256',
            keyid: 'trusted',
            allowInsecureKeySizes: jwtMode === 'weak',
          });
        }
        return Promise.resolve({
          access_token: accessToken,
          id_token: token,
          token_type: 'Bearer',
          expires_in: 300,
          ...responseOverride,
        });
      });
      const module = await Test.createTestingModule({
        providers: [
          TokenService,
          IdTokenService,
          { provide: configuration.KEY, useValue: profileTestConfiguration },
          { provide: OidcClientService, useValue: { requestJson } },
        ],
      }).compile();
      service = module.get(TokenService);
    });

    afterEach(() => {
      const output = JSON.stringify([logSpy.mock.calls, warnSpy.mock.calls]);
      for (const value of [
        profile.clientSecret,
        transaction.codeVerifier,
        transaction.state,
        transaction.nonce,
        code,
        accessToken,
        token,
      ]) {
        if (value) {
          expect(output.includes(value)).toBe(false);
        }
      }
      jest.restoreAllMocks();
    });

    function exchange() {
      return service.exchange(metadata, transaction, code, id);
    }

    it('uses only stored-profile credentials, callback, nonce and real signing keys', async () => {
      const result = await exchange();
      expect(result.idToken.identity.issuer).toBe(profile.issuer);
      const options = requestJson.mock.calls[0]?.[2];
      expect(
        new Headers(options?.headers).get('authorization') ===
          createClientAuthorization(profile.clientId, profile.clientSecret),
      ).toBe(true);
      const body =
        typeof options?.body === 'string' ? new URLSearchParams(options.body) : undefined;
      expect(body?.get('redirect_uri')).toBe(transaction.profile.redirectUri);
      expect(body?.get('code_verifier') === transaction.codeVerifier).toBe(true);
    });

    it('rejects cross-profile route substitution before exchange', async () => {
      const other = id === 'epa-par' ? 'playground-standard' : 'epa-par';
      await expect(service.exchange(metadata, transaction, code, other)).rejects.toMatchObject({
        status: 403,
      });
      expect(requestJson).not.toHaveBeenCalled();
    });

    it('rechecks client audience/authorized party when both profiles share cached issuer keys', async () => {
      await exchange();
      const otherId = id === 'epa-par' ? 'playground-standard' : 'epa-par';
      const otherProfile = clientProfile(profileTestConfiguration, otherId);
      const otherMetadata = otherId === 'epa-par' ? testMetadata : standardTestMetadata;
      transaction = createBoundAuthorizationTransaction(otherProfile);
      await expect(
        service.exchange(otherMetadata, transaction, code, otherId),
      ).rejects.toMatchObject({ status: 403 });
      claimsOverride = { aud: otherProfile.clientId, azp: otherProfile.clientId };
      await expect(
        service.exchange(otherMetadata, transaction, code, otherId),
      ).resolves.toMatchObject({ idToken: { identity: { issuer: otherProfile.issuer } } });
      expect(requestJson.mock.calls.filter(([url]) => url === metadata.jwks_uri).length).toBe(1);
    });

    it.each(['issuer', 'clientId', 'redirectUri'] as const)(
      'rejects altered stored %s before sending credentials',
      async (key) => {
        transaction = {
          ...transaction,
          profile: { ...transaction.profile, [key]: 'http://localhost:9999/foreign' },
        };
        await expect(exchange()).rejects.toMatchObject({ status: 403 });
        expect(requestJson).not.toHaveBeenCalled();
      },
    );

    it('rejects altered stored PKCE material before transport', async () => {
      transaction = { ...transaction, codeVerifier: 'a'.repeat(43) };
      await expect(exchange()).rejects.toMatchObject({ status: 403 });
      expect(requestJson).not.toHaveBeenCalled();
    });

    it.each(['token_endpoint', 'jwks_uri', 'authorization_endpoint'] as const)(
      'rejects substituted %s before sending any credentials',
      async (key) => {
        await expect(
          service.exchange(
            { ...metadata, [key]: 'http://attacker.example/foreign' },
            transaction,
            code,
            id,
          ),
        ).rejects.toMatchObject({ reason: 'invalid_discovery' });
        expect(requestJson).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['issuer', { iss: 'http://localhost:9090/another-issuer' }],
      ['other-profile audience', { aud: id === 'epa-par' ? 'playground-oidc' : 'epa-auth-server' }],
      ['resource audience', { aud: 'playground-fhir' }],
      ['nonce', { nonce: 'wrong-nonce' }],
      ['missing nonce', { nonce: undefined }],
      ['expiry', { exp: 1 }],
      ['missing expiry', { exp: undefined }],
      ['future issuance', { iat: Math.floor(Date.now() / 1000) + 3600 }],
      ['not yet valid', { nbf: Math.floor(Date.now() / 1000) + 3600 }],
      [
        'expiry before issuance',
        { iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) - 1 },
      ],
      ['authorized party', { azp: 'another-client' }],
      [
        'ambiguous audience without authorized party',
        { aud: [profile.clientId, 'another-client'] },
      ],
      ['access-token hash', { at_hash: 'wrong-hash' }],
    ])('rejects invalid signed ID-token %s', async (_name, override) => {
      if (typeof override === 'string') {
        throw new Error('Expected claims override');
      }
      claimsOverride = override;
      await expect(exchange()).rejects.toMatchObject({ status: 403 });
    });

    it('accepts the required authorized party and correct access-token hash', async () => {
      claimsOverride = {
        aud: [profile.clientId, 'another-client'],
        azp: profile.clientId,
        at_hash: createHash('sha256')
          .update(accessToken, 'ascii')
          .digest()
          .subarray(0, 16)
          .toString('base64url'),
      };
      await expect(exchange()).resolves.toMatchObject({
        idToken: { identity: { issuer: profile.issuer } },
      });
    });

    it.each(['forged', 'hmac', 'unsigned', 'weak'] as const)(
      'rejects %s JWT cryptography',
      async (mode) => {
        jwtMode = mode;
        if (mode === 'weak') {
          jwks = {
            keys: [
              {
                ...weak.publicKey.export({ format: 'jwk' }),
                kid: 'trusted',
                alg: 'RS256',
                use: 'sig',
              },
            ],
          };
        }
        await expect(exchange()).rejects.toMatchObject({ status: 403 });
        if (mode === 'hmac' || mode === 'unsigned') {
          expect(requestJson.mock.calls.filter(([url]) => url === metadata.jwks_uri).length).toBe(
            0,
          );
        }
      },
    );

    it.each([
      { kid: 'unknown' },
      { kty: 'EC' },
      { n: undefined },
      { use: 'enc' },
      { alg: 'RS512' },
      { key_ops: ['sign'] },
    ])('rejects untrusted or unusable signing keys (%#)', async (override) => {
      jwks = {
        keys: [
          {
            ...trusted.publicKey.export({ format: 'jwk' }),
            kid: 'trusted',
            alg: 'RS256',
            use: 'sig',
            ...override,
          },
        ],
      };
      await expect(exchange()).rejects.toMatchObject({ status: 403 });
    });

    it('rejects duplicate trusted key IDs, including on cache reuse', async () => {
      const key = {
        ...trusted.publicKey.export({ format: 'jwk' }),
        kid: 'trusted',
        alg: 'RS256',
        use: 'sig',
      };
      jwks = { keys: [key, key] };
      await expect(exchange()).rejects.toMatchObject({ status: 403 });
      await expect(exchange()).rejects.toMatchObject({ status: 403 });
    });

    it.each([
      { access_token: undefined },
      { id_token: undefined },
      { id_token: '' },
      { token_type: 'MAC' },
      { expires_in: 0 },
    ])('rejects incomplete token responses (%#)', async (override) => {
      responseOverride = override;
      await expect(exchange()).rejects.toMatchObject({ reason: 'invalid_token_response' });
    });

    it('propagates provider code/PKCE denial without a verified login', async () => {
      requestJson.mockRejectedValueOnce(new OidcUpstreamError('unexpected_status', 400));
      await expect(exchange()).rejects.toMatchObject({ upstreamStatus: 400 });
    });

    it('does not infer PKCE authorization success merely from a locally valid verifier', async () => {
      transaction = {
        ...transaction,
        codeVerifier: 'a'.repeat(43),
        codeChallenge: deriveCodeChallenge('a'.repeat(43)),
      };
      requestJson.mockRejectedValueOnce(new OidcUpstreamError('unexpected_status', 400));
      await expect(exchange()).rejects.toMatchObject({ upstreamStatus: 400 });
    });
  },
);
