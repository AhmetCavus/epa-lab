import { useParams } from 'react-router-dom';
import { findMission, Workspace } from '../features/mission';
import { NotFound } from './NotFound';

export function WorkspaceRoute() {
  const { missionId } = useParams();
  const mission = findMission(missionId);

  if (!mission) {
    return <NotFound />;
  }

  return <Workspace key={mission.id} mission={mission} />;
}
