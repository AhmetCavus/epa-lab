import type { ConfigType } from '@nestjs/config';
import type { configuration } from '../src/config/configuration';
import type { OidcMetadata } from '../src/oidc/oidc-discovery.service';

export const testConfiguration: ConfigType<typeof configuration> = {
  port: 3000,
  issuer: 'http://localhost:8080/realms/epa-demo',
  clientId: 'epa-auth-server',
  clientSecret: 'fictional-unit-test-secret',
  defaultRedirectUri: 'http://localhost:3000/callback',
  allowedRedirectUris: ['http://localhost:3000/callback', 'http://localhost:3000/registered'],
  httpTimeoutMs: 100,
  discoveryCacheTtlMs: 1000,
};

export const testMetadata: OidcMetadata = {
  issuer: testConfiguration.issuer,
  authorization_endpoint: `${testConfiguration.issuer}/protocol/openid-connect/auth`,
  pushed_authorization_request_endpoint: `${testConfiguration.issuer}/protocol/openid-connect/ext/par/request`,
  token_endpoint_auth_methods_supported: ['client_secret_basic'],
  code_challenge_methods_supported: ['S256'],
};

export const testEnvironment = {
  PORT: String(testConfiguration.port),
  OIDC_ISSUER: testConfiguration.issuer,
  OIDC_CLIENT_ID: testConfiguration.clientId,
  OIDC_CLIENT_SECRET: testConfiguration.clientSecret,
  OIDC_DEFAULT_REDIRECT_URI: testConfiguration.defaultRedirectUri,
  OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify(testConfiguration.allowedRedirectUris),
};
