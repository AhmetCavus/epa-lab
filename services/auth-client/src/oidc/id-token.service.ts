import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHash, createPublicKey, timingSafeEqual } from 'node:crypto';
import { decode, verify } from 'jsonwebtoken';
import { z } from 'zod';
import { configuration } from '../config/configuration';
import { AuthorizationError } from '../common/errors/authorization-error';
import { OidcClientService, OidcUpstreamError } from './oidc-client.service';
import type { OidcMetadata } from './oidc-discovery.service';

const headerSchema = z.object({ alg: z.literal('RS256'), kid: z.string().min(1).max(200) });
const keySchema = z.object({
  kid: z.string(),
  kty: z.string(),
  use: z.string().optional(),
  alg: z.string().optional(),
  key_ops: z.array(z.string()).optional(),
  n: z.string().optional(),
  e: z.string().optional(),
});
const jwksSchema = z.object({ keys: z.array(keySchema).min(1).max(100) });
const claimsSchema = z.object({
  iss: z.string(),
  sub: z.string().min(1).max(255),
  aud: z.union([z.string(), z.array(z.string()).min(1)]),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  nonce: z.string(),
  azp: z.string().optional(),
  at_hash: z.string().optional(),
  preferred_username: z.string().max(255).optional(),
  name: z.string().max(255).optional(),
});

export interface AuthenticatedIdentity {
  subject: string;
  issuer: string;
  username?: string;
  name?: string;
}

export interface VerifiedIdToken {
  identity: AuthenticatedIdentity;
  expiresAt: number;
}

function rejectIdToken(): never {
  throw new AuthorizationError({ status: 403, code: 'invalAuth' }, 'ID token validation failed.');
}

function equalSecret(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);

  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

@Injectable()
export class IdTokenService {
  private cachedKeys:
    { uri: string; keys: z.infer<typeof keySchema>[]; expiresAt: number } | undefined;

  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly client: OidcClientService,
  ) {}

  async validate(
    metadata: OidcMetadata,
    token: string,
    expectedNonce: string,
    accessToken: string,
  ): Promise<VerifiedIdToken> {
    let header: z.infer<typeof headerSchema>;

    try {
      header = headerSchema.parse(decode(token, { complete: true })?.header);
    } catch {
      return rejectIdToken();
    }

    const key = await this.signingKey(metadata.jwks_uri, header.kid);
    let claims: z.infer<typeof claimsSchema>;

    try {
      const publicKey = createPublicKey({ key, format: 'jwk' });

      if ((publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
        return rejectIdToken();
      }

      const payload: unknown = verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.config.issuer,
        audience: this.config.clientId,
        clockTolerance: 30,
      });
      claims = claimsSchema.parse(payload);
    } catch {
      return rejectIdToken();
    }

    const now = Math.floor(Date.now() / 1000);
    const requiresAuthorizedParty = Array.isArray(claims.aud) && claims.aud.length > 1;

    if (
      !equalSecret(claims.nonce, expectedNonce) ||
      claims.iat > now + 30 ||
      claims.exp <= now ||
      claims.exp <= claims.iat ||
      (requiresAuthorizedParty && claims.azp !== this.config.clientId) ||
      (claims.azp !== undefined && claims.azp !== this.config.clientId)
    ) {
      return rejectIdToken();
    }

    if (claims.at_hash !== undefined) {
      const expectedHash = createHash('sha256')
        .update(accessToken, 'ascii')
        .digest()
        .subarray(0, 16)
        .toString('base64url');

      if (!equalSecret(claims.at_hash, expectedHash)) {
        return rejectIdToken();
      }
    }

    return {
      identity: {
        subject: claims.sub,
        issuer: claims.iss,
        ...(claims.preferred_username === undefined ? {} : { username: claims.preferred_username }),
        ...(claims.name === undefined ? {} : { name: claims.name }),
      },
      expiresAt: claims.exp * 1000,
    };
  }

  private async signingKey(uri: string, kid: string) {
    const cacheIsValid = this.cachedKeys?.uri === uri && this.cachedKeys.expiresAt > Date.now();
    const cachedKey = cacheIsValid
      ? this.cachedKeys?.keys.find((key) => key.kid === kid)
      : undefined;

    if (cachedKey) {
      return this.validSigningKey(this.cachedKeys?.keys ?? [], kid);
    }

    // A new kid can indicate provider key rotation; refresh once using the validated JWKS URI.
    const parsed = jwksSchema.safeParse(await this.client.requestJson(uri, 200));

    if (!parsed.success) {
      throw new OidcUpstreamError('invalid_jwks');
    }

    this.cachedKeys = {
      uri,
      keys: parsed.data.keys,
      expiresAt: Date.now() + this.config.discoveryCacheTtlMs,
    };

    return this.validSigningKey(parsed.data.keys, kid);
  }

  private validSigningKey(keys: z.infer<typeof keySchema>[], kid: string) {
    const matches = keys.filter((key) => key.kid === kid);
    const key = matches[0];

    if (
      matches.length !== 1 ||
      !key ||
      key.kty !== 'RSA' ||
      !key.n ||
      !key.e ||
      (key.use !== undefined && key.use !== 'sig') ||
      (key.alg !== undefined && key.alg !== 'RS256') ||
      (key.key_ops !== undefined && !key.key_ops.includes('verify'))
    ) {
      return rejectIdToken();
    }

    return { kty: 'RSA', n: key.n, e: key.e };
  }
}
