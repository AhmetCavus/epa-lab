import type { SimulatedEvent, SimulationRecord } from '../../protocol-flow/contracts';
import {
  oauthSimulationSteps,
  type OAuthSimulationState,
  type OAuthSimulationStep,
} from '../domain/oauth-simulation';
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

const interactions: Record<OAuthSimulationStep, Interaction> = {
  authorization: { kind: 'internal', actorId: 'bff', channel: local },
  redirect: { kind: 'message', sourceActorId: 'bff', targetActorId: 'browser', channel: front },
  'authorization-request': {
    kind: 'message',
    sourceActorId: 'browser',
    targetActorId: 'authorization-server',
    channel: front,
  },
  identity: { kind: 'internal', actorId: 'identity-provider', channel: local },
  callback: { kind: 'message', sourceActorId: 'browser', targetActorId: 'bff', channel: front },
  exchange: {
    kind: 'message',
    sourceActorId: 'bff',
    targetActorId: 'authorization-server',
    channel: back,
  },
  'token-response': {
    kind: 'message',
    sourceActorId: 'authorization-server',
    targetActorId: 'bff',
    channel: back,
  },
  validation: { kind: 'internal', actorId: 'bff', channel: local },
  session: { kind: 'internal', actorId: 'bff', channel: local },
  'pkce-rejected': {
    kind: 'message',
    sourceActorId: 'authorization-server',
    targetActorId: 'bff',
    channel: back,
  },
  'resource-request': {
    kind: 'message',
    sourceActorId: 'bff',
    targetActorId: 'resource-server',
    channel: back,
  },
  'resource-allowed': {
    kind: 'message',
    sourceActorId: 'resource-server',
    targetActorId: 'bff',
    channel: back,
  },
  'resource-denied': {
    kind: 'message',
    sourceActorId: 'resource-server',
    targetActorId: 'bff',
    channel: back,
  },
};

function stepOutcome(step: OAuthSimulationStep): SimulationRecord['outcome'] {
  if (step === 'pkce-rejected') {
    return 'rejected';
  }
  if (step === 'resource-denied') {
    return 'denied';
  }
  if (step === 'resource-allowed') {
    return 'allowed';
  }
  if (step === 'session') {
    return 'established';
  }
  if (['authorization', 'authorization-request', 'exchange', 'resource-request'].includes(step)) {
    return 'pending';
  }
  return 'succeeded';
}

export function presentOAuthSimulation(state: OAuthSimulationState): readonly SimulatedEvent[] {
  const traceId = `simulation:oauth:${state.attempt}`;
  return oauthSimulationSteps(state).map((step, index) => {
    const outcome = stepOutcome(step);
    const key = `mission:simulation.oauth.events.${step}`;
    return parseSimulationEvent({
      ...interactions[step],
      id: `${traceId}:${step}`,
      visibility: 'simulated',
      titleKey: `${key}.title`,
      summaryKey: `${key}.summary`,
      explanationKey: `${key}.explanation`,
      evidence:
        step === 'authorization'
          ? [
              {
                labelKey: 'mission:simulation.fields.pkce',
                value: { kind: 'literal', value: 'S256' },
              },
            ]
          : [],
      simulation: {
        traceId,
        sequence: index + 1,
        elapsedMs: index * 800,
        outcome,
        outcomeKey: `protocol-flow:simulation.outcomes.${outcome}`,
        conceptual: false,
      },
    });
  });
}

export function oauthSimulatedResource(
  state: OAuthSimulationState,
): SimulatedResourceResult | null {
  if (state.phase === 'denied') {
    return {
      source: 'simulated',
      status: 403,
      outcome: 'denied',
      messageKey: 'mission:simulation.resourceDenied',
    };
  }
  if (state.phase !== 'complete') {
    return null;
  }
  return {
    source: 'simulated',
    status: 200,
    outcome: 'allowed',
    messageKey: 'mission:simulation.resourceAllowed',
    resource: {
      resourceType: 'Basic',
      id: 'playground-demo',
      code: {
        coding: [
          {
            system: 'https://example.invalid/playground/demo',
            code: 'oauth-learning-demo',
            display: 'Fictional protocol learning resource',
          },
        ],
        text: 'Synthetic non-clinical OAuth demonstration; no patient data',
      },
    },
  };
}
