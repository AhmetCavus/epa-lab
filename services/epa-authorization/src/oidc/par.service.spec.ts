import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { testConfiguration, testMetadata } from '../../test/fixtures';
import { configuration } from '../config/configuration';
import { createAuthorizationTransaction } from './authorization-transaction';
import { OidcClientService, OidcUpstreamError } from './oidc-client.service';
import { ParService } from './par.service';

describe('ParService', () => {
  const requestJson = jest.fn<Promise<unknown>, [string, number, RequestInit]>();
  let service: ParService;
  let pushedRequest: { request_uri: string; expires_in: number };

  beforeEach(async () => {
    pushedRequest = { request_uri: `urn:example:${randomUUID()}`, expires_in: 60 };
    requestJson.mockReset().mockResolvedValue(pushedRequest);
    const module = await Test.createTestingModule({
      providers: [
        ParService,
        { provide: configuration.KEY, useValue: testConfiguration },
        { provide: OidcClientService, useValue: { requestJson } },
      ],
    }).compile();
    service = module.get(ParService);
  });

  afterEach(() => jest.restoreAllMocks());

  function push() {
    return service.push(
      testMetadata,
      createAuthorizationTransaction(),
      testConfiguration.defaultRedirectUri,
      randomUUID(),
    );
  }

  it('sends a real protocol payload with client_secret_basic and accepts provider expiry', async () => {
    const transaction = createAuthorizationTransaction();
    await expect(
      service.push(testMetadata, transaction, testConfiguration.defaultRedirectUri, randomUUID()),
    ).resolves.toEqual(pushedRequest);
    const call = requestJson.mock.calls[0];

    if (!call) {
      throw new Error('Expected a PAR request');
    }

    const [url, expectedStatus, options] = call;
    expect(url).toBe(testMetadata.pushed_authorization_request_endpoint);
    expect(expectedStatus).toBe(201);
    expect(options.method).toBe('POST');
    const headers = new Headers(options.headers);
    expect(headers.get('content-type')).toBe('application/x-www-form-urlencoded');
    expect(headers.get('authorization')).toBe(
      `Basic ${Buffer.from(`${testConfiguration.clientId}:${testConfiguration.clientSecret}`).toString('base64')}`,
    );
    if (typeof options.body !== 'string') {
      throw new Error('PAR body must be form encoded');
    }

    const parameters = new URLSearchParams(options.body);
    expect(Object.fromEntries(parameters)).toEqual({
      client_id: testConfiguration.clientId,
      response_type: 'code',
      redirect_uri: testConfiguration.defaultRedirectUri,
      scope: 'openid',
      state: transaction.state,
      nonce: transaction.nonce,
      code_challenge: transaction.codeChallenge,
      code_challenge_method: 'S256',
    });
    expect(parameters.has('client_secret')).toBe(false);
    expect(parameters.has('code_verifier')).toBe(false);
    expect(parameters.has('request_uri')).toBe(false);
  });

  it.each([
    null,
    {},
    { expires_in: 60 },
    { request_uri: '', expires_in: 60 },
    { request_uri: 'not-an-absolute-uri', expires_in: 60 },
    { request_uri: 'urn:unsafe:contains space', expires_in: 60 },
    { request_uri: 'urn:example:abc', expires_in: 0 },
    { request_uri: 'urn:example:abc', expires_in: -1 },
    { request_uri: 'urn:example:abc', expires_in: '60' },
    { request_uri: 'urn:example:abc', expires_in: Infinity },
    { request_uri: 'urn:example:abc', expires_in: NaN },
  ])('rejects malformed PAR responses (%#)', async (response) => {
    requestJson.mockResolvedValueOnce(response);
    await expect(push()).rejects.toMatchObject({ reason: 'invalid_par_response' });
  });

  it('propagates a finite transport timeout', async () => {
    requestJson.mockRejectedValueOnce(new OidcUpstreamError('timeout'));
    await expect(push()).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('maps provider authorization rejection to the contract error', async () => {
    requestJson.mockRejectedValueOnce(new OidcUpstreamError('unexpected_status', 400, true));
    await expect(push()).rejects.toMatchObject({
      response: { errorCode: 'invalAuth' },
      status: 403,
    });
  });

  it.each([400, 401, 403, 500, 503])(
    'keeps HTTP %s provider failures as infrastructure errors',
    async (status) => {
      requestJson.mockRejectedValueOnce(new OidcUpstreamError('unexpected_status', status));
      await expect(push()).rejects.toMatchObject({ upstreamStatus: status });
    },
  );

  it('never logs credentials, transaction secrets or the issued request_uri', async () => {
    const logs = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const warnings = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const transaction = createAuthorizationTransaction();
    await service.push(
      testMetadata,
      transaction,
      testConfiguration.defaultRedirectUri,
      randomUUID(),
    );
    requestJson.mockRejectedValueOnce(new Error(`provider leak ${testConfiguration.clientSecret}`));
    await expect(push()).rejects.toThrow();
    const output = JSON.stringify([...logs.mock.calls, ...warnings.mock.calls]);

    for (const secret of [
      testConfiguration.clientSecret,
      transaction.codeVerifier,
      transaction.state,
      transaction.nonce,
      pushedRequest.request_uri,
    ]) {
      expect(output).not.toContain(secret);
    }
  });
});
