import type { ConfigType } from '@nestjs/config';
import type { configuration } from '../src/config/configuration';
import type { OidcMetadata } from '../src/oidc/oidc-discovery.service';
import type { StandardOidcMetadata } from '../src/oidc/oidc-discovery.service';
import { readConfiguration } from '../src/config/configuration';

export const testConfiguration: ConfigType<typeof configuration> = {
  port: 3000,
  host: '127.0.0.1',
  allowPrivateNetworkHttp: false,
  issuer: 'http://localhost:8080/realms/epa-demo',
  clientId: 'epa-auth-server',
  clientSecret: 'fictional-unit-test-secret',
  defaultRedirectUri: 'http://localhost:3000/callback',
  allowedRedirectUris: ['http://localhost:3000/callback', 'http://localhost:3000/registered'],
  httpTimeoutMs: 100,
  discoveryCacheTtlMs: 1000,
  standardProfile: undefined,
};

export const testMetadata: OidcMetadata = {
  issuer: testConfiguration.issuer,
  authorization_endpoint: `${testConfiguration.issuer}/protocol/openid-connect/auth`,
  pushed_authorization_request_endpoint: `${testConfiguration.issuer}/protocol/openid-connect/ext/par/request`,
  token_endpoint: `${testConfiguration.issuer}/protocol/openid-connect/token`,
  jwks_uri: `${testConfiguration.issuer}/protocol/openid-connect/certs`,
  id_token_signing_alg_values_supported: ['RS256'],
  token_endpoint_auth_methods_supported: ['client_secret_basic'],
  code_challenge_methods_supported: ['S256'],
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code'],
};

export const testEnvironment = {
  PORT: String(testConfiguration.port),
  OIDC_ISSUER: testConfiguration.issuer,
  OIDC_CLIENT_ID: testConfiguration.clientId,
  OIDC_CLIENT_SECRET: testConfiguration.clientSecret,
  OIDC_DEFAULT_REDIRECT_URI: testConfiguration.defaultRedirectUri,
  OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify(testConfiguration.allowedRedirectUris),
};

export const standardTestEnvironment = {
  ...testEnvironment,
  PLAYGROUND_OIDC_ENABLED: 'true',
  PLAYGROUND_OIDC_CLIENT_ID: 'playground-oidc',
  PLAYGROUND_OIDC_CLIENT_SECRET: 'fictional-standard-client-secret-separate',
  PLAYGROUND_OIDC_REDIRECT_URI: 'http://localhost:3000/api/oauth/callback',
  PLAYGROUND_APP_ORIGIN: 'http://localhost:3000',
  PLAYGROUND_FHIR_RESOURCE_URL: 'http://127.0.0.1:18083/fhir/Basic/playground-demo',
};

export const profileTestConfiguration = {
  ...testConfiguration,
  standardProfile: readConfiguration(standardTestEnvironment).standardProfile,
};

export const syntheticFhirResponse = {
  resourceType: 'Basic',
  id: 'playground-demo',
  meta: {
    versionId: '1',
    lastUpdated: '2026-11-12T12:00:00.000Z',
    source: '#fictional-resource-metadata',
  },
  code: {
    coding: [
      {
        system: 'https://example.invalid/playground/demo',
        code: 'oauth-learning-demo',
        display: 'Fictional protocol learning resource',
      },
    ],
    text: 'Synthetic non-clinical OAuth demonstration; no patient data',
  },
};

export const standardTestMetadata: StandardOidcMetadata = {
  issuer: testMetadata.issuer,
  authorization_endpoint: testMetadata.authorization_endpoint,
  token_endpoint: testMetadata.token_endpoint,
  jwks_uri: testMetadata.jwks_uri,
  id_token_signing_alg_values_supported: ['RS256'],
  token_endpoint_auth_methods_supported: ['client_secret_basic'],
  code_challenge_methods_supported: ['S256'],
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code'],
};
