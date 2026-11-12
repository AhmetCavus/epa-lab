import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { configuration } from '../../config/configuration';
import { clientProfile } from '../../config/client-profile';
import { AuthorizationError } from '../../common/errors/authorization-error';
import { AuthorizationService } from '../authorization.service';
import { BrowserLoginStore } from '../browser-login/browser-login.store';
import { TokenService } from '../../oidc/token.service';

const callbackSchema = z
  .object({
    state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    code: z.string().min(1).max(8192).optional(),
    error: z.string().min(1).max(128).optional(),
    iss: z.string().max(2048).optional(),
    session_state: z.string().max(2048).optional(),
    error_description: z.string().max(2048).optional(),
    error_uri: z.string().max(2048).optional(),
  })
  .strict()
  .refine((query) => (query.code === undefined) !== (query.error === undefined));

@Injectable()
export class StandardBrowserService {
  constructor(
    @Inject(configuration.KEY) private readonly config: ConfigType<typeof configuration>,
    private readonly store: BrowserLoginStore,
    private readonly authorization: AuthorizationService,
    private readonly tokens: TokenService,
  ) {}

  async start(contextId: string | undefined) {
    clientProfile(this.config, 'playground-standard');
    const reservation = this.store.standard.begin(contextId);
    try {
      const authorization = await this.authorization.initiateStandard();
      const prepared = this.store.standard.prepare(reservation.attempt, authorization);
      return { ...prepared, expiresAt: reservation.attempt.expiresAt };
    } catch (error) {
      this.store.standard.fail(reservation.attempt);
      throw error;
    }
  }

  async complete(query: unknown, contextId: string | undefined, binding: string | undefined) {
    const profile = clientProfile(this.config, 'playground-standard');
    const parsed = callbackSchema.safeParse(query);
    if (!parsed.success) {
      throw new AuthorizationError(
        { status: 400, code: 'malformedRequest' },
        'Invalid OAuth callback. Start a fresh login.',
      );
    }
    const callback = parsed.data;
    if (callback.iss !== undefined && callback.iss !== profile.issuer) {
      throw new AuthorizationError({ status: 403, code: 'invalAuth' }, 'Callback issuer mismatch.');
    }
    const consumed = this.store.standard.consume(callback.state, contextId, binding);
    if (callback.code === undefined) {
      const context = this.store.standard.fail(consumed.attempt, 'provider-denied');
      if (!context) {
        return this.staleCallback();
      }
      return context;
    }
    try {
      const login = await this.tokens.exchange(
        consumed.authorization.metadata,
        consumed.authorization.transaction,
        callback.code,
        'playground-standard',
      );
      return this.store.standard.commit(consumed.attempt, login);
    } catch {
      const context = this.store.standard.fail(consumed.attempt);
      if (!context) {
        return this.staleCallback();
      }
      return context;
    }
  }

  session(contextId: string | undefined) {
    clientProfile(this.config, 'playground-standard');
    const context = this.store.standard.ensureContext(contextId);
    return { context, view: this.store.standard.view(context) };
  }

  logout(contextId: string | undefined, origin: string | undefined, csrfToken: string | undefined) {
    const profile = clientProfile(this.config, 'playground-standard');
    if (origin !== profile.applicationOrigin) {
      throw new AuthorizationError(
        { status: 403, code: 'invalAuth' },
        'Logout requires the configured application Origin.',
      );
    }
    const context = this.store.standard.logout(contextId, csrfToken);
    return { context, view: this.store.standard.view(context) };
  }

  private staleCallback(): never {
    throw new AuthorizationError(
      { status: 403, code: 'invalAuth' },
      'Login no longer belongs to an active browser context. Start a fresh login.',
    );
  }
}
