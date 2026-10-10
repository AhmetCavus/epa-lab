import { z } from 'zod';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isSafeConfiguredUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    const hasAllowedTransport =
      url.protocol === 'https:' || (url.protocol === 'http:' && loopbackHosts.has(url.hostname));

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

const configuredUrl = z.string().min(1).max(2048).refine(isSafeConfiguredUrl);

const environmentSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    OIDC_ISSUER: configuredUrl.refine(
      (issuer) => isSafeConfiguredUrl(issuer) && !new URL(issuer).search && !issuer.endsWith('/'),
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
  })
  .refine(
    (environment) =>
      environment.OIDC_ALLOWED_REDIRECT_URIS.includes(environment.OIDC_DEFAULT_REDIRECT_URI),
    { path: ['OIDC_DEFAULT_REDIRECT_URI'] },
  );

export function validateEnvironment(environment: Record<string, unknown>) {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    // Validation messages must never include the rejected configuration values.
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }

  return result.data;
}
