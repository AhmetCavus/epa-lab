import { Test } from '@nestjs/testing';
import { configuration } from '../config/configuration';
import {
  testConfiguration,
  testMetadata,
  profileTestConfiguration,
  standardTestMetadata,
} from '../../test/fixtures';
import { OidcClientService, OidcUpstreamError } from './oidc-client.service';
import { OidcDiscoveryService } from './oidc-discovery.service';

describe('OidcDiscoveryService', () => {
  const requestJson = jest.fn<Promise<unknown>, [string, number]>();
  let service: OidcDiscoveryService;

  async function createService(config: typeof testConfiguration): Promise<OidcDiscoveryService> {
    const module = await Test.createTestingModule({
      providers: [
        OidcDiscoveryService,
        { provide: configuration.KEY, useValue: config },
        { provide: OidcClientService, useValue: { requestJson } },
      ],
    }).compile();
    return module.get(OidcDiscoveryService);
  }

  beforeEach(async () => {
    requestJson.mockReset().mockResolvedValue(testMetadata);
    service = await createService(testConfiguration);
  });

  afterEach(() => jest.restoreAllMocks());

  it('accepts standard metadata without PAR and never shares that acceptance with ePA', async () => {
    const profiles = await createService(profileTestConfiguration);
    requestJson
      .mockResolvedValueOnce(standardTestMetadata)
      .mockResolvedValueOnce(standardTestMetadata);
    await expect(profiles.discover('playground-standard')).resolves.toEqual(standardTestMetadata);
    await expect(profiles.discover()).rejects.toMatchObject({ reason: 'invalid_discovery' });
    await expect(profiles.discover()).resolves.toEqual(testMetadata);
    await profiles.discover('playground-standard');
    expect(requestJson).toHaveBeenCalledTimes(3);
  });

  it('does not use or retain an irrelevant PAR endpoint for standard authorization', async () => {
    const profiles = await createService(profileTestConfiguration);
    requestJson.mockResolvedValue({
      ...standardTestMetadata,
      pushed_authorization_request_endpoint: 'http://attacker.example/par',
    });
    expect(await profiles.discover('playground-standard')).not.toHaveProperty(
      'pushed_authorization_request_endpoint',
    );
    await expect(profiles.discover()).rejects.toMatchObject({ reason: 'invalid_discovery' });
  });

  it('keeps concurrent requests and expiry caches scoped to profile and issuer', async () => {
    const profiles = await createService(profileTestConfiguration);
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    await Promise.all([
      profiles.discover(),
      profiles.discover(),
      profiles.discover('playground-standard'),
      profiles.discover('playground-standard'),
    ]);
    expect(requestJson).toHaveBeenCalledTimes(2);
    clock.mockReturnValue(now + testConfiguration.discoveryCacheTtlMs);
    await profiles.discover('playground-standard');
    expect(requestJson).toHaveBeenCalledTimes(3);
  });

  it('uses distinct configured issuers for cache identity and endpoint trust', async () => {
    const profile = profileTestConfiguration.standardProfile;
    if (!profile) {
      throw new Error('Expected enabled test profile');
    }
    const issuer = 'http://localhost:9090/realms/standard';
    const profiles = await createService({
      ...profileTestConfiguration,
      standardProfile: { ...profile, issuer },
    });
    const metadata = {
      ...standardTestMetadata,
      issuer,
      authorization_endpoint: `${issuer}/auth`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/jwks`,
    };
    requestJson.mockResolvedValueOnce(metadata).mockResolvedValueOnce(testMetadata);
    await expect(profiles.discover('playground-standard')).resolves.toEqual(metadata);
    await expect(profiles.discover()).resolves.toEqual(testMetadata);
    expect(requestJson.mock.calls.map(([url]) => url)).toEqual([
      `${issuer}/.well-known/openid-configuration`,
      `${testConfiguration.issuer}/.well-known/openid-configuration`,
    ]);
  });

  it('rejects disabled standard use before transport', async () => {
    await expect(service.discover('playground-standard')).rejects.toMatchObject({ status: 403 });
    expect(requestJson).not.toHaveBeenCalled();
  });

  it.each([
    { issuer: 'http://localhost:9090/wrong' },
    { response_types_supported: ['token'] },
    { response_types_supported: undefined },
    { grant_types_supported: ['client_credentials'] },
    { token_endpoint: 'http://attacker.example/token' },
    { authorization_endpoint: 'http://localhost:8080/auth?injected=1' },
    { jwks_uri: 'http://user:password@localhost:8080/jwks' },
    { jwks_uri: 'http://169.254.169.254/jwks' },
    { jwks_uri: 'http://localhost:9090/jwks' },
    { jwks_uri: 'http://localhost:8080/jwks#fragment' },
    { code_challenge_methods_supported: ['plain'] },
    { token_endpoint_auth_methods_supported: ['none'] },
    { id_token_signing_alg_values_supported: ['none'] },
  ])('rejects invalid standard discovery and permits a later safe retry (%#)', async (override) => {
    const profiles = await createService(profileTestConfiguration);
    requestJson
      .mockResolvedValueOnce({ ...standardTestMetadata, ...override })
      .mockResolvedValueOnce(standardTestMetadata);
    await expect(profiles.discover('playground-standard')).rejects.toMatchObject({
      reason: 'invalid_discovery',
    });
    await expect(profiles.discover('playground-standard')).resolves.toEqual(standardTestMetadata);
    expect(requestJson).toHaveBeenCalledTimes(2);
  });

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
    { ...testMetadata, token_endpoint: 'http://attacker.example/token' },
    { ...testMetadata, jwks_uri: 'http://localhost:9090/certs' },
    { ...testMetadata, id_token_signing_alg_values_supported: ['none'] },
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

  it('validates private-network discovery endpoints when LAN development is enabled', async () => {
    const issuer = 'http://192.168.178.131:5555/realms/epa-demo';
    const metadata = {
      ...testMetadata,
      issuer,
      token_endpoint: `${issuer}/protocol/openid-connect/token`,
      jwks_uri: `${issuer}/protocol/openid-connect/certs`,
      authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
      pushed_authorization_request_endpoint: `${issuer}/protocol/openid-connect/ext/par/request`,
    };
    requestJson.mockResolvedValue(metadata);
    const disabled = await createService({ ...testConfiguration, issuer });
    await expect(disabled.discover()).rejects.toMatchObject({ reason: 'invalid_discovery' });
    const enabled = await createService({
      ...testConfiguration,
      issuer,
      allowPrivateNetworkHttp: true,
    });
    await expect(enabled.discover()).resolves.toEqual(metadata);

    requestJson.mockResolvedValue({
      ...metadata,
      pushed_authorization_request_endpoint: 'http://169.254.169.254/par',
    });
    const unsafe = await createService({
      ...testConfiguration,
      issuer,
      allowPrivateNetworkHttp: true,
    });
    await expect(unsafe.discover()).rejects.toMatchObject({ reason: 'invalid_discovery' });
  });
});
