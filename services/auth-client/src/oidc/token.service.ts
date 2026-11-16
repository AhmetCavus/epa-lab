import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { configuration } from '../config/configuration';
import type { BoundAuthorizationTransaction } from './authorization-transaction';
import { transactionProfile } from './authorization-transaction';
import type { ClientProfileId } from '../config/client-profile';
import { validateProfileMetadata } from './oidc-discovery.service';
import type { ProfileOidcMetadata } from './oidc-discovery.service';
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

export type TokenExchangeObservation =
  'response-received' | 'validation-started' | 'validation-succeeded';

@Injectable()
export class TokenService {
  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly client: OidcClientService,
    private readonly idTokens: IdTokenService,
  ) {}

  async exchange(
    metadata: ProfileOidcMetadata,
    transaction: BoundAuthorizationTransaction,
    code: string,
    expectedProfile: ClientProfileId,
    observe?: (observation: TokenExchangeObservation) => void,
  ): Promise<VerifiedLogin> {
    const profile = transactionProfile(this.config, transaction, expectedProfile);
    const trustedMetadata = validateProfileMetadata(
      metadata,
      profile,
      this.config.allowPrivateNetworkHttp,
    );
    const response = await this.client.requestJson(trustedMetadata.token_endpoint, 200, {
      method: 'POST',
      headers: {
        authorization: createClientAuthorization(profile.clientId, profile.clientSecret),
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: transaction.profile.redirectUri,
        code_verifier: transaction.codeVerifier,
      }).toString(),
    });
    observe?.('response-received');
    observe?.('validation-started');
    const parsed = tokensSchema.safeParse(response);

    if (!parsed.success) {
      throw new OidcUpstreamError('invalid_token_response');
    }

    const tokens = parsed.data;
    const idToken = await this.idTokens.validate(
      trustedMetadata,
      tokens.id_token,
      transaction,
      tokens.access_token,
      expectedProfile,
    );
    observe?.('validation-succeeded');

    return {
      tokens,
      idToken,
      expiresAt: Math.min(idToken.expiresAt, Date.now() + tokens.expires_in * 1000),
    };
  }
}
