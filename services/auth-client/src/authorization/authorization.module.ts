import { Module } from '@nestjs/common';
import { OidcModule } from '../oidc/oidc.module';
import { AuthorizationController } from './authorization.controller';
import { AuthorizationService } from './authorization.service';
import { BrowserLoginController } from './browser-login/browser-login.controller';
import { BrowserLoginService } from './browser-login/browser-login.service';
import { BrowserLoginStore } from './browser-login/browser-login.store';
import { StandardBrowserController } from './standard-login/standard-browser.controller';
import { StandardBrowserService } from './standard-login/standard-browser.service';

@Module({
  imports: [OidcModule],
  controllers: [AuthorizationController, BrowserLoginController, StandardBrowserController],
  providers: [AuthorizationService, BrowserLoginService, BrowserLoginStore, StandardBrowserService],
})
export class AuthorizationModule {}
