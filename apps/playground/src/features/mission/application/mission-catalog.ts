import { missions } from '../data/registry';

export { missions };

export function findMission(missionId: string | undefined) {
  return missions.find((mission) => mission.id === missionId);
}
