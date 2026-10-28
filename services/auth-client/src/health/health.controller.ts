import { Controller, Get } from '@nestjs/common';
import { OidcDiscoveryService } from '../oidc/oidc-discovery.service';

@Controller('health')
export class HealthController {
  constructor(private readonly discovery: OidcDiscoveryService) {}

  @Get('live')
  live() {
    return { status: 'up' };
  }

  @Get('ready')
  async ready() {
    await this.discovery.discover();
    return { status: 'up', oidcDiscovery: 'available' };
  }
}
