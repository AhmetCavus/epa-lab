import { Module } from '@nestjs/common';
import { OidcClientService } from './oidc-client.service';
import { OidcDiscoveryService } from './oidc-discovery.service';
import { ParService } from './par.service';

@Module({
  providers: [OidcClientService, OidcDiscoveryService, ParService],
  exports: [OidcDiscoveryService, ParService],
})
export class OidcModule {}
