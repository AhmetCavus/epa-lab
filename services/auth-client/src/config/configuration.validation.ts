import { z } from 'zod';
import { isIP } from 'node:net';
import type { StandardClientProfile } from './client-profile';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

function isPrivateIpv4Address(hostname: string): boolean {
  if (isIP(hostname) !== 4) {
    return false;
  }

  const [firstOctet, secondOctet] = hostname.split('.').map(Number);

  return (
    firstOctet === 10 ||
    (firstOctet === 172 && secondOctet !== undefined && secondOctet >= 16 && secondOctet <= 31) ||
    (firstOctet === 192 && secondOctet === 168)
  );
}

export function isSafeConfiguredUrl(candidate: string, allowPrivateNetworkHttp = false): boolean {
  try {
    const url = new URL(candidate);
    const isAllowedHttpHost =
      loopbackHosts.has(url.hostname) ||
      (allowPrivateNetworkHttp && isPrivateIpv4Address(url.hostname));
    const hasAllowedTransport =
      url.protocol === 'https:' || (url.protocol === 'http:' && isAllowedHttpHost);

    return (
      hasAllowedTransport &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !candidate.includes('*') &&
      !/\s/.test(candidate)
    );
  } catch {
    return false;
  }
}

const configuredUrl = z
  .string()
  .min(1)
  .max(2048)
  .refine((candidate) => isSafeConfiguredUrl(candidate, true));

const environmentSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    HOST: z
      .string()
      .default('127.0.0.1')
      .refine((host) => isIP(host) !== 0 || host === 'localhost'),
    OIDC_ALLOW_PRIVATE_NETWORK_HTTP: z
      .enum(['true', 'false'])
      .default('false')
      .transform((flag) => flag === 'true'),
    OIDC_ISSUER: configuredUrl.refine(
      (issuer) =>
        isSafeConfiguredUrl(issuer, true) && !new URL(issuer).search && !issuer.endsWith('/'),
    ),
    OIDC_CLIENT_ID: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[A-Za-z0-9._-]+$/),
    OIDC_CLIENT_SECRET: z.string().min(16).max(1024),
    OIDC_DEFAULT_REDIRECT_URI: configuredUrl,
    OIDC_ALLOWED_REDIRECT_URIS: z.preprocess((input: unknown) => {
      if (typeof input !== 'string') {
        return input;
      }

      try {
        const parsed: unknown = JSON.parse(input);
        return parsed;
      } catch {
        return undefined;
      }
    }, z.array(configuredUrl).min(1).max(20)),
    OIDC_HTTP_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(5000),
    OIDC_DISCOVERY_CACHE_TTL_MS: z.coerce.number().int().min(1000).max(3600000).default(300000),
    PLAYGROUND_OIDC_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((flag) => flag === 'true'),
  })
  .refine(
    (environment) =>
      environment.OIDC_ALLOWED_REDIRECT_URIS.includes(environment.OIDC_DEFAULT_REDIRECT_URI),
    { path: ['OIDC_DEFAULT_REDIRECT_URI'] },
  )
  .superRefine((environment, context) => {
    const configuredUrls = [
      { key: 'OIDC_ISSUER', urls: [environment.OIDC_ISSUER] },
      { key: 'OIDC_DEFAULT_REDIRECT_URI', urls: [environment.OIDC_DEFAULT_REDIRECT_URI] },
      { key: 'OIDC_ALLOWED_REDIRECT_URIS', urls: environment.OIDC_ALLOWED_REDIRECT_URIS },
    ];

    for (const { key, urls } of configuredUrls) {
      if (
        !urls.every((url) => isSafeConfiguredUrl(url, environment.OIDC_ALLOW_PRIVATE_NETWORK_HTTP))
      ) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'HTTP transport is not enabled.',
        });
      }
    }
  });

const standardEnvironmentSchema = z.object({
  PLAYGROUND_OIDC_CLIENT_ID: z.literal('playground-oidc'),
  PLAYGROUND_OIDC_CLIENT_SECRET: z.string().min(32).max(1024),
  PLAYGROUND_OIDC_REDIRECT_URI: configuredUrl,
  PLAYGROUND_APP_ORIGIN: configuredUrl.refine(
    (value) => isSafeConfiguredUrl(value, true) && value === new URL(value).origin,
  ),
});

function invalidConfiguration(fields: string[]): never {
  throw new Error(`Invalid environment configuration: ${[...new Set(fields)].join(', ')}`);
}

export function validateEnvironment(environment: Record<string, unknown>) {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    // Validation messages must never include the rejected configuration values.
    return invalidConfiguration(fields);
  }

  const base = result.data;

  if (!base.PLAYGROUND_OIDC_ENABLED) {
    return { ...base, standardProfile: undefined };
  }

  const standard = standardEnvironmentSchema.safeParse(environment);
  if (!standard.success) {
    return invalidConfiguration(standard.error.issues.map((issue) => issue.path.join('.')));
  }

  const settings = standard.data;
  const invalidFields: string[] = [];
  if (settings.PLAYGROUND_OIDC_CLIENT_ID === base.OIDC_CLIENT_ID) {
    invalidFields.push('PLAYGROUND_OIDC_CLIENT_ID');
  }
  if (settings.PLAYGROUND_OIDC_CLIENT_SECRET === base.OIDC_CLIENT_SECRET) {
    invalidFields.push('PLAYGROUND_OIDC_CLIENT_SECRET');
  }
  if (
    settings.PLAYGROUND_OIDC_REDIRECT_URI !==
      `${settings.PLAYGROUND_APP_ORIGIN}/api/oauth/callback` ||
    base.OIDC_ALLOWED_REDIRECT_URIS.includes(settings.PLAYGROUND_OIDC_REDIRECT_URI)
  ) {
    invalidFields.push('PLAYGROUND_OIDC_REDIRECT_URI');
  }
  for (const key of ['PLAYGROUND_OIDC_REDIRECT_URI', 'PLAYGROUND_APP_ORIGIN'] as const) {
    if (!isSafeConfiguredUrl(settings[key], base.OIDC_ALLOW_PRIVATE_NETWORK_HTTP)) {
      invalidFields.push(key);
    }
  }
  if (invalidFields.length > 0) {
    return invalidConfiguration(invalidFields);
  }

  const standardProfile: StandardClientProfile = Object.freeze({
    id: 'playground-standard',
    authorizationMode: 'direct',
    issuer: base.OIDC_ISSUER,
    clientId: settings.PLAYGROUND_OIDC_CLIENT_ID,
    clientSecret: settings.PLAYGROUND_OIDC_CLIENT_SECRET,
    defaultRedirectUri: settings.PLAYGROUND_OIDC_REDIRECT_URI,
    allowedRedirectUris: Object.freeze([settings.PLAYGROUND_OIDC_REDIRECT_URI]),
    scope: 'openid demo.fhir.read',
    applicationOrigin: settings.PLAYGROUND_APP_ORIGIN,
  });
  return { ...base, ...settings, standardProfile };
}
