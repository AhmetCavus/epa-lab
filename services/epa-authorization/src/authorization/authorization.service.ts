import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { configuration } from '../config/configuration';
import { AuthorizationError } from '../common/errors/authorization-error';
import { createAuthorizationTransaction } from '../oidc/authorization-transaction';
import { OidcDiscoveryService } from '../oidc/oidc-discovery.service';
import { ParService } from '../oidc/par.service';
import type { AuthorizationRequest } from './authorization-request';

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly discovery: OidcDiscoveryService,
    private readonly par: ParService,
  ) {}

  async initiate(request: AuthorizationRequest): Promise<string> {
    if (request.issuer !== this.config.issuer) {
      throw new AuthorizationError(
        { status: 404, code: 'noResource' },
        'Issuer is not a configured identity provider.',
      );
    }

    const redirectUri = request.redirectUri ?? this.config.defaultRedirectUri;

    if (!this.config.allowedRedirectUris.includes(redirectUri)) {
      throw new AuthorizationError(
        { status: 403, code: 'invalRedir' },
        'Redirect URI is not registered in this demo.',
      );
    }

    this.logger.log({
      event: 'authorization_start',
      operation: 'sendAuthorizationRequestFdV',
      requestId: request.requestId,
      issuer: this.config.issuer,
    });
    const metadata = await this.discovery.discover();
    // No callback exists in M1: secrets live only for this operation, with no persistent session.
    const transaction = createAuthorizationTransaction();
    const pushedRequest = await this.par.push(
      metadata,
      transaction,
      redirectUri,
      request.requestId,
    );
    const authorizationUrl = new URL(metadata.authorization_endpoint);
    authorizationUrl.searchParams.set('client_id', this.config.clientId);
    authorizationUrl.searchParams.set('request_uri', pushedRequest.request_uri);

    return authorizationUrl.toString();
  }
}
