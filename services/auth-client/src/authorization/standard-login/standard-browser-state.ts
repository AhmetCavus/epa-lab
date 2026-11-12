import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { AuthorizationError } from '../../common/errors/authorization-error';
import type { AuthorizationService } from '../authorization.service';
import type { VerifiedLogin } from '../../oidc/token.service';

export const standardPendingLifetimeMs = 10 * 60 * 1000;
export const standardContextLifetimeMs = 15 * 60 * 1000;
export const standardCollectionLimit = 1000;
export const standardHistoryLimit = 100;

type PreparedAuthorization = Awaited<ReturnType<AuthorizationService['initiateStandard']>>;
export type AuthenticationOutcome =
  | 'pending'
  | 'authenticated'
  | 'provider-denied'
  | 'authentication-failed'
  | 'signed-out'
  | 'cancelled'
  | 'expired';

interface ServerAuthentication {
  readonly tokens: VerifiedLogin['tokens'];
  readonly runId: string;
  readonly expiresAt: number;
}

export interface StandardContext {
  readonly id: string;
  readonly ownerId: string;
  readonly csrfToken: string;
  readonly expiresAt: number;
  currentRunId: string | undefined;
  authentication: ServerAuthentication | undefined;
}

export interface AuthenticationRun {
  readonly id: string;
  readonly ownerId: string;
  readonly expiresAt: number;
  outcome: AuthenticationOutcome;
  readonly history: { outcome: AuthenticationOutcome; recordedAt: number }[];
  historyComplete: boolean;
}

type AttemptState =
  | { kind: 'preparing'; binding: string }
  | { kind: 'pending' | 'in-flight'; binding: string; authorization: PreparedAuthorization }
  | { kind: 'cancelled' | 'finished' | 'expired' };

export interface StandardLoginAttempt {
  readonly id: string;
  readonly contextId: string;
  readonly runId: string;
  readonly expiresAt: number;
  state: AttemptState;
}

export interface CurrentAuthenticationRun {
  runId: string;
  outcome: AuthenticationOutcome;
  expiresAt: string;
  observationsAvailable: false;
}

export type StandardSessionView = (
  { authenticated: false; expiresAt: null } | { authenticated: true; expiresAt: string }
) & { currentRun: CurrentAuthenticationRun | null; csrfToken: string };

function secret(): string {
  return randomBytes(32).toString('base64url');
}

