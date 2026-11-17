import { useParams } from 'react-router-dom';
import { findMission, Workspace } from '../features/mission';
import { NotFound } from './NotFound';
import { executionRuntime, publicOAuthRuntime } from './runtime';
import { useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';

export function WorkspaceRoute({ languageControl }: { languageControl?: ReactNode }) {
  const { missionId } = useParams();
  const [parameters] = useSearchParams();
  const runtimeEnabled = executionRuntime && parameters.get('view') !== 'fixture';
  const mission = findMission(missionId);

  if (!mission) {
    return <NotFound />;
  }

  return (
    <Workspace
      key={`${mission.id}:${runtimeEnabled}`}
      mission={mission}
      runtimeEnabled={runtimeEnabled}
      publicRuntime={publicOAuthRuntime}
      languageControl={languageControl}
    />
  );
}
