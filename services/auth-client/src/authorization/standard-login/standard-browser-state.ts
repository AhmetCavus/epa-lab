import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { AuthorizationError } from '../../common/errors/authorization-error';
import type { AuthorizationService } from '../authorization.service';
import type { VerifiedLogin } from '../../oidc/token.service';
import {
  maximumEventsPerRun,
  protocolEventSchema,
  protocolEventDocumentSchema,
} from '../run-observations/protocol-event';
import type {
  ProtocolEvent,
  ProtocolObservation,
  ProtocolEventDocument,
} from '../run-observations/protocol-event';

export const standardPendingLifetimeMs = 10 * 60 * 1000;
export const standardContextLifetimeMs = 15 * 60 * 1000;
export const standardCollectionLimit = 1000;
export const standardHistoryLimit = maximumEventsPerRun;

type PreparedAuthorization = Awaited<ReturnType<AuthorizationService['initiateStandard']>>;
export type AuthenticationOutcome =
  | 'pending'
  | 'authenticated'
  | 'provider-denied'
  | 'authentication-failed'
  | 'signed-out'
  | 'cancelled'
  | 'expired';

export interface ServerAuthentication {
  readonly profileId: 'playground-standard';
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
  readonly history: ProtocolEvent[];
  historyComplete: boolean;
  reservedEvents: number;
}

export interface ObservationReservation {
  readonly run: AuthenticationRun;
  remaining: number;
}

type AttemptState =
  | { kind: 'preparing'; binding: string }
  | { kind: 'pending' | 'in-flight'; binding: string; authorization: PreparedAuthorization }
  | { kind: 'cancelled' | 'finished' | 'expired' };

export interface StandardLoginAttempt {
  readonly id: string;
  readonly contextId: string;
  readonly ownerId: string;
  readonly runId: string;
  readonly expiresAt: number;
  state: AttemptState;
}

export interface CurrentAuthenticationRun {
  runId: string;
  outcome: AuthenticationOutcome;
  expiresAt: string;
  observationsAvailable: boolean;
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
    this.cancelContext(context.id, 'superseded');
    const run: AuthenticationRun = {
      id: randomUUID(),
      ownerId: context.ownerId,
      expiresAt: Math.min(Date.now() + standardContextLifetimeMs, context.expiresAt),
      outcome: 'pending',
      history: [],
      historyComplete: true,
      reservedEvents: 0,
    };
    const attempt: StandardLoginAttempt = {
      id: randomUUID(),
      contextId: context.id,
      ownerId: context.ownerId,
      runId: run.id,
      expiresAt: Math.min(Date.now() + standardPendingLifetimeMs, context.expiresAt),
      state: { kind: 'preparing', binding: secret() },
    };
    this.runs.set(run.id, run);
    this.attempts.set(attempt.id, attempt);
    context.currentRunId = run.id;
    this.observe(run.id, run.ownerId, {
      kind: 'authorization-started',
      channel: 'actor-local',
      actorId: 'bff',
      outcome: 'pending',
      evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
    });
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