function equalSecret(value: string | undefined, expected: string): boolean {
  const actualBytes = Buffer.from(value ?? '');
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function rejectContext(): never {
  throw new AuthorizationError(
    { status: 403, code: 'invalAuth' },
    'Browser login context is unavailable. Start a fresh login.',
  );
}

function capacity(size: number): void {
  if (size >= standardCollectionLimit) {
    throw new AuthorizationError(
      { status: 500, code: 'internalError' },
      'Browser login capacity reached. Try again later.',
    );
  }
}

/** Standard-profile namespace owned by the existing process-local BrowserLoginStore. */
export class StandardBrowserState {
  private readonly contexts = new Map<string, StandardContext>();
  private readonly runs = new Map<string, AuthenticationRun>();
  private readonly attempts = new Map<string, StandardLoginAttempt>();
  private readonly states = new Map<string, string>();

  context(id: string | undefined): StandardContext | undefined {
    this.prune();
    return id === undefined ? undefined : this.contexts.get(id);
  }

  ensureContext(id: string | undefined): StandardContext {
    const existing = this.context(id);
    if (existing) {
      return existing;
    }
    capacity(this.contexts.size);
    const context = this.newContext(randomUUID(), Date.now() + standardContextLifetimeMs);
    this.contexts.set(context.id, context);
    return context;
  }

  begin(contextId: string | undefined) {
    this.prune();
    const existing = contextId === undefined ? undefined : this.contexts.get(contextId);
    if (!existing) {
      capacity(this.contexts.size);
    }
    capacity(this.runs.size);
    capacity(this.attempts.size);
    const context =
      existing ?? this.newContext(randomUUID(), Date.now() + standardContextLifetimeMs);
    this.contexts.set(context.id, context);
    this.cancelContext(context.id);
    const run: AuthenticationRun = {
      id: randomUUID(),
      ownerId: context.ownerId,
      expiresAt: Math.min(Date.now() + standardContextLifetimeMs, context.expiresAt),
      outcome: 'pending',
      history: [],
      historyComplete: true,
    };
    const attempt: StandardLoginAttempt = {
      id: randomUUID(),
      contextId: context.id,
      runId: run.id,
      expiresAt: Math.min(Date.now() + standardPendingLifetimeMs, context.expiresAt),
      state: { kind: 'preparing', binding: secret() },
    };
    this.runs.set(run.id, run);
    this.attempts.set(attempt.id, attempt);
    context.currentRunId = run.id;
    this.observe(run, 'pending');
    return { context, attempt };
  }

  prepare(attempt: StandardLoginAttempt, authorization: PreparedAuthorization) {
    const context = this.eligible(attempt);
    const state = attempt.state;
    if (
      !context ||
      state.kind !== 'preparing' ||
      authorization.transaction.profile.id !== 'playground-standard'
    ) {
      return rejectContext();
    }
    attempt.state = { kind: 'pending', binding: state.binding, authorization };
    this.states.set(authorization.transaction.state, attempt.id);
    return { context, binding: state.binding, authorization };
  }

  consume(state: string, contextId: string | undefined, binding: string | undefined) {
    this.prune();
    const attemptId = this.states.get(state);
    const attempt = attemptId === undefined ? undefined : this.attempts.get(attemptId);
    const context = contextId === undefined ? undefined : this.contexts.get(contextId);
    if (
      !attempt ||
      !context ||
      attempt.contextId !== context.id ||
      context.currentRunId !== attempt.runId ||
      attempt.state.kind !== 'pending' ||
      !equalSecret(binding, attempt.state.binding)
    ) {
      return rejectContext();
    }
    const authorization = attempt.state.authorization;
    attempt.state = { ...attempt.state, kind: 'in-flight' };
    return { context, attempt, authorization };
  }

  fail(
    attempt: StandardLoginAttempt,
    outcome: 'provider-denied' | 'authentication-failed' = 'authentication-failed',
  ): StandardContext | undefined {
    const context = this.eligible(attempt);
    if (!context || !['preparing', 'pending', 'in-flight'].includes(attempt.state.kind)) {
      return undefined;
    }
    this.finish(attempt, 'finished');
    this.outcome(attempt.runId, outcome);
    return context;
  }

  commit(attempt: StandardLoginAttempt, login: VerifiedLogin): StandardContext {
    const context = this.eligible(attempt);
    if (!context || attempt.state.kind !== 'in-flight' || login.expiresAt <= Date.now()) {
      return rejectContext();
    }
    // Eligibility, rotation and credential assignment are one synchronous state transition.
    this.finish(attempt, 'finished');
    const replacement = this.rotate(context);
    replacement.authentication = {
      tokens: { ...login.tokens },
      runId: attempt.runId,
      expiresAt: Math.min(login.expiresAt, replacement.expiresAt),
    };
    this.outcome(attempt.runId, 'authenticated');
    return replacement;
  }

  logout(contextId: string | undefined, csrfToken: string | undefined): StandardContext {
    const context = this.context(contextId);
    if (!context || !equalSecret(csrfToken, context.csrfToken)) {
      return rejectContext();
    }
    // Reuse the existing slot: capacity and history persistence never gate auth cleanup.
    const replacement = this.rotate(context);
    if (replacement.currentRunId) {
      this.outcome(replacement.currentRunId, 'signed-out');
    }
    return replacement;
  }

  view(context: StandardContext): StandardSessionView {
    this.prune();
    const run =
      context.currentRunId === undefined ? undefined : this.runs.get(context.currentRunId);
    const currentRun: CurrentAuthenticationRun | null =
      run && run.ownerId === context.ownerId
        ? {
            runId: run.id,
            outcome: run.outcome,
            expiresAt: new Date(run.expiresAt).toISOString(),
            observationsAvailable: false,
          }
        : null;
    const common = { currentRun, csrfToken: context.csrfToken };
    const authentication = context.authentication;
    return authentication
      ? {
          authenticated: true,
          expiresAt: new Date(authentication.expiresAt).toISOString(),
          ...common,
        }
      : { authenticated: false, expiresAt: null, ...common };
  }

  /** Internal auth history only; no teaching-event DTO or event endpoint is implemented. */
  record(run: AuthenticationRun, outcome: AuthenticationOutcome): void {
    if (run.history.length >= standardHistoryLimit) {
      throw new Error('Authentication history capacity reached');
    }
    run.history.push({ outcome, recordedAt: Date.now() });
  }

  private newContext(ownerId: string, expiresAt: number): StandardContext {
    return {
      id: secret(),
      ownerId,
      csrfToken: secret(),
      expiresAt,
      currentRunId: undefined,
      authentication: undefined,
    };
  }

  private rotate(context: StandardContext): StandardContext {
    context.authentication = undefined;
    this.cancelContext(context.id);
    this.contexts.delete(context.id);
    const replacement = this.newContext(context.ownerId, context.expiresAt);
    replacement.currentRunId = context.currentRunId;
    this.contexts.set(replacement.id, replacement);
    return replacement;
  }

  private eligible(attempt: StandardLoginAttempt): StandardContext | undefined {
    this.prune();
    const context = this.contexts.get(attempt.contextId);
    const run = this.runs.get(attempt.runId);
    return this.attempts.get(attempt.id) === attempt &&
      context &&
      run &&
      run.ownerId === context.ownerId &&
      context.currentRunId === run.id &&
      attempt.expiresAt > Date.now()
      ? context
      : undefined;
  }

  private finish(attempt: StandardLoginAttempt, kind: 'cancelled' | 'finished' | 'expired'): void {
    if (attempt.state.kind === 'pending' || attempt.state.kind === 'in-flight') {
      this.states.delete(attempt.state.authorization.transaction.state);
    }
    this.attempts.delete(attempt.id);
    attempt.state = { kind };
  }

  private cancelContext(contextId: string): void {
    for (const attempt of this.attempts.values()) {
      if (attempt.contextId === contextId) {
        this.finish(attempt, 'cancelled');
        this.outcome(attempt.runId, 'cancelled');
      }
    }
  }

  private outcome(runId: string, outcome: AuthenticationOutcome): void {
    const run = this.runs.get(runId);
    if (run) {
      run.outcome = outcome;
      this.observe(run, outcome);
    }
  }

  private observe(run: AuthenticationRun, outcome: AuthenticationOutcome): void {
    try {
      this.record(run, outcome);
    } catch {
      run.historyComplete = false;
    }
  }

  private prune(): void {
    const now = Date.now();
    for (const context of this.contexts.values()) {
      if (context.expiresAt <= now) {
        context.authentication = undefined;
        this.cancelContext(context.id);
        this.contexts.delete(context.id);
      } else if (context.authentication && context.authentication.expiresAt <= now) {
        const runId = context.authentication.runId;
        context.authentication = undefined;
        this.outcome(runId, 'expired');
      }
    }
    for (const attempt of this.attempts.values()) {
      if (attempt.expiresAt <= now) {
        this.finish(attempt, 'expired');
        this.outcome(attempt.runId, 'expired');
      }
    }
    for (const run of this.runs.values()) {
      if (run.expiresAt <= now) {
        this.runs.delete(run.id);
      }
    }
  }
}
