import { useCallback, useMemo, useReducer } from 'react';
import { initialEpaSimulation, isEpaScenario, reduceEpaSimulation } from '../domain/epa-simulation';
import type { MissionStage, SimulationExperience } from '../domain/mission-experience';
import { epaConceptualResult, presentEpaSimulation } from '../data/epa-simulation';

const participants: SimulationExperience['participants'] = [
  {
    id: 'person',
    actorIds: ['insured-person'],
    titleKey: 'mission:definitions.epa.actors.insured-person.label',
    descriptionKey: 'mission:definitions.epa.actors.insured-person.role',
    icon: 'browser',
  },
  {
    id: 'fdv',
    actorIds: ['fdv'],
    titleKey: 'mission:definitions.epa.actors.fdv.label',
    descriptionKey: 'mission:definitions.epa.actors.fdv.role',
    icon: 'browser',
  },
  {
    id: 'authorization',
    actorIds: ['epa-authorization'],
    titleKey: 'mission:definitions.epa.actors.epa-authorization.label',
    descriptionKey: 'mission:simulation.epa.clientRole',
    icon: 'server',
  },
  {
    id: 'idp',
    actorIds: ['sectoral-idp'],
    titleKey: 'mission:definitions.epa.actors.sectoral-idp.label',
    descriptionKey: 'mission:simulation.epa.providerRole',
    icon: 'key',
  },
  {
    id: 'protected',
    actorIds: ['vau'],
    titleKey: 'mission:definitions.epa.actors.vau.label',
    descriptionKey: 'mission:simulation.epa.protectedRole',
    icon: 'database',
  },
];

export function useEpaSimulation() {
  const [state, dispatch] = useReducer(reduceEpaSimulation, 1, initialEpaSimulation);
  const events = useMemo(() => presentEpaSimulation(state), [state]);
  const advance = useCallback(
    () => dispatch({ type: 'step', attempt: state.attempt }),
    [state.attempt],
  );
  const fetchResource = useCallback(
    () => dispatch({ type: 'resource', attempt: state.attempt }),
    [state.attempt],
  );
  const established = state.phase === 'session' || state.phase === 'complete';
  let primaryAction: SimulationExperience['primaryAction'] = null;
  if (state.phase === 'idle') {
    primaryAction = 'start';
  } else if (state.phase === 'authorizing') {
    primaryAction = 'advance';
  } else if (state.phase === 'session') {
    primaryAction = 'resource';
  }
  let boundaryOutcome: MissionStage['outcome'] = 'pending';
  if (state.phase === 'failed') {
    boundaryOutcome = 'failed';
  } else if (established) {
    boundaryOutcome = 'complete';
  } else if (state.revealed >= 4) {
    boundaryOutcome = 'current';
  }
  let tone: SimulationExperience['tone'] = 'neutral';
  if (established) {
    tone = 'success';
  } else if (state.phase === 'failed') {
    tone = 'warning';
  }
  const experience: SimulationExperience = {
    titleKey: `mission:simulation.epa.states.${state.phase}.title`,
    descriptionKey: `mission:simulation.epa.states.${state.phase}.description`,
    primaryAction,
    tone,
    simulatedSessionEstablished: established,
    participants,
    stages: [
      {
        id: 'par',
        titleKey: 'mission:simulation.epa.stages.par.title',
        descriptionKey: 'mission:simulation.epa.stages.par.description',
        outcome: state.revealed >= 4 && state.phase !== 'failed' ? 'complete' : 'current',
      },
      {
        id: 'identity',
        titleKey: 'mission:simulation.epa.stages.identity.title',
        descriptionKey: 'mission:simulation.epa.stages.identity.description',
        outcome: boundaryOutcome,
      },
      {
        id: 'protected',
        titleKey: 'mission:simulation.epa.stages.protected.title',
        descriptionKey: 'mission:simulation.epa.stages.protected.description',
        outcome: state.phase === 'complete' ? 'complete' : 'pending',
      },
    ],
  };
  return {
    kind: 'simulation' as const,
    conceptual: true,
    events,
    experience,
    state,
    actions: [
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
        labelKey: 'mission:simulation.epa.protectedAction',
        disabled: state.phase !== 'session',
        primary: primaryAction === 'resource',
        invoke: fetchResource,
      },
      {
        id: 'reset',
        labelKey: 'mission:simulation.actions.reset',
        disabled: state.phase === 'idle',
        primary: false,
        invoke: () => dispatch({ type: 'reset' }),
      },
    ],
    chooseScenario(value: string) {
      if (isEpaScenario(value)) {
        dispatch({ type: 'scenario', scenario: value });
      }
    },
    scenarios: [
      { id: 'success', labelKey: 'mission:simulation.epa.scenarios.success' },
      { id: 'par-rejected', labelKey: 'mission:simulation.epa.scenarios.parRejected' },
    ],
    advance,
    canAdvance: state.phase === 'authorizing',
    phase: 'ready' as const,
    channels: [
      { kind: 'front', labelKey: 'protocol-flow:channels.front' },
      { kind: 'back', labelKey: 'protocol-flow:channels.back' },
      { kind: 'internal', labelKey: 'protocol-flow:channels.local' },
    ] as const,
    runId: `simulation:epa:${state.attempt}`,
    runExpiresAt: undefined,
    resourceResult: epaConceptualResult(state),
    fetchResource,
    resourceMessageKey: undefined,
    problemKey: undefined,
    stateKey: experience.titleKey,
    subtitleKey: 'mission:execution.conceptualNotice',
    noticeKey: 'mission:execution.conceptualNotice',
    messages: [] as readonly string[],
  };
}
export type EpaSimulation = ReturnType<typeof useEpaSimulation>;
