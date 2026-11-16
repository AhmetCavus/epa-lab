import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { configuration } from '../config/configuration';
import { clientProfile } from '../config/client-profile';
import type { ClientProfile, ClientProfileId } from '../config/client-profile';
import { isSafeConfiguredUrl } from '../config/configuration.validation';
import { OidcClientService, OidcUpstreamError } from './oidc-client.service';

const discoverySchema = z.object({
  issuer: z.string(),
  authorization_endpoint: z.string().max(2048),
  token_endpoint: z.string().max(2048),
  jwks_uri: z.string().max(2048),
  id_token_signing_alg_values_supported: z.array(z.string()),
  token_endpoint_auth_methods_supported: z.array(z.string()),
  code_challenge_methods_supported: z.array(z.string()),
  response_types_supported: z.array(z.string()).optional(),
  grant_types_supported: z.array(z.string()).optional(),
});
const standardDiscoverySchema = discoverySchema.extend({
  response_types_supported: z.array(z.string()).refine((values) => values.includes('code')),
});
const parDiscoverySchema = discoverySchema.extend({
  pushed_authorization_request_endpoint: z.string().max(2048),
});

export type OidcMetadata = z.infer<typeof parDiscoverySchema>;
export type StandardOidcMetadata = z.infer<typeof standardDiscoverySchema>;
export type ProfileOidcMetadata = OidcMetadata | StandardOidcMetadata;

export function validateProfileMetadata(
  candidate: unknown,
  profile: ClientProfile,
  allowPrivateNetworkHttp: boolean,
): ProfileOidcMetadata {
  const parsed =
    profile.id === 'epa-par'
      ? parDiscoverySchema.safeParse(candidate)
      : standardDiscoverySchema.safeParse(candidate);
  if (!parsed.success) {
    throw new OidcUpstreamError('invalid_discovery');
  }
  const metadata = parsed.data;
  const endpoints = [metadata.authorization_endpoint, metadata.token_endpoint, metadata.jwks_uri];
  if ('pushed_authorization_request_endpoint' in metadata) {
    endpoints.push(metadata.pushed_authorization_request_endpoint);
  }
  const issuerOrigin = new URL(profile.issuer).origin;
  const hasSafeEndpoints = endpoints.every(
    (endpoint) =>
      isSafeConfiguredUrl(endpoint, allowPrivateNetworkHttp) &&
      new URL(endpoint).origin === issuerOrigin &&
      !new URL(endpoint).search,
  );
  if (
    metadata.issuer !== profile.issuer ||
    !hasSafeEndpoints ||
    !metadata.token_endpoint_auth_methods_supported.includes('client_secret_basic') ||
    !metadata.id_token_signing_alg_values_supported.includes('RS256') ||
    !metadata.code_challenge_methods_supported.includes('S256') ||
    (metadata.response_types_supported !== undefined &&
      !metadata.response_types_supported.includes('code')) ||
    (metadata.grant_types_supported !== undefined &&
      !metadata.grant_types_supported.includes('authorization_code'))
  ) {
    throw new OidcUpstreamError('invalid_discovery');
  }
  return metadata;
}

@Injectable()
export class OidcDiscoveryService {
  private readonly cachedMetadata = new Map<
    string,
    { metadata: ProfileOidcMetadata; expiresAt: number }
  >();
  private readonly pendingDiscovery = new Map<string, Promise<ProfileOidcMetadata>>();

  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly client: OidcClientService,
  ) {}

  discover(profileId: 'playground-standard'): Promise<StandardOidcMetadata>;
  discover(profileId?: 'epa-par'): Promise<OidcMetadata>;
  async discover(profileId: ClientProfileId = 'epa-par'): Promise<ProfileOidcMetadata> {
    const profile = clientProfile(this.config, profileId);
    const identity = JSON.stringify([profile.id, profile.issuer]);
    const cached = this.cachedMetadata.get(identity);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.metadata;
    }
    const pending = this.pendingDiscovery.get(identity);
    if (pending) {
      return pending;
    }
    const discovery = this.loadMetadata(profile);
    this.pendingDiscovery.set(identity, discovery);
    try {
      const metadata = await discovery;
      this.cachedMetadata.set(identity, {
        metadata,
        expiresAt: Date.now() + this.config.discoveryCacheTtlMs,
      });
      return metadata;
    } finally {
      this.pendingDiscovery.delete(identity);
    }
  }

  private async loadMetadata(profile: ClientProfile): Promise<ProfileOidcMetadata> {
    const discoveryUrl = `${profile.issuer}/.well-known/openid-configuration`;
    return validateProfileMetadata(
      await this.client.requestJson(discoveryUrl, 200),
      profile,
      this.config.allowPrivateNetworkHttp,
    );
  }
}
