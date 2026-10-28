import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { configuration } from '../../config/configuration';
import { AuthorizationError } from '../../common/errors/authorization-error';
import { TokenService } from '../../oidc/token.service';
import type { AuthenticatedIdentity } from '../../oidc/id-token.service';
import { BrowserLoginStore } from './browser-login.store';

const callbackSchema = z
  .object({
    state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    code: z.string().min(1).max(8192).optional(),
    error: z.string().min(1).max(128).optional(),
    iss: z.string().max(2048).optional(),
  })
  .refine((query) => (query.code === undefined) !== (query.error === undefined));

type BrowserSessionView =
  | { authenticated: false }
  | { authenticated: true; user: AuthenticatedIdentity; expiresAt: string };

@Injectable()
export class BrowserLoginService {
  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly store: BrowserLoginStore,
    private readonly tokens: TokenService,
  ) {}

  async complete(
    query: unknown,
    browserBinding: string | undefined,
    previousSession: string | undefined,
  ) {
    const parsed = callbackSchema.safeParse(query);

    if (!parsed.success) {
      throw new AuthorizationError(
        { status: 400, code: 'malformedRequest' },
        'Callback requires state and either code or error. Start a new login at /login.',
      );
    }

    const callback = parsed.data;

    if (callback.iss !== undefined && callback.iss !== this.config.issuer) {
      throw new AuthorizationError({ status: 403, code: 'invalAuth' }, 'Callback issuer mismatch.');
    }

    const login = this.store.consume(callback.state, browserBinding);

    if (callback.code === undefined) {
      throw new AuthorizationError(
        { status: 403, code: 'invalAuth' },
        'Identity provider did not complete login. Start a new login at /login.',
      );
    }

    const verifiedLogin = await this.tokens.exchange(
      login.metadata,
      login.transaction,
      callback.code,
      login.redirectUri,
    );

    return this.store.createSession(verifiedLogin, previousSession);
  }

  currentSession(id: string | undefined): BrowserSessionView {
    const session = this.store.session(id);

    if (!session) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: session.login.idToken.identity,
      expiresAt: new Date(session.expiresAt).toISOString(),
    };
  }
}
