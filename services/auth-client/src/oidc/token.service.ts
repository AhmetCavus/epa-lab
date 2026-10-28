import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { configuration } from '../config/configuration';
import type { AuthorizationTransaction } from './authorization-transaction';
import type { OidcMetadata } from './oidc-discovery.service';
import {
  createClientAuthorization,
  OidcClientService,
  OidcUpstreamError,
} from './oidc-client.service';
import { IdTokenService } from './id-token.service';
import type { VerifiedIdToken } from './id-token.service';

const tokensSchema = z.object({
  access_token: z.string().min(1).max(32768),
  id_token: z.string().min(1).max(32768),
  token_type: z.string().regex(/^Bearer$/i),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).max(32768).optional(),
});

export interface VerifiedLogin {
  idToken: VerifiedIdToken;
  tokens: z.infer<typeof tokensSchema>;
  expiresAt: number;
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly client: OidcClientService,
    private readonly idTokens: IdTokenService,
  ) {}

  async exchange(
    metadata: OidcMetadata,
    transaction: AuthorizationTransaction,
    code: string,
    redirectUri: string,
  ): Promise<VerifiedLogin> {
    const parsed = tokensSchema.safeParse(
      await this.client.requestJson(metadata.token_endpoint, 200, {
        method: 'POST',
        headers: {
          authorization: createClientAuthorization(this.config.clientId, this.config.clientSecret),
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: transaction.codeVerifier,
        }).toString(),
      }),
    );

    if (!parsed.success) {
      throw new OidcUpstreamError('invalid_token_response');
    }

    const tokens = parsed.data;
    const idToken = await this.idTokens.validate(
      metadata,
      tokens.id_token,
      transaction.nonce,
      tokens.access_token,
    );

    return {
      tokens,
      idToken,
      expiresAt: Math.min(idToken.expiresAt, Date.now() + tokens.expires_in * 1000),
    };
  }
}
