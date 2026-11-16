import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { configuration } from '../../config/configuration';
import { clientProfile } from '../../config/client-profile';
import { AuthorizationError } from '../../common/errors/authorization-error';
import { AuthorizationService } from '../authorization.service';
import { BrowserLoginStore } from '../browser-login/browser-login.store';
import { TokenService } from '../../oidc/token.service';
import { OidcUpstreamError } from '../../oidc/oidc-client.service';
import { readStandardResource } from '../standard-resource/standard-resource';
import { demoReadOperation } from '../run-observations/protocol-event';
import type { ProtocolObservation } from '../run-observations/protocol-event';
import type {
  ObservationReservation,
  StandardContext,
  StandardLoginAttempt,
} from './standard-browser-state';

interface ObservedCompletion {
  context: StandardContext;
  trace: ObservationReservation;
}

function exchangeFailureReason(
  error: unknown,
): 'timeout' | 'network-error' | 'provider-rejected' | 'invalid-response' {
  if (error instanceof OidcUpstreamError) {
    switch (error.reason) {
      case 'timeout':
        return 'timeout';
      case 'network_error':
        return 'network-error';
      case 'unexpected_status':
        return 'provider-rejected';
    }
  }
  return 'invalid-response';
}

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
    let trace: ObservationReservation | undefined;
    try {
      trace = this.store.standard.reserve(reservation.context, reservation.attempt.runId, 1);
      const authorization = await this.authorization.initiateStandard();
      const prepared = this.store.standard.prepare(reservation.attempt, authorization);
      return {
        ...prepared,
        attempt: reservation.attempt,
        trace,
        expiresAt: reservation.attempt.expiresAt,
      };
    } catch (error) {
      const context = this.store.standard.fail(reservation.attempt);
      if (context) {
        this.store.standard.observe(
          reservation.attempt.runId,
          context.ownerId,
          {
            kind: 'authorization-failed',
            channel: 'actor-local',
            actorId: 'bff',
            outcome: 'failed',
            evidence: { reason: 'authorization-unavailable' },
          },
          trace,
        );
      }
      if (trace) {
        this.store.standard.release(trace);
      }
      throw error;
    }
  }

  redirectIssued(started: { attempt: StandardLoginAttempt; trace: ObservationReservation }): void {
    this.store.standard.observe(
      started.attempt.runId,
      started.attempt.ownerId,
      {
        kind: 'authorization-redirect-issued',
        channel: 'front-channel',
        sourceActorId: 'bff',
        targetActorId: 'browser',
        outcome: 'issued',
        evidence: {
          httpStatus: 302,
          destinationActorId: 'authorization-server',
          responseType: 'code',
          pkceMethod: 'S256',
        },
      },
      started.trace,
    );
  }

  workspaceReturned(completed: ObservedCompletion): void {
    this.store.standard.observe(
      completed.trace.run.id,
      completed.context.ownerId,
      {
        kind: 'workspace-redirect-issued',
        channel: 'front-channel',
        sourceActorId: 'bff',
        targetActorId: 'browser',
        outcome: 'issued',
        evidence: { httpStatus: 303, target: 'oauth-workspace' },
      },
      completed.trace,
    );
  }

  release(trace: ObservationReservation): void {
    this.store.standard.release(trace);
  }

  async complete(
    query: unknown,
    contextId: string | undefined,
    binding: string | undefined,
  ): Promise<ObservedCompletion> {
    const profile = clientProfile(this.config, 'playground-standard');
    const parsed = callbackSchema.safeParse(query);
    if (!parsed.success) {
      const candidate = z
        .object({ state: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
        .safeParse(query);
      if (candidate.success) {
        this.store.standard.rejectOwnedCallback(
          candidate.data.state,
          contextId,
          binding,
          'malformed-callback',
        );
      }
      throw new AuthorizationError(
        { status: 400, code: 'malformedRequest' },
        'Invalid OAuth callback. Start a fresh login.',
      );
    }
    const callback = parsed.data;
    if (callback.iss !== undefined && callback.iss !== profile.issuer) {
      this.store.standard.rejectOwnedCallback(
        callback.state,
        contextId,
        binding,
        'issuer-mismatch',
      );
      throw new AuthorizationError({ status: 403, code: 'invalAuth' }, 'Callback issuer mismatch.');
    }
    const consumed = this.store.standard.consume(callback.state, contextId, binding);
    let trace: ObservationReservation;
    try {
      trace = this.store.standard.reserve(consumed.context, consumed.attempt.runId, 7);
    } catch (error) {
      this.store.standard.fail(consumed.attempt);
      throw error;
    }
    let handedToController = false;
    let exchangeAttempted = false;
    let validationStarted = false;
    let validationSucceeded = false;
    const observe = (observation: ProtocolObservation) =>
      this.store.standard.observe(
        consumed.attempt.runId,
        consumed.context.ownerId,
        observation,
        trace,
      );
    try {
      if (
        !observe({
          kind: 'callback-accepted',
          channel: 'front-channel',
          sourceActorId: 'browser',
          targetActorId: 'bff',
          outcome: 'accepted',
          evidence: {
            correlation: 'matched',
            response: callback.code === undefined ? 'provider-error' : 'code',
          },
        })
      ) {
        throw new Error('Protocol observations unavailable');
      }
      if (callback.code === undefined) {
        observe({
          kind: 'callback-rejected',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'rejected',
          evidence: { reason: 'provider-denied' },
        });
        const context = this.store.standard.fail(consumed.attempt, 'provider-denied');
        if (!context) {
          return this.staleCallback();
        }
        handedToController = true;
        return { context, trace };
      }
      if (
        !observe({
          kind: 'token-exchange-started',
          channel: 'back-channel',
          sourceActorId: 'bff',
          targetActorId: 'authorization-server',
          outcome: 'pending',
          evidence: { grantType: 'authorization_code', pkceMethod: 'S256' },
        })
      ) {
        throw new Error('Protocol observations unavailable');
      }
      exchangeAttempted = true;
      const login = await this.tokens.exchange(
        consumed.authorization.metadata,
        consumed.authorization.transaction,
        callback.code,
        'playground-standard',
        (observation) => {
          if (observation === 'response-received') {
            observe({
              kind: 'token-response-received',
              channel: 'back-channel',
              sourceActorId: 'authorization-server',
              targetActorId: 'bff',
              outcome: 'received',
              evidence: { httpStatus: 200 },
            });
          } else if (observation === 'validation-started') {
            validationStarted = true;
            observe({
              kind: 'token-validation-started',
              channel: 'actor-local',
              actorId: 'bff',
              outcome: 'pending',
              evidence: { tokenPurpose: 'id-token' },
            });
          } else if (observation === 'validation-succeeded') {
            validationSucceeded = true;
            observe({
              kind: 'token-validation-succeeded',
              channel: 'actor-local',
              actorId: 'bff',
              outcome: 'accepted',
              evidence: { tokenPurpose: 'id-token' },
            });
          }
        },
      );
      const context = this.store.standard.commit(consumed.attempt, login, trace);
      handedToController = true;
      return { context, trace };
    } catch (error) {
      if (validationSucceeded) {
        observe({
          kind: 'callback-rejected',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'rejected',
          evidence: { reason: 'context-ineligible' },
        });
      } else if (validationStarted) {
        observe({
          kind: 'token-validation-failed',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'rejected',
          evidence: { reason: 'oidc-validation-failed' },
        });
      } else if (exchangeAttempted) {
        const reason = exchangeFailureReason(error);
        observe({
          kind: 'token-exchange-failed',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'failed',
          evidence: {
            reason,
            ...(error instanceof OidcUpstreamError && error.upstreamStatus !== undefined
              ? { httpStatus: error.upstreamStatus }
              : {}),
          },
        });
      }
      const context = this.store.standard.fail(consumed.attempt);
      if (!context) {
        return this.staleCallback();
      }
      handedToController = true;
      return { context, trace };
    } finally {
      if (!handedToController) {
        this.store.standard.release(trace);
      }
    }
  }

  events(contextId: string | undefined, runId: string) {
    clientProfile(this.config, 'playground-standard');
    return this.store.standard.events(contextId, runId);
  }

  async resource(contextId: string | undefined) {
    clientProfile(this.config, 'playground-standard');
    const state = this.store.standard;
    const context = state.context(contextId);
    const authentication = context?.authentication;
    const reject = (reason: 'authentication-required' | 'session-no-longer-active') => ({
      status: 401 as const,
      body: { outcome: 'rejected' as const, reason },
    });
    if (!context || !authentication || authentication.profileId !== 'playground-standard') {
      if (context?.currentRunId) {
        state.observe(context.currentRunId, context.ownerId, {
          kind: 'resource-rejected',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'rejected',
          evidence: {
            operation: demoReadOperation,
            httpStatus: 401,
            reason: 'authentication-required',
          },
        });
      }
      return reject('authentication-required');
    }
    // Resource work belongs to the login that supplied these credentials, including during a later pending retry.
    const runId = authentication.runId;
    const trace = state.reserve(context, runId, 3);
    const observe = (observation: ProtocolObservation) =>
      state.observe(runId, context.ownerId, observation, trace);
    try {
      if (
        !observe({
          kind: 'resource-requested',
          channel: 'back-channel',
          sourceActorId: 'bff',
          targetActorId: 'resource-server',
          outcome: 'pending',
          evidence: { operation: demoReadOperation, method: 'GET' },
        })
      ) {
        throw new AuthorizationError(
          { status: 503, code: 'internalError' },
          'Protocol observations are unavailable.',
        );
      }
      const result = await readStandardResource(
        this.config,
        authentication.tokens.access_token,
        (httpStatus, resourceServerReport) => {
          observe({
            kind: 'resource-response-received',
            channel: 'back-channel',
            sourceActorId: 'resource-server',
            targetActorId: 'bff',
            outcome: 'received',
            evidence: { operation: demoReadOperation, httpStatus, resourceServerReport },
          });
        },
      );
      if (!state.authenticationCurrent(context, authentication)) {
        observe({
          kind: 'resource-rejected',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'rejected',
          evidence: {
            operation: demoReadOperation,
            httpStatus: 401,
            reason: 'session-no-longer-active',
          },
        });
        return reject('session-no-longer-active');
      }
      if (result.kind === 'allowed') {
        observe({
          kind: 'resource-allowed',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'allowed',
          evidence: { operation: demoReadOperation, httpStatus: 200 },
        });
        return {
          status: 200 as const,
          body: {
            outcome: 'allowed' as const,
            runId,
            resource: result.resource,
            resourceServerReport: result.report,
          },
        };
      }
      if (result.kind === 'denied') {
        observe({
          kind: 'resource-denied',
          channel: 'actor-local',
          actorId: 'bff',
          outcome: 'denied',
          evidence: { operation: demoReadOperation, httpStatus: result.status },
        });
        return {
          status: result.status,
          body: { outcome: 'denied' as const, runId, resourceServerReport: result.report },
        };
      }
      observe({
        kind: 'resource-failed',
        channel: 'actor-local',
        actorId: 'bff',
        outcome: 'failed',
        evidence: { operation: demoReadOperation, reason: result.reason },
      });
      return {
        status: result.reason === 'timeout' ? 504 : 502,
        body: { outcome: 'unavailable' as const, runId, reason: result.reason },
      };
    } finally {
      state.release(trace);
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
