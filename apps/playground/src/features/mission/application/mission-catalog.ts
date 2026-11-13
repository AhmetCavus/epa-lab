import { missions } from '../data/registry';
import type { Mission } from '../domain/mission';

export { missions };

export function findMission(missionId: string | undefined) {
  return missions.find((mission) => mission.id === missionId);
}

export function workspacePaths(mission: Mission, privateRuntime: boolean) {
  const path = `/missions/${mission.id}/workspace`;
  const hasExecution = privateRuntime && mission.execution === 'oauth-standard';
  return {
    preview: hasExecution ? `${path}?view=fixture` : path,
    execution: hasExecution ? path : undefined,
  };
}
