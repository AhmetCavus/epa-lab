import { Module } from '@nestjs/common';
import { OidcClientService } from './oidc-client.service';
import { OidcDiscoveryService } from './oidc-discovery.service';
import { ParService } from './par.service';
import { IdTokenService } from './id-token.service';
import { TokenService } from './token.service';

@Module({
  providers: [OidcClientService, OidcDiscoveryService, ParService, IdTokenService, TokenService],
  exports: [OidcDiscoveryService, ParService, TokenService],
})
export class OidcModule {}
