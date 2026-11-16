import { AuthorizationError } from '../../common/errors/authorization-error';
import { clientProfile } from '../../config/client-profile';
import { createBoundAuthorizationTransaction } from '../../oidc/authorization-transaction';
import type { VerifiedLogin } from '../../oidc/token.service';
import { profileTestConfiguration, standardTestMetadata } from '../../../test/fixtures';
import {
  StandardBrowserState,
  standardContextLifetimeMs,
  standardPendingLifetimeMs,
  standardCollectionLimit,
  standardHistoryLimit,
} from './standard-browser-state';

const profile = clientProfile(profileTestConfiguration, 'playground-standard');

function prepared() {
  return {
    authorizationUrl: 'http://localhost:8080/authorization',
    metadata: standardTestMetadata,
    transaction: createBoundAuthorizationTransaction(profile),
  };
}

function loginResult(expiresAt = Date.now() + 5 * 60 * 1000): VerifiedLogin {
  return {
    tokens: {
      access_token: 'fictional-server-access-token',
      id_token: 'fictional-server-id-token',
      refresh_token: 'fictional-server-refresh-token',
      token_type: 'Bearer',
      expires_in: 300,
    },
    idToken: { identity: { subject: 'fictional-identity', issuer: profile.issuer }, expiresAt },
    expiresAt,
  };
}

function pending(state: StandardBrowserState, contextId?: string) {
  const reservation = state.begin(contextId);
  const authorization = prepared();
  const result = state.prepare(reservation.attempt, authorization);
  return { ...reservation, ...result, transaction: authorization.transaction };
}

function authenticate(state: StandardBrowserState) {
  const start = pending(state);
  state.consume(start.transaction.state, start.context.id, start.binding);
  return { ...start, authenticated: state.commit(start.attempt, loginResult()) };
}

