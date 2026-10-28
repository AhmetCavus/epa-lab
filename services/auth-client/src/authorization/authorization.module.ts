import { Module } from '@nestjs/common';
import { OidcModule } from '../oidc/oidc.module';
import { AuthorizationController } from './authorization.controller';
import { AuthorizationService } from './authorization.service';
import { BrowserLoginController } from './browser-login/browser-login.controller';
import { BrowserLoginService } from './browser-login/browser-login.service';
import { BrowserLoginStore } from './browser-login/browser-login.store';

@Module({
  imports: [OidcModule],
  controllers: [AuthorizationController, BrowserLoginController],
  providers: [AuthorizationService, BrowserLoginService, BrowserLoginStore],
})
export class AuthorizationModule {}
