import type { Mission } from './mission';

export type ExecutionKind = 'simulation' | 'live' | 'unavailable';

export function resolveMissionExecution(
  mission: Mission,
  runtimeEnabled: boolean,
  values: readonly string[],
  fixtureRequested: boolean,
): ExecutionKind {
  if (fixtureRequested) {
    return 'simulation';
  }
  if (values.length > 1 || values.some((value) => !['simulation', 'live'].includes(value))) {
    return 'unavailable';
  }
  if (values[0] === 'simulation') {
    return 'simulation';
  }
  const liveEnabled = runtimeEnabled && mission.execution === 'oauth-standard';
  if (values[0] === 'live') {
    return liveEnabled ? 'live' : 'unavailable';
  }
  return liveEnabled ? 'live' : 'simulation';
}
