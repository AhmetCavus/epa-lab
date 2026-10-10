import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { configuration } from '../config/configuration';
import { isSafeConfiguredUrl } from '../config/configuration.validation';
import { OidcClientService, OidcUpstreamError } from './oidc-client.service';

const discoverySchema = z.object({
  issuer: z.string(),
  authorization_endpoint: z.string().max(2048),
  pushed_authorization_request_endpoint: z.string().max(2048),
  token_endpoint_auth_methods_supported: z.array(z.string()),
  code_challenge_methods_supported: z.array(z.string()),
});

export type OidcMetadata = z.infer<typeof discoverySchema>;

@Injectable()
export class OidcDiscoveryService {
  private cachedMetadata: { metadata: OidcMetadata; expiresAt: number } | undefined;
  private pendingDiscovery: Promise<OidcMetadata> | undefined;

  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly client: OidcClientService,
  ) {}

  async discover(): Promise<OidcMetadata> {
    if (this.cachedMetadata && this.cachedMetadata.expiresAt > Date.now()) {
      return this.cachedMetadata.metadata;
    }

    if (this.pendingDiscovery) {
      return this.pendingDiscovery;
    }

    this.pendingDiscovery = this.loadMetadata();

    try {
      const metadata = await this.pendingDiscovery;
      this.cachedMetadata = {
        metadata,
        expiresAt: Date.now() + this.config.discoveryCacheTtlMs,
      };
      return metadata;
    } finally {
      this.pendingDiscovery = undefined;
    }
  }

  private async loadMetadata(): Promise<OidcMetadata> {
    const discoveryUrl = `${this.config.issuer}/.well-known/openid-configuration`;
    const parsed = discoverySchema.safeParse(await this.client.requestJson(discoveryUrl, 200));

    if (!parsed.success) {
      throw new OidcUpstreamError('invalid_discovery');
    }

    const metadata = parsed.data;
    const issuerOrigin = new URL(this.config.issuer).origin;
    const endpoints = [
      metadata.authorization_endpoint,
      metadata.pushed_authorization_request_endpoint,
    ];
    const hasSafeEndpoints = endpoints.every(
      (endpoint) =>
        isSafeConfiguredUrl(endpoint) &&
        new URL(endpoint).origin === issuerOrigin &&
        !new URL(endpoint).search,
    );

    if (
      metadata.issuer !== this.config.issuer ||
      !hasSafeEndpoints ||
      !metadata.token_endpoint_auth_methods_supported.includes('client_secret_basic') ||
      !metadata.code_challenge_methods_supported.includes('S256')
    ) {
      throw new OidcUpstreamError('invalid_discovery');
    }

    return metadata;
  }
}
