import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { configuration } from '../config/configuration';

export type OidcFailureReason =
  | 'network_error'
  | 'timeout'
  | 'unexpected_status'
  | 'invalid_content_type'
  | 'invalid_json'
  | 'response_too_large'
  | 'invalid_discovery'
  | 'invalid_par_response';

export class OidcUpstreamError extends Error {
  constructor(
    readonly reason: OidcFailureReason,
    readonly upstreamStatus?: number,
    readonly isAuthorizationRejection = false,
  ) {
    super(`OIDC provider failure: ${reason}`);
  }
}

const maximumResponseBytes = 65536;

@Injectable()
export class OidcClientService {
  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
  ) {}

  async requestJson(
    url: string,
    expectedStatus: number,
    options: RequestInit = {},
  ): Promise<unknown> {
    const signal = AbortSignal.timeout(this.config.httpTimeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        redirect: 'error',
        signal,
      });

      const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();

      if (response.status !== expectedStatus) {
        let isAuthorizationRejection = false;

        if (
          expectedStatus === 201 &&
          (response.status === 400 || response.status === 403) &&
          mediaType === 'application/json'
        ) {
          try {
            const rejection = await this.readJson(response);
            isAuthorizationRejection =
              typeof rejection === 'object' &&
              rejection !== null &&
              'error' in rejection &&
              (rejection.error === 'invalid_request' ||
                rejection.error === 'invalid_scope' ||
                rejection.error === 'invalid_redirect_uri' ||
                rejection.error === 'access_denied');
          } catch {
            // Unknown provider errors remain infrastructure failures, without disclosing bodies.
          }
        } else {
          await response.body?.cancel();
        }

        throw new OidcUpstreamError('unexpected_status', response.status, isAuthorizationRejection);
      }

      if (mediaType !== 'application/json') {
        await response.body?.cancel();
        throw new OidcUpstreamError('invalid_content_type');
      }

      return await this.readJson(response);
    } catch (error) {
      if (error instanceof OidcUpstreamError) {
        throw error;
      }

      throw new OidcUpstreamError(signal.aborted ? 'timeout' : 'network_error');
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    if (reader) {
      while (true) {
        const chunk = await reader.read();

        if (chunk.done) {
          break;
        }

        receivedBytes += chunk.value.byteLength;

        if (receivedBytes > maximumResponseBytes) {
          await reader.cancel();
          throw new OidcUpstreamError('response_too_large');
        }

        chunks.push(chunk.value);
      }
    }

    try {
      const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      return parsed;
    } catch {
      throw new OidcUpstreamError('invalid_json');
    }
  }
}
