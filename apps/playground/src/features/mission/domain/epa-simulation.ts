export type EpaSimulationScenario = 'success' | 'par-rejected';
export type EpaSimulationPhase = 'idle' | 'authorizing' | 'session' | 'complete' | 'failed';

export interface EpaSimulationState {
  readonly kind: 'epa';
  readonly attempt: number;
  readonly scenario: EpaSimulationScenario;
  readonly phase: EpaSimulationPhase;
  readonly revealed: number;
}

export type EpaSimulationCommand =
  | { readonly type: 'start' | 'reset' }
  | { readonly type: 'step' | 'resource'; readonly attempt: number }
  | { readonly type: 'scenario'; readonly scenario: EpaSimulationScenario };

const authorizationSteps = [
  'intent',
  'fdv-request',
  'par',
  'par-reference',
  'redirect',
  'identity-navigation',
  'identity-boundary',
  'authorization-boundary',
] as const;
export type EpaSimulationStep =
  | (typeof authorizationSteps)[number]
  | 'par-rejected'
  | 'protected-intent'
  | 'protected-boundary';

export function initialEpaSimulation(
  attempt = 1,
  scenario: EpaSimulationScenario = 'success',
): EpaSimulationState {
  return { kind: 'epa', attempt, scenario, phase: 'idle', revealed: 0 };
}

export function isEpaScenario(value: string): value is EpaSimulationScenario {
  return value === 'success' || value === 'par-rejected';
}

export function epaAuthorizationSteps(
  scenario: EpaSimulationScenario,
): readonly EpaSimulationStep[] {
  if (scenario === 'par-rejected') {
    return [...authorizationSteps.slice(0, 3), 'par-rejected'];
  }
  return authorizationSteps;
}

export function epaSimulationSteps(state: EpaSimulationState): readonly EpaSimulationStep[] {
  const steps = epaAuthorizationSteps(state.scenario);
  if (state.phase === 'complete') {
    return [...steps, 'protected-intent', 'protected-boundary'];
  }
  return steps.slice(0, state.revealed);
}

export function reduceEpaSimulation(
  state: EpaSimulationState,
  command: EpaSimulationCommand,
): EpaSimulationState {
  if (command.type === 'reset') {
    return initialEpaSimulation(state.attempt + 1, state.scenario);
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
    const length = epaAuthorizationSteps(state.scenario).length;
    const revealed = Math.min(state.revealed + 1, length);
    let phase: EpaSimulationPhase = 'authorizing';
    if (revealed === length) {
      phase = state.scenario === 'par-rejected' ? 'failed' : 'session';
    }
    return { ...state, revealed, phase };
  }
  if (command.type === 'resource' && state.phase === 'session') {
    return { ...state, phase: 'complete', revealed: state.revealed + 2 };
  }
  return state;
}
