import type { OAuthEventDocument, OAuthSession } from '../data/oauth-contract';
import { lastResourceOutcome } from '../data/oauth-presentation';
import type {
  ExecutionPhase,
  ExperienceStatus,
  MissionExperience,
  MissionStage,
} from '../domain/mission-experience';

interface ExperienceInput {
  readonly session: OAuthSession | null;
  readonly document: OAuthEventDocument | null;
  readonly phase: ExecutionPhase;
  readonly problem: string | null;
  readonly traceProblem: boolean;
  readonly resourceOutcome: string | undefined;
  readonly now?: number;
}

export const oauthParticipants: MissionExperience['participants'] = [
  {
    id: 'browser',
    actorIds: ['browser'],
    titleKey: 'mission:control.participants.browser.title',
    descriptionKey: 'mission:control.participants.browser.description',
    icon: 'browser',
  },
  {
    id: 'bff',
    actorIds: ['bff'],
    titleKey: 'mission:control.participants.bff.title',
    descriptionKey: 'mission:control.participants.bff.description',
    icon: 'server',
  },
  {
    id: 'keycloak',
    actorIds: ['authorization-server', 'identity-provider'],
    titleKey: 'mission:control.participants.provider.title',
    descriptionKey: 'mission:control.participants.provider.description',
    icon: 'key',
  },
  {
    id: 'resource-server',
    actorIds: ['resource-server'],
    titleKey: 'mission:control.participants.resource.title',
    descriptionKey: 'mission:control.participants.resource.description',
    icon: 'database',
  },
];

export function ownsCurrentStandardSession(
  session: OAuthSession | null,
  now = Date.now(),
): boolean {
  return Boolean(
    session?.authenticated &&
      session.expiresAt &&
      Date.parse(session.expiresAt) > now &&
      session.currentRun?.outcome === 'authenticated' &&
      Date.parse(session.currentRun.expiresAt) > now,
  );
}

export function describeOAuthExperience({
  session,
  document,
  phase,
  problem,
  traceProblem,
  resourceOutcome,
  now = Date.now(),
}: ExperienceInput): MissionExperience {
  const run = session?.currentRun;
  const sessionActive = Boolean(
    session?.authenticated && session.expiresAt && Date.parse(session.expiresAt) > now,
  );
  const currentRunAuthenticated = ownsCurrentStandardSession(session, now);
  const currentDocument =
    run && document?.runId === run.runId && document.expiresAt === run.expiresAt ? document : null;
  const events = currentDocument?.events ?? [];
  const resource = resourceOutcome ?? lastResourceOutcome(events);

  function status(): ExperienceStatus {
    if (phase !== 'ready') {
      return phase;
    }
    if (run?.outcome === 'pending') {
      return 'pending';
    }
    if (run?.outcome === 'signed-out') {
      return 'signed-out';
    }
    if (run?.outcome === 'expired' || (session?.authenticated && !sessionActive)) {
      return 'expired';
    }
    if (currentRunAuthenticated) {
      return 'authenticated';
    }
    if (
      problem ||
      !session ||
      ['provider-denied', 'authentication-failed', 'cancelled'].includes(run?.outcome ?? '')
    ) {
      return 'failed';
    }
    return 'anonymous';
  }

  const currentStatus = status();
  const busy = phase !== 'ready' || currentStatus === 'pending';
  let primaryAction: MissionExperience['primaryAction'] = null;
  if (!busy) {
    primaryAction = currentRunAuthenticated ? 'resource' : 'start';
  }

  const callbackAccepted = events.some(
    (event) => event.kind === 'callback-accepted' && event.evidence.response === 'code',
  );
  const sessionRecorded =
    events.some((event) => event.kind === 'token-validation-succeeded') &&
    events.some((event) => event.kind === 'session-established');
  const knownRunSuccess = run?.outcome === 'authenticated';
  let firstOutcome: MissionStage['outcome'] = 'current';
  if (callbackAccepted) {
    firstOutcome = 'complete';
  } else if (currentRunAuthenticated) {
    firstOutcome = 'unavailable';
  }
  let sessionOutcome: MissionStage['outcome'] = 'pending';
  if (currentStatus === 'failed') {
    sessionOutcome = 'failed';
  } else if (sessionRecorded && knownRunSuccess) {
    sessionOutcome = 'complete';
  } else if (currentRunAuthenticated) {
    sessionOutcome = 'unavailable';
  }
  let resourceStage: MissionStage['outcome'] = currentRunAuthenticated ? 'current' : 'pending';
  if (
    currentRunAuthenticated &&
    resource === 'mission:runtime.resource.allowed' &&
    phase !== 'resource'
  ) {
    resourceStage = 'complete';
  }

  let tone: MissionExperience['tone'] = 'neutral';
  if (currentRunAuthenticated) {
    tone = 'success';
  } else if (['expired', 'failed'].includes(currentStatus)) {
    tone = 'warning';
  }

  return {
    status: currentStatus,
    titleKey: `mission:control.states.${currentStatus}.title`,
    descriptionKey: `mission:control.states.${currentStatus}.description`,
    tone,
    primaryAction,
    sessionActive,
    currentRunAuthenticated,
    hasRetainedAuthentication: sessionActive && !currentRunAuthenticated,
    evidenceIncomplete: Boolean(
      run && (traceProblem || !currentDocument?.complete || !run.observationsAvailable),
    ),
    participants: oauthParticipants,
    stages: [
      {
        id: 'authenticate',
        titleKey: 'mission:control.stages.authenticate.title',
        descriptionKey: 'mission:control.stages.authenticate.description',
        outcome: firstOutcome,
      },
      {
        id: 'session',
        titleKey: 'mission:control.stages.session.title',
        descriptionKey: 'mission:control.stages.session.description',
        outcome: sessionOutcome,
      },
      {
        id: 'resource',
        titleKey: 'mission:control.stages.resource.title',
        descriptionKey: 'mission:control.stages.resource.description',
        outcome: resourceStage,
      },
    ],
  };
}
