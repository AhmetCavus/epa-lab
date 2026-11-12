import { registerAs } from '@nestjs/config';
import { validateEnvironment } from './configuration.validation';

export function readConfiguration(values: Record<string, unknown>) {
  const environment = validateEnvironment(values);

  return {
    port: environment.PORT,
    host: environment.HOST,
    allowPrivateNetworkHttp: environment.OIDC_ALLOW_PRIVATE_NETWORK_HTTP,
    issuer: environment.OIDC_ISSUER,
    clientId: environment.OIDC_CLIENT_ID,
    clientSecret: environment.OIDC_CLIENT_SECRET,
    defaultRedirectUri: environment.OIDC_DEFAULT_REDIRECT_URI,
    allowedRedirectUris: environment.OIDC_ALLOWED_REDIRECT_URIS,
    httpTimeoutMs: environment.OIDC_HTTP_TIMEOUT_MS,
    discoveryCacheTtlMs: environment.OIDC_DISCOVERY_CACHE_TTL_MS,
    standardProfile: environment.standardProfile,
  };
}

export const configuration = registerAs('lab', () => readConfiguration(process.env));