describe('standard namespace in the bounded process-local browser store', () => {
  let state: StandardBrowserState;
  beforeEach(() => {
    state = new StandardBrowserState();
  });
  afterEach(() => jest.restoreAllMocks());

  it('consumes a correlated transaction once and does not consume another browser attempt', () => {
    const start = pending(state);
    const other = state.ensureContext(undefined);
    expect(() => state.consume(start.transaction.state, other.id, start.binding)).toThrow(
      AuthorizationError,
    );
    expect(() => state.consume(start.transaction.state, start.context.id, 'wrong')).toThrow(
      AuthorizationError,
    );
    state.consume(start.transaction.state, start.context.id, start.binding);
    expect(() => state.consume(start.transaction.state, start.context.id, start.binding)).toThrow(
      AuthorizationError,
    );
  });

  it('rotates context/CSRF on authentication and logout without extending original expiry', () => {
    const start = pending(state);
    const deadline = start.context.expiresAt;
    state.consume(start.transaction.state, start.context.id, start.binding);
    const authenticated = state.commit(start.attempt, loginResult(Date.now() + 60 * 60 * 1000));
    expect(state.context(start.context.id)).toBeUndefined();
    expect(authenticated.id === start.context.id).toBe(false);
    expect(authenticated.csrfToken === start.context.csrfToken).toBe(false);
    expect(authenticated.authentication?.expiresAt).toBe(deadline);
    const anonymous = state.logout(authenticated.id, authenticated.csrfToken);
    expect(authenticated.authentication).toBeUndefined();
    expect(state.context(authenticated.id)).toBeUndefined();
    expect(anonymous.ownerId).toBe(authenticated.ownerId);
    expect(anonymous.expiresAt).toBe(deadline);
    expect(state.view(anonymous)).toMatchObject({
      authenticated: false,
      expiresAt: null,
      currentRun: {
        runId: start.attempt.runId,
        outcome: 'signed-out',
        observationsAvailable: true,
      },
    });
  });

  it('expires pending transactions at ten minutes and cannot commit a late completion', () => {
    const start = pending(state);
    state.consume(start.transaction.state, start.context.id, start.binding);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + standardPendingLifetimeMs);
    expect(() => state.commit(start.attempt, loginResult())).toThrow(AuthorizationError);
    expect(start.attempt.state.kind).toBe('expired');
    expect(state.view(start.context)).toMatchObject({
      authenticated: false,
      currentRun: { outcome: 'expired' },
    });
  });

  it('drops credentials at token expiry and retains only bounded owned history until context expiry', () => {
    const { authenticated } = authenticate(state);
    const expiresAt = authenticated.authentication?.expiresAt;
    if (!expiresAt) {
      throw new Error('Expected server authentication');
    }
    const clock = jest.spyOn(Date, 'now').mockReturnValue(expiresAt);
    expect(state.view(authenticated).authenticated).toBe(false);
    expect(authenticated.authentication).toBeUndefined();
    expect(state.view(authenticated).currentRun?.outcome).toBe('expired');
    clock.mockReturnValue(authenticated.expiresAt);
    const replacement = state.ensureContext(authenticated.id);
    expect(state.view(replacement).currentRun).toBeNull();
    expect(replacement.ownerId === authenticated.ownerId).toBe(false);
  });

  it('cannot recover context, pending state or history after a process restart', () => {
    const start = pending(state);
    const fresh = new StandardBrowserState();
    expect(() => fresh.consume(start.transaction.state, start.context.id, start.binding)).toThrow(
      AuthorizationError,
    );
    expect(fresh.view(fresh.ensureContext(start.context.id))).toMatchObject({
      authenticated: false,
      currentRun: null,
    });
  });

  it('cancels preparing/pending/in-flight work on logout and rejects stale completion', () => {
    const { authenticated } = authenticate(state);
    const waiting = pending(state, authenticated.id);
    state.consume(waiting.transaction.state, authenticated.id, waiting.binding);
    const anonymous = state.logout(authenticated.id, authenticated.csrfToken);
    expect(waiting.attempt.state).toEqual({ kind: 'cancelled' });
    expect(() => state.commit(waiting.attempt, loginResult())).toThrow(AuthorizationError);
    expect(state.view(anonymous).authenticated).toBe(false);
    const preparing = state.begin(anonymous.id);
    const rotated = state.logout(anonymous.id, anonymous.csrfToken);
    expect(() => state.prepare(preparing.attempt, prepared())).toThrow(AuthorizationError);
    expect(state.view(rotated).authenticated).toBe(false);
  });

  it('supersedes older attempts without allowing their completion to replace the current run', () => {
    const old = pending(state);
    state.consume(old.transaction.state, old.context.id, old.binding);
    const next = pending(state, old.context.id);
    expect(() => state.commit(old.attempt, loginResult())).toThrow(AuthorizationError);
    expect(state.view(next.context).currentRun?.runId).toBe(next.attempt.runId);
  });

  it('enforces each collection bound, rejects ordinary work without evicting legitimate pending state, and permits logout at capacity', () => {
    const starts = Array.from({ length: standardCollectionLimit }, () => state.begin(undefined));
    expect(() => state.ensureContext(undefined)).toThrow(AuthorizationError);
    expect(() => state.begin(starts[0]?.context.id)).toThrow(AuthorizationError);
    const first = starts[0];
    if (!first) {
      throw new Error('Expected capacity fixture');
    }
    const authorization = prepared();
    const attached = state.prepare(first.attempt, authorization);
    state.consume(authorization.transaction.state, first.context.id, attached.binding);
    const anonymous = state.logout(first.context.id, first.context.csrfToken);
    expect(anonymous.expiresAt).toBe(first.context.expiresAt);
    expect(first.attempt.state.kind).toBe('cancelled');
    expect(state.view(anonymous).authenticated).toBe(false);
  });

  it('recovers all expired collection slots without retaining old history', () => {
    for (let index = 0; index < standardCollectionLimit; index += 1) {
      state.begin(undefined);
    }
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + standardContextLifetimeMs);
    expect(() => state.begin(undefined)).not.toThrow();
  });

  it('does not let full history or a throwing recorder prevent credential cleanup/cancellation/rotation', () => {
    const capture = jest.spyOn(state, 'record');
    const { authenticated } = authenticate(state);
    const waiting = pending(state, authenticated.id);
    state.consume(waiting.transaction.state, authenticated.id, waiting.binding);
    const run = capture.mock.calls.at(-1)?.[0];
    if (!run) {
      throw new Error('Expected an owned run');
    }
    while (run.history.length < standardHistoryLimit) {
      state.record(run, {
        kind: 'authorization-started',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'pending',
        evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
      });
    }
    const anonymous = state.logout(authenticated.id, authenticated.csrfToken);
    expect(authenticated.authentication).toBeUndefined();
    expect(run.history.length).toBe(standardHistoryLimit);
    expect(run.historyComplete).toBe(false);
    expect(run.outcome).toBe('signed-out');
    expect(() => state.commit(waiting.attempt, loginResult())).toThrow(AuthorizationError);
    const next = pending(state, anonymous.id);
    capture.mockImplementation(() => {
      throw new Error('Sensitive recorder failure must not escape');
    });
    const signedOut = state.logout(anonymous.id, anonymous.csrfToken);
    expect(next.attempt.state.kind).toBe('cancelled');
    expect(state.view(signedOut).authenticated).toBe(false);
  });

  it('does not alter another browser or accept cross-context CSRF material', () => {
    const first = authenticate(state).authenticated;
    const second = authenticate(state).authenticated;
    expect(() => state.logout(first.id, second.csrfToken)).toThrow(AuthorizationError);
    state.logout(first.id, first.csrfToken);
    expect(state.view(second).authenticated).toBe(true);
  });

  it('cleans authenticated and in-flight credentials with full context/run collections and exhausted history', () => {
    const capture = jest.spyOn(state, 'record');
    const { authenticated } = authenticate(state);
    const waiting = pending(state, authenticated.id);
    state.consume(waiting.transaction.state, authenticated.id, waiting.binding);
    const run = capture.mock.calls.at(-1)?.[0];
    if (!run) {
      throw new Error('Expected an owned run');
    }
    while (run.history.length < standardHistoryLimit) {
      state.record(run, {
        kind: 'authorization-started',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'pending',
        evidence: { responseType: 'code', pkceMethod: 'S256', authorizationMode: 'direct' },
      });
    }
    for (let index = 0; index < standardCollectionLimit - 2; index += 1) {
      state.begin(undefined);
    }
    state.ensureContext(undefined);
    expect(() => state.ensureContext(undefined)).toThrow(AuthorizationError);
    expect(() => state.begin(authenticated.id)).toThrow(AuthorizationError);
    const anonymous = state.logout(authenticated.id, authenticated.csrfToken);
    expect(authenticated.authentication).toBeUndefined();
    expect(state.view(anonymous)).toMatchObject({
      authenticated: false,
      currentRun: { outcome: 'signed-out', observationsAvailable: false },
    });
    expect(run.history.length).toBe(standardHistoryLimit);
    expect(run.historyComplete).toBe(false);
    expect(() => state.commit(waiting.attempt, loginResult())).toThrow(AuthorizationError);
  });
});
