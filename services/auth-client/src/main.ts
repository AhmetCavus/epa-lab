import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import { configuration } from './config/configuration';
import { AuthorizationErrorFilter } from './common/errors/authorization-error.filter';
import { configureRequestLogging } from './common/logging/request-logging';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
    abortOnError: false,
  });
  const config = app.get<ConfigType<typeof configuration>>(configuration.KEY);
  configureRequestLogging(app);
  app.useGlobalFilters(new AuthorizationErrorFilter());
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
}

void bootstrap().catch(() => {
  console.error('Startup failed. Check environment configuration and port availability.');
  process.exitCode = 1;
});
