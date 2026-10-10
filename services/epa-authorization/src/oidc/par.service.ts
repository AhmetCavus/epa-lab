import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { configuration } from '../config/configuration';
import { AuthorizationError } from '../common/errors/authorization-error';
import type { AuthorizationTransaction } from './authorization-transaction';
import { OidcClientService, OidcUpstreamError } from './oidc-client.service';
import type { OidcMetadata } from './oidc-discovery.service';

const parResponseSchema = z.object({
  request_uri: z
    .string()
    .min(1)
    .max(2048)
    .regex(/^[A-Za-z][A-Za-z0-9+.-]*:[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/)
    .refine((uri) => {
      try {
        new URL(uri);
        return !/%(?![0-9A-Fa-f]{2})/.test(uri);
      } catch {
        return false;
      }
    }),
  expires_in: z.number().finite().positive(),
});

export type ParResponse = z.infer<typeof parResponseSchema>;

function formEncode(credential: string): string {
  return new URLSearchParams({ credential }).toString().slice('credential='.length);
}

@Injectable()
export class ParService {
  private readonly logger = new Logger(ParService.name);

  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly client: OidcClientService,
  ) {}

  async push(
    metadata: OidcMetadata,
    transaction: AuthorizationTransaction,
    redirectUri: string,
    requestId: string,
  ): Promise<ParResponse> {
    const startedAt = performance.now();
    const context = {
      operation: 'sendAuthorizationRequestFdV',
      requestId,
      issuer: this.config.issuer,
    };
    const parameters = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid',
      state: transaction.state,
      nonce: transaction.nonce,
      code_challenge: transaction.codeChallenge,
      code_challenge_method: 'S256',
    });
    const credentials = Buffer.from(
      `${formEncode(this.config.clientId)}:${formEncode(this.config.clientSecret)}`,
      'utf8',
    ).toString('base64');

    this.logger.log({ ...context, event: 'par_start' });

    try {
      const response = await this.client.requestJson(
        metadata.pushed_authorization_request_endpoint,
        201,
        {
          method: 'POST',
          headers: {
            authorization: `Basic ${credentials}`,
            'content-type': 'application/x-www-form-urlencoded',
            accept: 'application/json',
          },
          body: parameters.toString(),
        },
      );
      const parsed = parResponseSchema.safeParse(response);

      if (!parsed.success) {
        throw new OidcUpstreamError('invalid_par_response');
      }

      this.logger.log({
        ...context,
        event: 'par_complete',
        status: 201,
        durationMs: Math.round(performance.now() - startedAt),
      });
      return parsed.data;
    } catch (error) {
      this.logger.warn({
        ...context,
        event: 'par_failure',
        reason: error instanceof OidcUpstreamError ? error.reason : 'internal_error',
        status: error instanceof OidcUpstreamError ? error.upstreamStatus : undefined,
        durationMs: Math.round(performance.now() - startedAt),
      });

      if (error instanceof OidcUpstreamError && error.isAuthorizationRejection) {
        throw new AuthorizationError(
          { status: 403, code: 'invalAuth' },
          'Identity provider rejected the authorization request.',
        );
      }

      throw error;
    }
  }
}
