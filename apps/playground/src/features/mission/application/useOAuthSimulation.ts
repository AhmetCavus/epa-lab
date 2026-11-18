import { useCallback, useMemo, useReducer } from 'react';
import {
  initialOAuthSimulation,
  isOAuthScenario,
  reduceOAuthSimulation,
} from '../domain/oauth-simulation';
import type { MissionStage, SimulationExperience } from '../domain/mission-experience';
import { syntheticResource, type ResourceSelection } from '../domain/synthetic-resource';
import { oauthSimulatedResource, presentOAuthSimulation } from '../data/oauth-simulation';
import { oauthParticipants } from './oauth-experience';

export function useOAuthSimulation() {
  const [state, dispatch] = useReducer(reduceOAuthSimulation, 1, initialOAuthSimulation);
  const events = useMemo(() => presentOAuthSimulation(state), [state]);
  const advance = useCallback(
    () => dispatch({ type: 'step', attempt: state.attempt }),
    [state.attempt],
  );
  const fetchResource = useCallback(
    (selection: ResourceSelection) => {
      if (
        selection.resourceType === syntheticResource.resourceType &&
        selection.resourceId === syntheticResource.resourceId
      ) {
        dispatch({ type: 'resource', attempt: state.attempt });
      }
    },
    [state.attempt],
  );
  const sessionEstablished = ['session', 'complete', 'denied'].includes(state.phase);
  const identityExplained = state.revealed >= 5;
  let primaryAction: SimulationExperience['primaryAction'] = null;
  if (state.phase === 'idle') {
    primaryAction = 'start';
  } else if (state.phase === 'authorizing') {
    primaryAction = 'advance';
  } else if (state.phase === 'session') {
    primaryAction = 'resource';
  }
  let tone: SimulationExperience['tone'] = 'neutral';
  if (sessionEstablished) {
    tone = 'success';
  }
  if (state.phase === 'failed' || state.phase === 'denied') {
    tone = 'warning';
  }
  let sessionOutcome: MissionStage['outcome'] = 'pending';
  if (state.phase === 'failed') {
    sessionOutcome = 'failed';
  } else if (sessionEstablished) {
    sessionOutcome = 'complete';
  } else if (identityExplained) {
    sessionOutcome = 'current';
  }
  let resourceOutcome: MissionStage['outcome'] = 'pending';
  if (state.phase === 'complete') {
    resourceOutcome = 'complete';
  } else if (state.phase === 'denied') {
    resourceOutcome = 'failed';
  } else if (sessionEstablished) {
    resourceOutcome = 'current';
  }
  const experience: SimulationExperience = {
    titleKey: `mission:simulation.states.${state.phase}.title`,
    descriptionKey: `mission:simulation.states.${state.phase}.description`,
    primaryAction,
    tone,
    simulatedSessionEstablished: sessionEstablished,
    participants: oauthParticipants,
    stages: [
      {
        id: 'authenticate',
        titleKey: 'mission:simulation.oauth.stages.authenticate.title',
        descriptionKey: 'mission:simulation.oauth.stages.authenticate.description',
        outcome: identityExplained ? 'complete' : 'current',
      },
      {
        id: 'session',
        titleKey: 'mission:simulation.oauth.stages.session.title',
        descriptionKey: 'mission:simulation.oauth.stages.session.description',
        outcome: sessionOutcome,
      },
      {
        id: 'resource',
        titleKey: 'mission:simulation.oauth.stages.resource.title',
        descriptionKey: 'mission:simulation.oauth.stages.resource.description',
        outcome: resourceOutcome,
      },
    ],
  };
  const actions = [
    {
      id: 'start',
      labelKey: 'mission:simulation.actions.start',
      disabled: state.phase !== 'idle',
      primary: primaryAction === 'start',
      invoke: () => dispatch({ type: 'start' }),
    },
    {
      id: 'advance',
      labelKey: 'mission:simulation.actions.advance',
      disabled: state.phase !== 'authorizing',
      primary: primaryAction === 'advance',
      invoke: advance,
    },
    {
      id: 'resource',
      labelKey: 'mission:simulation.actions.resource',
      disabled: state.phase !== 'session',
      primary: primaryAction === 'resource',
      invoke: () => fetchResource(syntheticResource),
    },
    {
      id: 'reset',
      labelKey: 'mission:simulation.actions.reset',
      disabled: state.phase === 'idle',
      primary: false,
      invoke: () => dispatch({ type: 'reset' }),
    },
  ];
  return {
    kind: 'simulation' as const,
    conceptual: false,
    events,
    experience,
    actions,
    state,
    chooseScenario(value: string) {
      if (isOAuthScenario(value)) {
        dispatch({ type: 'scenario', scenario: value });
      }
    },
    scenarios: [
      { id: 'success', labelKey: 'mission:simulation.scenarios.success' },
      { id: 'pkce-rejected', labelKey: 'mission:simulation.scenarios.pkceRejected' },
      { id: 'missing-permission', labelKey: 'mission:simulation.scenarios.missingPermission' },
    ],
    advance,
    canAdvance: state.phase === 'authorizing',
    phase: 'ready' as const,
    channels: [
      { kind: 'front', labelKey: 'protocol-flow:channels.front' },
      { kind: 'back', labelKey: 'protocol-flow:channels.back' },
      { kind: 'internal', labelKey: 'protocol-flow:channels.local' },
    ] as const,
    runId: `simulation:oauth:${state.attempt}`,
    runExpiresAt: undefined,
    resourceResult: oauthSimulatedResource(state),
    fetchResource,
    resourceMessageKey: undefined,
    problemKey: undefined,
    stateKey: experience.titleKey,
    subtitleKey: 'mission:execution.simulationNotice',
    noticeKey: 'mission:execution.simulationNotice',
    messages: [] as readonly string[],
  };
}

export type OAuthSimulation = ReturnType<typeof useOAuthSimulation>;
