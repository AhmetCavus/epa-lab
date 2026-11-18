export type OAuthSimulationScenario = 'success' | 'pkce-rejected' | 'missing-permission';
export type OAuthSimulationPhase =
  | 'idle'
  | 'authorizing'
  | 'session'
  | 'complete'
  | 'failed'
  | 'denied';

export interface OAuthSimulationState {
  readonly kind: 'oauth';
  readonly attempt: number;
  readonly scenario: OAuthSimulationScenario;
  readonly phase: OAuthSimulationPhase;
  readonly revealed: number;
}

export type OAuthSimulationCommand =
  | { readonly type: 'start' | 'reset' }
  | { readonly type: 'step' | 'resource'; readonly attempt: number }
  | { readonly type: 'scenario'; readonly scenario: OAuthSimulationScenario };

const authorizationSteps = [
  'authorization',
  'redirect',
  'authorization-request',
  'identity',
  'callback',
  'exchange',
  'token-response',
  'validation',
  'session',
] as const;

export type OAuthSimulationStep =
  | (typeof authorizationSteps)[number]
  | 'pkce-rejected'
  | 'resource-request'
  | 'resource-allowed'
  | 'resource-denied';

export function initialOAuthSimulation(
  attempt = 1,
  scenario: OAuthSimulationScenario = 'success',
): OAuthSimulationState {
  return { kind: 'oauth', attempt, scenario, phase: 'idle', revealed: 0 };
}

export function isOAuthScenario(value: string): value is OAuthSimulationScenario {
  return value === 'success' || value === 'pkce-rejected' || value === 'missing-permission';
}

export function oauthAuthorizationSteps(
  scenario: OAuthSimulationScenario,
): readonly OAuthSimulationStep[] {
  if (scenario === 'pkce-rejected') {
    return [...authorizationSteps.slice(0, 6), 'pkce-rejected'];
  }
  return authorizationSteps;
}

export function oauthSimulationSteps(state: OAuthSimulationState): readonly OAuthSimulationStep[] {
  const steps = oauthAuthorizationSteps(state.scenario);
  if (state.phase === 'complete') {
    return [...steps, 'resource-request', 'resource-allowed'];
  }
  if (state.phase === 'denied') {
    return [...steps, 'resource-request', 'resource-denied'];
  }
  return steps.slice(0, state.revealed);
}

export function reduceOAuthSimulation(
  state: OAuthSimulationState,
  command: OAuthSimulationCommand,
): OAuthSimulationState {
  if (command.type === 'reset') {
    return initialOAuthSimulation(state.attempt + 1, state.scenario);
  }
  if (command.type === 'scenario') {
    return state.phase === 'idle' ? { ...state, scenario: command.scenario } : state;
  }
  if (command.type === 'start') {
    return state.phase === 'idle' ? { ...state, phase: 'authorizing', revealed: 1 } : state;
  }
  if (
    (command.type === 'step' || command.type === 'resource') &&
    command.attempt !== state.attempt
  ) {
    return state;
  }
  if (command.type === 'step' && state.phase === 'authorizing') {
    const length = oauthAuthorizationSteps(state.scenario).length;
    const revealed = Math.min(state.revealed + 1, length);
    let phase: OAuthSimulationPhase = 'authorizing';
    if (revealed === length) {
      phase = state.scenario === 'pkce-rejected' ? 'failed' : 'session';
    }
    return { ...state, revealed, phase };
  }
  if (command.type === 'resource' && state.phase === 'session') {
    return {
      ...state,
      phase: state.scenario === 'missing-permission' ? 'denied' : 'complete',
      revealed: oauthAuthorizationSteps(state.scenario).length + 2,
    };
  }
  return state;
}
