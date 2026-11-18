import type { SimulatedEvent, SimulationRecord } from '../../protocol-flow/contracts';
import {
  epaSimulationSteps,
  type EpaSimulationState,
  type EpaSimulationStep,
} from '../domain/epa-simulation';
import type { SimulatedResourceResult } from '../domain/synthetic-resource';
import { parseSimulationEvent } from './simulation-contract';

type Interaction =
  | Pick<
      Extract<SimulatedEvent, { kind: 'message' }>,
      'kind' | 'sourceActorId' | 'targetActorId' | 'channel'
    >
  | Pick<Extract<SimulatedEvent, { kind: 'internal' }>, 'kind' | 'actorId' | 'channel'>;
const front = { kind: 'front', labelKey: 'protocol-flow:channels.front' } as const;
const back = { kind: 'back', labelKey: 'protocol-flow:channels.back' } as const;
const local = { kind: 'internal', labelKey: 'protocol-flow:simulation.local' } as const;
const interactions: Record<EpaSimulationStep, Interaction> = {
  intent: { kind: 'internal', actorId: 'insured-person', channel: local },
  'fdv-request': {
    kind: 'message',
    sourceActorId: 'fdv',
    targetActorId: 'epa-authorization',
    channel: front,
  },
  par: {
    kind: 'message',
    sourceActorId: 'epa-authorization',
    targetActorId: 'sectoral-idp',
    channel: back,
  },
  'par-reference': {
    kind: 'message',
    sourceActorId: 'sectoral-idp',
    targetActorId: 'epa-authorization',
    channel: back,
  },
  redirect: {
    kind: 'message',
    sourceActorId: 'epa-authorization',
    targetActorId: 'fdv',
    channel: front,
  },
  'identity-navigation': {
    kind: 'message',
    sourceActorId: 'fdv',
    targetActorId: 'sectoral-idp',
    channel: front,
  },
  'identity-boundary': { kind: 'internal', actorId: 'sectoral-idp', channel: local },
  'authorization-boundary': { kind: 'internal', actorId: 'epa-authorization', channel: local },
  'par-rejected': {
    kind: 'message',
    sourceActorId: 'sectoral-idp',
    targetActorId: 'epa-authorization',
    channel: back,
  },
  'protected-intent': { kind: 'internal', actorId: 'fdv', channel: local },
  'protected-boundary': { kind: 'internal', actorId: 'vau', channel: local },
};

function outcomeFor(step: EpaSimulationStep): SimulationRecord['outcome'] {
  if (step === 'par-rejected') {
    return 'rejected';
  }
  if (step === 'authorization-boundary') {
    return 'established';
  }
  if (['fdv-request', 'par', 'protected-intent'].includes(step)) {
    return 'pending';
  }
  return 'succeeded';
}

export function presentEpaSimulation(state: EpaSimulationState): readonly SimulatedEvent[] {
  const traceId = `simulation:epa:${state.attempt}`;
  return epaSimulationSteps(state).map((step, index) => {
    const outcome = outcomeFor(step);
    const key = `mission:simulation.epa.events.${step}`;
    return parseSimulationEvent({
      ...interactions[step],
      id: `${traceId}:${step}`,
      visibility: 'simulated',
      titleKey: `${key}.title`,
      summaryKey: `${key}.summary`,
      explanationKey: `${key}.explanation`,
      evidence:
        step === 'par'
          ? [
              {
                labelKey: 'mission:simulation.fields.operation',
                value: { kind: 'literal', value: 'PAR' },
              },
            ]
          : [],
      simulation: {
        traceId,
        sequence: index + 1,
        elapsedMs: index * 800,
        outcome,
        outcomeKey: `protocol-flow:simulation.outcomes.${outcome}`,
        conceptual: true,
      },
    });
  });
}

export function epaConceptualResult(state: EpaSimulationState): SimulatedResourceResult | null {
  if (state.phase !== 'complete') {
    return null;
  }
  return {
    source: 'simulated',
    status: null,
    outcome: 'conceptual',
    messageKey: 'mission:simulation.epa.protectedResult',
  };
}
