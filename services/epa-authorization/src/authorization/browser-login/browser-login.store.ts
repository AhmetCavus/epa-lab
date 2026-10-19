import { Injectable } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthorizationError } from '../../common/errors/authorization-error';
import type { AuthorizationTransaction } from '../../oidc/authorization-transaction';
import type { OidcMetadata } from '../../oidc/oidc-discovery.service';
import type { VerifiedLogin } from '../../oidc/token.service';

export const loginLifetimeMs = 10 * 60 * 1000;
const sessionLifetimeMs = 15 * 60 * 1000;
const maximumEntries = 1000;

export interface PendingLogin {
  transaction: AuthorizationTransaction;
  browserBinding: string;
  metadata: OidcMetadata;
  redirectUri: string;
  expiresAt: number;
}

interface BrowserSession {
  login: VerifiedLogin;
  expiresAt: number;
}

function pruneExpired(entries: Map<string, { expiresAt: number }>): void {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= Date.now()) {
      entries.delete(key);
    }
  }
}

function ensureCapacity(entries: Map<string, { expiresAt: number }>): void {
  pruneExpired(entries);

  if (entries.size >= maximumEntries) {
    throw new AuthorizationError(
      { status: 500, code: 'internalError' },
      'Login capacity reached. Try again later.',
    );
  }
}

@Injectable()
export class BrowserLoginStore {
  private readonly pendingLogins = new Map<string, PendingLogin>();
  private readonly sessions = new Map<string, BrowserSession>();

  save(login: Omit<PendingLogin, 'expiresAt'>): void {
    ensureCapacity(this.pendingLogins);
    this.pendingLogins.set(login.transaction.state, {
      ...login,
      expiresAt: Date.now() + loginLifetimeMs,
    });
  }

  consume(state: string, browserBinding: string | undefined): PendingLogin {
    pruneExpired(this.pendingLogins);
    const login = this.pendingLogins.get(state);
    const suppliedBinding = Buffer.from(browserBinding ?? '');
    const expectedBinding = Buffer.from(login?.browserBinding ?? '');

    if (
      !login ||
      !browserBinding ||
      suppliedBinding.length !== expectedBinding.length ||
      !timingSafeEqual(suppliedBinding, expectedBinding)
    ) {
      throw new AuthorizationError(
        { status: 403, code: 'invalAuth' },
        'Login transaction missing, expired, or from another browser. Start a new login at /login.',
      );
    }

    // Consume synchronously before token exchange to prevent concurrent callback replay.
    this.pendingLogins.delete(state);
    return login;
  }

  createSession(login: VerifiedLogin, previousId: string | undefined) {
    if (previousId) {
      this.sessions.delete(previousId);
    }

    ensureCapacity(this.sessions);
    const expiresAt = Math.min(login.expiresAt, Date.now() + sessionLifetimeMs);

    if (expiresAt <= Date.now()) {
      throw new AuthorizationError(
        { status: 403, code: 'invalAuth' },
        'Login tokens have expired.',
      );
    }

    const id = randomBytes(32).toString('base64url');
    this.sessions.set(id, { login, expiresAt });
    return { id, expiresAt };
  }

  session(id: string | undefined): BrowserSession | undefined {
    pruneExpired(this.sessions);
    return id === undefined ? undefined : this.sessions.get(id);
  }
}
