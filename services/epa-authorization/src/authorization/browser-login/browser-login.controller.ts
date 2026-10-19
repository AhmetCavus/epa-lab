import { Controller, Get, Inject, Req, Res } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { configuration } from '../../config/configuration';
import { AuthorizationError } from '../../common/errors/authorization-error';
import { AuthorizationService } from '../authorization.service';
import { BrowserLoginService } from './browser-login.service';
import { loginLifetimeMs } from './browser-login.store';

const bindingCookie = 'epa_login';
const sessionCookie = 'epa_session';

function readCookie(request: Request, name: string): string | undefined {
  const matches = (request.headers.cookie ?? '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.startsWith(`${name}=`));
  const cookie = matches[0]?.slice(name.length + 1);

  return matches.length === 1 && cookie && /^[A-Za-z0-9_-]{43}$/.test(cookie) ? cookie : undefined;
}

@Controller()
export class BrowserLoginController {
  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly authorization: AuthorizationService,
    private readonly login: BrowserLoginService,
  ) {}

  @Get('login')
  async start(@Req() request: Request, @Res() response: Response): Promise<void> {
    if (Object.keys(request.query).length > 0) {
      throw new AuthorizationError(
        { status: 400, code: 'malformedRequest' },
        'Login accepts no query parameters.',
      );
    }

    const callback = new URL(this.config.defaultRedirectUri);

    if (callback.pathname !== '/callback' || callback.search) {
      throw new AuthorizationError(
        { status: 403, code: 'invalRedir' },
        'Browser login requires the configured /callback URI.',
      );
    }

    const browserBinding = randomBytes(32).toString('base64url');
    const location = await this.authorization.initiate(
      {
        issuer: this.config.issuer,
        redirectUri: this.config.defaultRedirectUri,
        requestId: String(response.getHeader('X-Request-ID')),
      },
      browserBinding,
    );

    response.cookie(bindingCookie, browserBinding, {
      ...this.cookieOptions('/callback'),
      maxAge: loginLifetimeMs,
    });
    response.status(302).setHeader('Location', location).end();
  }

  @Get('callback')
  async callback(@Req() request: Request, @Res() response: Response): Promise<void> {
    const session = await this.login.complete(
      request.query,
      readCookie(request, bindingCookie),
      readCookie(request, sessionCookie),
    );

    response.clearCookie(bindingCookie, this.cookieOptions('/callback'));
    response.cookie(sessionCookie, session.id, {
      ...this.cookieOptions('/'),
      maxAge: session.expiresAt - Date.now(),
    });
    // Remove the authorization code from the visible URL; tokens stay in the backend.
    response.status(303).setHeader('Location', '/session').end();
  }

  @Get('session')
  session(@Req() request: Request) {
    return this.login.currentSession(readCookie(request, sessionCookie));
  }

  private cookieOptions(path: string): CookieOptions {
    return {
      path,
      httpOnly: true,
      sameSite: 'lax',
      secure: new URL(this.config.defaultRedirectUri).protocol === 'https:',
    };
  }
}
