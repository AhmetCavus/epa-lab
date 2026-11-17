import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  endOAuthSession,
  OAuthApiError,
  readOAuthEvents,
  readSelectedOAuthResource,
  readOAuthSession,
} from '../data/oauth-api';
import type { OAuthApiFailure } from '../data/oauth-api';
import type { OAuthEventDocument, OAuthSession } from '../data/oauth-contract';
import { lastResourceOutcome, projectOAuthEvent } from '../data/oauth-presentation';
import {
  syntheticResource,
  type ResourceReadResult,
  type ResourceSelection,
} from '../domain/synthetic-resource';
import { presentSelectedResource } from '../data/synthetic-resource-presentation';
import type { ExecutionPhase } from '../domain/mission-experience';
import { describeOAuthExperience, ownsCurrentStandardSession } from './oauth-experience';

export function useOAuthMission(enabled: boolean) {
  const [phase, setPhase] = useState<ExecutionPhase>('restoring');
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [document, setDocument] = useState<OAuthEventDocument | null>(null);
  const [problem, setProblem] = useState<OAuthApiFailure | null>(null);
  const [traceProblem, setTraceProblem] = useState(false);
  const [resourceOutcome, setResourceOutcome] = useState<string | undefined>();
  const [resourceResult, setResourceResult] = useState<ResourceReadResult | null>(null);
  const [resourceRetryAt, setResourceRetryAt] = useState(0);
  const retryAtRef = useRef(0);
  const sessionRef = useRef<OAuthSession | null>(null);
  const documentRef = useRef<OAuthEventDocument | null>(null);
  const operationRef = useRef<AbortController | null>(null);
  const phaseRef = useRef<ExecutionPhase>('restoring');

  const isCurrent = useCallback(
    (operation: AbortController) => operationRef.current === operation && !operation.signal.aborted,
    [],
  );

  const begin = useCallback((nextPhase: ExecutionPhase) => {
    operationRef.current?.abort();
    const operation = new AbortController();
    operationRef.current = operation;
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
    setProblem(null);
    return operation;
  }, []);

  const replaceDocument = useCallback((next: OAuthEventDocument | null) => {
    documentRef.current = next;
    setDocument(next);
  }, []);

  const finish = useCallback(
    (operation: AbortController) => {
      if (isCurrent(operation)) {
        phaseRef.current = 'ready';
        setPhase('ready');
      }
    },
    [isCurrent],
  );

  const failed = useCallback(
    (error: unknown, operation: AbortController) => {
      if (!isCurrent(operation)) {
        return;
      }
      setResourceResult(null);
      sessionRef.current = null;
      setSession(null);
      replaceDocument(null);
      setTraceProblem(true);
      setProblem(error instanceof OAuthApiError ? error.reason : 'unavailable');
    },
    [isCurrent, replaceDocument],
  );

  const acceptSession = useCallback(
    async (next: OAuthSession, operation: AbortController, retainEligibleHistory = false) => {
      if (!isCurrent(operation)) {
        return;
      }
      const previousSession = sessionRef.current;
      if (
        !ownsCurrentStandardSession(next) ||
        previousSession?.currentRun?.runId !== next.currentRun?.runId ||
        previousSession?.expiresAt !== next.expiresAt
      ) {
        setResourceResult(null);
        setResourceOutcome(undefined);
        retryAtRef.current = 0;
        setResourceRetryAt(0);
      }
      // Commit authoritative session state before trying to read teaching history.
      // A failed event read can never undo a successful local logout.
      sessionRef.current = next;
      setSession(next);
      setTraceProblem(false);
      const run = next.currentRun;
      if (!run || Date.parse(run.expiresAt) <= Date.now()) {
        replaceDocument(null);
        return;
      }
      const prior = documentRef.current;
      if (prior && (prior.runId !== run.runId || prior.expiresAt !== run.expiresAt)) {
        replaceDocument(null);
      }
      // Session availability does not wait for optional teaching-history retrieval.
      if (phaseRef.current !== 'navigating') {
        finish(operation);
      }
      try {
        const history = await readOAuthEvents(run.runId, operation.signal);
        if (history.expiresAt !== run.expiresAt) {
          throw new OAuthApiError('unsupported-response');
        }
        if (isCurrent(operation)) {
          replaceDocument({ ...history, complete: history.complete && run.observationsAvailable });
        }
      } catch {
        if (!isCurrent(operation)) {
          return;
        }
        setTraceProblem(true);
        const prior = documentRef.current;
        const eligible =
          retainEligibleHistory && prior?.runId === run.runId && prior.expiresAt === run.expiresAt;
        replaceDocument(eligible ? { ...prior, complete: false } : null);
      }
    },
    [finish, isCurrent, replaceDocument],
  );

  const restore = useCallback(async () => {
    if (!enabled) {
      return;
    }
    const operation = begin('restoring');
    setResourceResult(null);
    setResourceOutcome(undefined);
    try {
      await acceptSession(await readOAuthSession(operation.signal), operation);
    } catch (error) {
      failed(error, operation);
    } finally {
      finish(operation);
    }
  }, [acceptSession, begin, enabled, failed, finish]);

  useEffect(() => {
    if (enabled) {
      void restore();
    }
    return () => {
      operationRef.current?.abort();
      operationRef.current = null;
    };
  }, [enabled, restore]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const returnToView = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void restore();
      }
    };
    const cancelledNavigation = () => {
      if (window.document.visibilityState === 'visible' && phaseRef.current === 'navigating') {
        void restore();
      }
    };
    window.addEventListener('pageshow', returnToView);
    window.document.addEventListener('visibilitychange', cancelledNavigation);
    return () => {
      window.removeEventListener('pageshow', returnToView);
      window.document.removeEventListener('visibilitychange', cancelledNavigation);
    };
  }, [enabled, restore]);

  useEffect(() => {
    if (!enabled || phase !== 'ready') {
      return;
    }
    const deadlines = [session?.expiresAt, session?.currentRun?.expiresAt]
      .filter((value): value is string => Boolean(value))
      .map(Date.parse)
      .filter((value) => value > Date.now());
    if (deadlines.length === 0) {
      return;
    }
    const timer = setTimeout(() => void restore(), Math.min(...deadlines) - Date.now() + 5);
    return () => clearTimeout(timer);
  }, [enabled, phase, session?.expiresAt, session?.currentRun?.expiresAt, restore]);

  function start() {
    if (!enabled || phaseRef.current !== 'ready') {
      return;
    }
    const operation = begin('navigating');
    setResourceResult(null);
    try {
      window.location.assign('/api/oauth/login');
    } catch (error) {
      failed(error, operation);
      finish(operation);
    }
  }

  useEffect(() => {
    if (resourceRetryAt <= Date.now()) return;
    const timer = setTimeout(() => {
      retryAtRef.current = 0;
      setResourceRetryAt(0);
    }, resourceRetryAt - Date.now());
    return () => clearTimeout(timer);
  }, [resourceRetryAt]);

  async function accessResource(selection: ResourceSelection = syntheticResource) {
    if (
      phaseRef.current !== 'ready' ||
      !ownsCurrentStandardSession(sessionRef.current) ||
      retryAtRef.current > Date.now()
    )
      return;
    const owningRun = sessionRef.current?.currentRun?.runId;
    const operation = begin('resource');
    setResourceResult(null);
    setResourceOutcome(undefined);
    try {
      const response = await readSelectedOAuthResource(selection, operation.signal);
      if (!isCurrent(operation)) return;
      if ('runId' in response.result && response.result.runId !== owningRun)
        throw new OAuthApiError('unsupported-response');
      const next = await readOAuthSession(operation.signal);
      if (!isCurrent(operation)) return;
      const history = acceptSession(next, operation);
      const stillOwned = ownsCurrentStandardSession(next) && next.currentRun?.runId === owningRun;
      if (stillOwned || response.result.outcome === 'rejected') {
        const result = presentSelectedResource(response);
        setResourceResult(result);
        setResourceOutcome(
          result.outcome === 'allowed' ? 'mission:runtime.resource.allowed' : result.messageKey,
        );
        if (result.outcome === 'throttled' && result.retryAfterSeconds) {
          const deadline = Date.now() + result.retryAfterSeconds * 1000;
          retryAtRef.current = deadline;
          setResourceRetryAt(deadline);
        }
      }
      await history;
    } catch (error) {
      if (isCurrent(operation)) {
        const reason = error instanceof OAuthApiError ? error.reason : 'unavailable';
        setProblem(reason);
        setResourceOutcome('mission:runtime.resource.unavailable');
        try {
          const next = await readOAuthSession(operation.signal);
          const history = acceptSession(next, operation);
          if (
            isCurrent(operation) &&
            ownsCurrentStandardSession(next) &&
            next.currentRun?.runId === owningRun
          ) {
            setResourceResult({
              outcome: 'unavailable',
              status: null,
              source: 'unavailable',
              messageKey: `mission:runtime.errors.${reason}`,
            });
          }
          await history;
        } catch (restoreError) {
          failed(restoreError, operation);
        }
      }
    } finally {
      finish(operation);
    }
  }

  async function signOut() {
    const currentSession = sessionRef.current;
    if (!currentSession || !['ready', 'resource'].includes(phaseRef.current)) {
      return;
    }
    // Starting logout cancels the UI's resource read; late results cannot commit to this view.
    const operation = begin('logout');
    setResourceResult(null);
    retryAtRef.current = 0;
    setResourceRetryAt(0);
    setResourceOutcome(undefined);
    try {
      const signedOut = await endOAuthSession(currentSession.csrfToken, operation.signal);
      await acceptSession(signedOut, operation, true);
    } catch (error) {
      failed(error, operation);
    } finally {
      finish(operation);
    }
  }

  const events = useMemo(() => document?.events.map(projectOAuthEvent) ?? [], [document]);
  if (!enabled) {
    return undefined;
  }
  const active =
    session?.authenticated === true &&
    session.expiresAt !== null &&
    Date.parse(session.expiresAt) > Date.now();
  const pending = session?.currentRun?.outcome === 'pending';
  const resourceReady = ownsCurrentStandardSession(session);
  const resourceKey = resourceReady
    ? (resourceOutcome ?? lastResourceOutcome(document?.events ?? []))
    : undefined;
  const experience = describeOAuthExperience({
    session,
    document,
    phase,
    problem,
    traceProblem,
    resourceOutcome,
  });
  let authenticationKey = 'mission:runtime.authentication.unavailable';
  if (session) {
    authenticationKey = active
      ? 'mission:runtime.authentication.authenticated'
      : 'mission:runtime.authentication.anonymous';
    if (!active && (session.authenticated || session.currentRun?.outcome === 'expired')) {
      authenticationKey = 'mission:runtime.authentication.expired';
    }
  }
  const messages = [
    authenticationKey,
    ...(session?.currentRun
      ? [`mission:runtime.run.${session.currentRun.outcome}`]
      : ['mission:runtime.run.none']),
    ...(resourceKey ? [resourceKey] : []),
    ...(problem ? [`mission:runtime.errors.${problem}`] : []),
    ...(traceProblem || document?.complete === false ? ['mission:runtime.traceUnavailable'] : []),
  ];
  const actions = [
    {
      id: 'start',
      labelKey: session?.currentRun
        ? 'mission:runtime.actions.retry'
        : 'mission:runtime.actions.start',
      disabled: phase !== 'ready',
      primary: experience.primaryAction === 'start',
      invoke: start,
    },
    {
      id: 'resource',
      labelKey: 'mission:runtime.actions.resource',
      disabled: phase !== 'ready' || !resourceReady || resourceRetryAt > Date.now(),
      primary: experience.primaryAction === 'resource',
      invoke: () => void accessResource(),
    },
    {
      id: 'restore',
      labelKey: 'mission:runtime.actions.restore',
      disabled: phase !== 'ready',
      primary: false,
      invoke: () => void restore(),
    },
    ...(active || pending
      ? [
          {
            id: 'logout',
            labelKey: active ? 'mission:runtime.actions.logout' : 'mission:runtime.actions.cancel',
            disabled: !['ready', 'resource'].includes(phase),
            primary: false,
            invoke: () => void signOut(),
          },
        ]
      : []),
  ];
  return {
    events,
    experience,
    resourceMessageKey: resourceKey,
    resourceResult,
    fetchResource: (selection: ResourceSelection) => void accessResource(selection),
    problemKey: problem ? `mission:runtime.errors.${problem}` : undefined,
    channels: [
      { kind: 'front', labelKey: 'protocol-flow:channels.front' },
      { kind: 'back', labelKey: 'protocol-flow:channels.back' },
      { kind: 'internal', labelKey: 'protocol-flow:channels.local' },
    ] as const,
    phase,
    stateKey: `mission:runtime.phases.${phase}`,
    noticeKey: 'mission:runtime.notice',
    subtitleKey: 'mission:runtime.subtitle',
    messages,
    actions,
    runId: document?.runId ?? session?.currentRun?.runId,
    runExpiresAt: document?.expiresAt ?? session?.currentRun?.expiresAt,
  };
}
