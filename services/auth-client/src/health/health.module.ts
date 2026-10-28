import { Module } from '@nestjs/common';
import { OidcModule } from '../oidc/oidc.module';
import { HealthController } from './health.controller';

@Module({ imports: [OidcModule], controllers: [HealthController] })
export class HealthModule {}
