import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { AuthorizationModule } from './authorization/authorization.module';
import { configuration } from './config/configuration';
import { validateEnvironment } from './config/configuration.validation';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../../.env'),
      validate: (environment: Record<string, unknown>) => {
        const validated = validateEnvironment(environment);

        // ConfigModule exports only scalar values to process.env for registerAs factories.
        return {
          ...validated,
          OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify(validated.OIDC_ALLOWED_REDIRECT_URIS),
        };
      },
      load: [configuration],
    }),
    AuthorizationModule,
    HealthModule,
  ],
})
export class AppModule {}
