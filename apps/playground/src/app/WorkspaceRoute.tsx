import { useParams } from 'react-router-dom';
import { findMission, resolveMissionExecution, Workspace } from '../features/mission';
import { NotFound } from './NotFound';
import { executionRuntime, publicOAuthRuntime } from './runtime';
import { useSearchParams } from 'react-router-dom';

export function WorkspaceRoute() {
  const { missionId } = useParams();
  const [parameters] = useSearchParams();
  const mission = findMission(missionId);

  if (!mission) {
    return <NotFound />;
  }

  const execution = resolveMissionExecution(
    mission,
    executionRuntime,
    parameters.getAll('execution'),
    parameters.getAll('view').includes('fixture'),
  );
  return (
    <Workspace
      key={`${mission.id}:${execution}`}
      mission={mission}
      execution={execution}
      liveAvailable={executionRuntime && mission.execution === 'oauth-standard'}
      publicRuntime={publicOAuthRuntime}
    />
  );
}
