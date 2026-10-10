import { Test } from '@nestjs/testing';
import { configuration } from '../config/configuration';
import { testConfiguration, testMetadata } from '../../test/fixtures';
import { OidcClientService, OidcUpstreamError } from './oidc-client.service';
import { OidcDiscoveryService } from './oidc-discovery.service';

describe('OidcDiscoveryService', () => {
  const requestJson = jest.fn<Promise<unknown>, [string, number]>();
  let service: OidcDiscoveryService;

  beforeEach(async () => {
    requestJson.mockReset().mockResolvedValue(testMetadata);
    const module = await Test.createTestingModule({
      providers: [
        OidcDiscoveryService,
        { provide: configuration.KEY, useValue: testConfiguration },
        { provide: OidcClientService, useValue: { requestJson } },
      ],
    }).compile();
    service = module.get(OidcDiscoveryService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses only configured discovery and caches validated metadata', async () => {
    await expect(service.discover()).resolves.toEqual(testMetadata);
    await service.discover();
    expect(requestJson).toHaveBeenCalledTimes(1);
    expect(requestJson).toHaveBeenCalledWith(
      `${testConfiguration.issuer}/.well-known/openid-configuration`,
      200,
    );
  });

  it('shares concurrent discovery requests', async () => {
    await Promise.all([service.discover(), service.discover()]);
    expect(requestJson).toHaveBeenCalledTimes(1);
  });

  it('refreshes expired cache entries', async () => {
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    await service.discover();
    clock.mockReturnValue(now + testConfiguration.discoveryCacheTtlMs);
    await service.discover();
    expect(requestJson).toHaveBeenCalledTimes(2);
  });

  it.each([
    { ...testMetadata, issuer: 'http://unknown.example' },
    { ...testMetadata, pushed_authorization_request_endpoint: undefined },
    { ...testMetadata, authorization_endpoint: 'http://169.254.169.254/metadata' },
    { ...testMetadata, pushed_authorization_request_endpoint: 'http://localhost:9090/par' },
    { ...testMetadata, authorization_endpoint: 'http://user:password@localhost:8080/auth' },
    { ...testMetadata, authorization_endpoint: 'http://localhost:8080/auth#fragment' },
    { ...testMetadata, authorization_endpoint: 'http://localhost:8080/auth?injected=true' },
    { ...testMetadata, token_endpoint_auth_methods_supported: ['client_secret_post'] },
    { ...testMetadata, code_challenge_methods_supported: ['plain'] },
    null,
  ])('rejects invalid metadata without caching it (%#)', async (metadata) => {
    requestJson.mockResolvedValueOnce(metadata);
    await expect(service.discover()).rejects.toMatchObject({ reason: 'invalid_discovery' });
    await expect(service.discover()).resolves.toEqual(testMetadata);
  });

  it('propagates discovery failure and permits a later retry', async () => {
    requestJson.mockRejectedValueOnce(new OidcUpstreamError('network_error'));
    await expect(service.discover()).rejects.toMatchObject({ reason: 'network_error' });
    await expect(service.discover()).resolves.toEqual(testMetadata);
  });
});
