import { Controller, Get, Inject, NotFoundException, Post, Req, Res } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { configuration } from '../../config/configuration';
import { AuthorizationError } from '../../common/errors/authorization-error';
import { readOpaqueCookie } from '../browser-login/opaque-cookie';
import { StandardBrowserService } from './standard-browser.service';
import type { StandardContext } from './standard-browser-state';

export const standardContextCookie = 'playground_context';
export const standardBindingCookie = 'playground_login';
export const standardCsrfHeader = 'x-playground-csrf';
export const standardWorkspaceReturn = '/missions/oauth-oidc/workspace';

@Controller('api/oauth')
export class StandardBrowserController {
  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly browser: StandardBrowserService,
  ) {}

  @Get('login')
  async login(@Req() request: Request, @Res() response: Response): Promise<void> {
    this.requireHost(request, response);
    this.noQuery(request);
    const started = await this.browser.start(readOpaqueCookie(request, standardContextCookie));
    this.contextCookie(response, started.context);
    response.cookie(standardBindingCookie, started.binding, {
      ...this.cookieOptions('/api/oauth/callback'),
      maxAge: Math.max(0, started.expiresAt - Date.now()),
    });
    response.status(302).setHeader('Location', started.authorization.authorizationUrl).end();
  }

  @Get('callback')
  async callback(@Req() request: Request, @Res() response: Response): Promise<void> {
    this.requireHost(request, response);
    const context = await this.browser.complete(
      request.query,
      readOpaqueCookie(request, standardContextCookie),
      readOpaqueCookie(request, standardBindingCookie),
    );
    this.contextCookie(response, context);
    response.clearCookie(standardBindingCookie, this.cookieOptions('/api/oauth/callback'));
    response.status(303).setHeader('Location', standardWorkspaceReturn).end();
  }

  @Get('session')
  session(@Req() request: Request, @Res() response: Response): void {
    this.requireHost(request, response);
    this.noQuery(request);
    const id = readOpaqueCookie(request, standardContextCookie);
    const result = this.browser.session(id);
    if (id !== result.context.id) {
      this.contextCookie(response, result.context);
    }
    response.status(200).json(result.view);
  }

  @Post('logout')
  logout(@Req() request: Request, @Res() response: Response): void {
    this.requireHost(request, response);
    this.noQuery(request);
    const result = this.browser.logout(
      readOpaqueCookie(request, standardContextCookie),
      request.get('origin'),
      request.get(standardCsrfHeader),
    );
    this.contextCookie(response, result.context);
    response.clearCookie(standardBindingCookie, this.cookieOptions('/api/oauth/callback'));
    response.status(200).json(result.view);
  }

  private requireHost(request: Request, response: Response): void {
    response.set({
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      'Referrer-Policy': 'no-referrer',
    });
    const profile = this.config.standardProfile;
    if (!profile) {
      throw new NotFoundException();
    }
    if (request.get('host')?.toLowerCase() !== new URL(profile.applicationOrigin).host) {
      throw new AuthorizationError(
        { status: 403, code: 'invalAuth' },
        'Use the configured application host.',
      );
    }
  }

  private noQuery(request: Request): void {
    if (Object.keys(request.query).length !== 0) {
      throw new AuthorizationError(
        { status: 400, code: 'malformedRequest' },
        'This endpoint accepts no query settings.',
      );
    }
  }

  private contextCookie(response: Response, context: StandardContext): void {
    response.cookie(standardContextCookie, context.id, {
      ...this.cookieOptions('/api/oauth'),
      maxAge: Math.max(0, context.expiresAt - Date.now()),
    });
  }

  private cookieOptions(path: string): CookieOptions {
    return {
      path,
      httpOnly: true,
      sameSite: 'lax',
      secure:
        new URL(this.config.standardProfile?.applicationOrigin ?? 'http://localhost').protocol ===
        'https:',
    };
  }
}
