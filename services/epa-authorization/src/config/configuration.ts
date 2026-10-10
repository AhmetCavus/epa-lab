import { registerAs } from '@nestjs/config';
import { validateEnvironment } from './configuration.validation';

export const configuration = registerAs('lab', () => {
  const environment = validateEnvironment(process.env);

  return {
    port: environment.PORT,
    issuer: environment.OIDC_ISSUER,
    clientId: environment.OIDC_CLIENT_ID,
    clientSecret: environment.OIDC_CLIENT_SECRET,
    defaultRedirectUri: environment.OIDC_DEFAULT_REDIRECT_URI,
    allowedRedirectUris: environment.OIDC_ALLOWED_REDIRECT_URIS,
    httpTimeoutMs: environment.OIDC_HTTP_TIMEOUT_MS,
    discoveryCacheTtlMs: environment.OIDC_DISCOVERY_CACHE_TTL_MS,
  };
});