  rejectOwnedCallback(
    state: string,
    contextId: string | undefined,
    binding: string | undefined,
    reason: 'malformed-callback' | 'issuer-mismatch',
  ): void {
    this.prune();
    const id = this.states.get(state);
    const attempt = id === undefined ? undefined : this.attempts.get(id);
    const context = contextId === undefined ? undefined : this.contexts.get(contextId);
    if (
      !attempt ||
      !context ||
      attempt.contextId !== context.id ||
      context.currentRunId !== attempt.runId ||
      attempt.state.kind !== 'pending' ||
      !equalSecret(binding, attempt.state.binding)
    ) {
      return;
    }
    this.observe(attempt.runId, context.ownerId, {
      kind: 'callback-rejected',
      channel: 'actor-local',
      actorId: 'bff',
      outcome: 'rejected',
      evidence: { reason },
    });
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

  commit(
    attempt: StandardLoginAttempt,
    login: VerifiedLogin,
    trace?: ObservationReservation,
  ): StandardContext {
    const context = this.eligible(attempt);
    if (!context || attempt.state.kind !== 'in-flight' || login.expiresAt <= Date.now()) {
      return rejectContext();
    }
    // Eligibility, rotation and credential assignment are one synchronous state transition.
    this.finish(attempt, 'finished');
    const replacement = this.rotate(context);
    replacement.authentication = {
      profileId: 'playground-standard',
      tokens: { ...login.tokens },
      runId: attempt.runId,
      expiresAt: Math.min(login.expiresAt, replacement.expiresAt),
    };
    this.outcome(attempt.runId, 'authenticated');
    this.observe(
      attempt.runId,
      attempt.ownerId,
      {
        kind: 'session-established',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'authenticated',
        evidence: { contextRotated: true },
      },
      trace,
    );
    return replacement;
  }

  logout(contextId: string | undefined, csrfToken: string | undefined): StandardContext {
    const context = this.context(contextId);
    if (!context || !equalSecret(csrfToken, context.csrfToken)) {
      return rejectContext();
    }
    // Reuse the existing slot: capacity and history persistence never gate auth cleanup.
    const authenticatedRunId = context.authentication?.runId;
    const replacement = this.rotate(context, 'local-logout');
    if (replacement.currentRunId) {
      this.outcome(replacement.currentRunId, 'signed-out');
    }
    const runId = authenticatedRunId ?? replacement.currentRunId;
    if (runId) {
      this.outcome(runId, 'signed-out');
      this.observe(runId, replacement.ownerId, {
        kind: 'session-ended',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'signed-out',
        evidence: {
          reason: 'local-logout',
          authenticationRemoved: authenticatedRunId !== undefined,
        },
      });
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
            observationsAvailable: run.historyComplete,
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

  /** Single strict projection boundary for stored observations; failures never undo cleanup. */
  record(run: AuthenticationRun, observation: ProtocolObservation): void {
    if (
      ['schemaVersion', 'eventId', 'runId', 'sequence', 'observedAt', 'observedBy'].some(
        (key) => key in observation,
      )
    ) {
      throw new Error('Protocol observation metadata must be server-generated');
    }
    if (run.history.length + run.reservedEvents >= standardHistoryLimit) {
      throw new Error('Protocol observation capacity reached');
    }
    const parsed = protocolEventSchema.safeParse({
      ...observation,
      schemaVersion: 1,
      eventId: randomUUID(),
      runId: run.id,
      sequence: run.history.length + 1,
      observedAt: new Date().toISOString(),
      observedBy: 'auth-client',
    });
    if (!parsed.success) {
      throw new Error('Protocol observation rejected');
    }
    run.history.push(parsed.data);
  }

  reserve(context: StandardContext, runId: string, count: number): ObservationReservation {
    const current = this.context(context.id);
    const run = this.runs.get(runId);
    if (current !== context || !run || run.ownerId !== context.ownerId) {
      return rejectContext();
    }
    if (
      !run.historyComplete ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > standardHistoryLimit ||
      run.history.length + run.reservedEvents + count > standardHistoryLimit
    ) {
      run.historyComplete = false;
      throw new AuthorizationError(
        { status: 503, code: 'internalError' },
        'Protocol observation capacity is unavailable. Start a fresh run.',
      );
    }
    run.reservedEvents += count;
    return { run, remaining: count };
  }

  release(trace: ObservationReservation): void {
    trace.run.reservedEvents -= trace.remaining;
    trace.remaining = 0;
  }

  observe(
    runId: string,
    ownerId: string,
    observation: ProtocolObservation,
    trace?: ObservationReservation,
  ): boolean {
    const run = this.runs.get(runId);
    if (!run || run.ownerId !== ownerId || run.expiresAt <= Date.now()) {
      return false;
    }
    if (trace) {
      if (trace.run !== run || trace.remaining < 1) {
        run.historyComplete = false;
        return false;
      }
      trace.remaining -= 1;
      run.reservedEvents -= 1;
    }
    try {
      this.record(run, observation);
      return true;
    } catch {
      run.historyComplete = false;
      return false;
    }
  }

  events(contextId: string | undefined, runId: string): ProtocolEventDocument {
    const context = this.context(contextId);
    const run = this.runs.get(runId);
    if (!context || !run || run.ownerId !== context.ownerId) {
      throw new AuthorizationError(
        { status: 404, code: 'noResource' },
        'Run observations are unavailable.',
      );
    }
    const parsed = protocolEventDocumentSchema.safeParse({
      schemaVersion: 1,
      runId: run.id,
      expiresAt: new Date(run.expiresAt).toISOString(),
      complete: run.historyComplete,
      events: run.history,
    });
    if (!parsed.success) {
      run.historyComplete = false;
      throw new AuthorizationError(
        { status: 500, code: 'internalError' },
        'Run observations are unavailable.',
      );
    }
    return parsed.data;
  }

  authenticationCurrent(context: StandardContext, authentication: ServerAuthentication): boolean {
    return (
      this.context(context.id) === context &&
      context.authentication === authentication &&
      authentication.profileId === 'playground-standard'
    );
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

  private rotate(
    context: StandardContext,
    reason: 'superseded' | 'local-logout' = 'superseded',
  ): StandardContext {
    context.authentication = undefined;
    this.cancelContext(context.id, reason);
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

  private cancelContext(
    contextId: string,
    reason: 'superseded' | 'local-logout' | 'expired',
  ): void {
    for (const attempt of this.attempts.values()) {
      if (attempt.contextId === contextId) {
        this.finish(attempt, 'cancelled');
        this.outcome(attempt.runId, 'cancelled');
        this.observe(attempt.runId, attempt.ownerId, {
          kind: 'authorization-cancelled',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'cancelled',
          evidence: { reason },
        });
      }
    }
  }

  private outcome(runId: string, outcome: AuthenticationOutcome): void {
    const run = this.runs.get(runId);
    if (run) {
      run.outcome = outcome;
    }
  }

  private prune(): void {
    const now = Date.now();
    for (const context of this.contexts.values()) {
      if (context.expiresAt <= now) {
        context.authentication = undefined;
        this.cancelContext(context.id, 'expired');
        this.contexts.delete(context.id);
      } else if (context.authentication && context.authentication.expiresAt <= now) {
        const runId = context.authentication.runId;
        context.authentication = undefined;
        this.outcome(runId, 'expired');
        this.observe(runId, context.ownerId, {
          kind: 'session-ended',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'expired',
          evidence: { reason: 'token-expired', authenticationRemoved: true },
        });
      }
    }
    for (const attempt of this.attempts.values()) {
      if (attempt.expiresAt <= now) {
        this.finish(attempt, 'expired');
        this.outcome(attempt.runId, 'expired');
        this.observe(attempt.runId, attempt.ownerId, {
          kind: 'authorization-cancelled',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'cancelled',
          evidence: { reason: 'expired' },
        });
      }
    }
    for (const run of this.runs.values()) {
      if (run.expiresAt <= now) {
        this.runs.delete(run.id);
      }
    }
  }
}
