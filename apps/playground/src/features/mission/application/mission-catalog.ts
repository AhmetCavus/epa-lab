import { missions } from '../data/registry';
import type { Mission } from '../domain/mission';

export { missions };
export { resolveMissionExecution } from '../domain/mission-execution';

export function findMission(missionId: string | undefined) {
  return missions.find((mission) => mission.id === missionId);
}

export function workspacePaths(mission: Mission, runtimeEnabled: boolean) {
  const path = `/missions/${mission.id}/workspace`;
  const hasExecution = runtimeEnabled && mission.execution === 'oauth-standard';
  return {
    preview: hasExecution ? `${path}?view=fixture` : path,
    execution: hasExecution ? path : undefined,
    simulation: `${path}?execution=simulation`,
    live: hasExecution ? `${path}?execution=live` : undefined,
  };
}
