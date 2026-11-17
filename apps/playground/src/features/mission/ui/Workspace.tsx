import type { ReactNode } from 'react';
import type { Mission } from '../domain/mission';
import { useMissionWorkspace } from '../application/useMissionWorkspace';
import { useWorkspaceView } from '../application/useWorkspaceView';
import { MissionControl } from './workspace/MissionControl';
import { PreviewWorkspace } from './PreviewWorkspace';

export function Workspace({
  mission,
  runtimeEnabled = false,
  publicRuntime = false,
  languageControl,
}: {
  mission: Mission;
  runtimeEnabled?: boolean;
  publicRuntime?: boolean;
  languageControl?: ReactNode;
}) {
  const view = useWorkspaceView();
  const workspace = useMissionWorkspace(
    mission,
    runtimeEnabled,
    view.mode === 'explore' && view.panel === 'flow',
    view.mode === 'inspect',
  );

  if (workspace.execution) {
    return (
      <MissionControl
        mission={mission}
        view={view}
        workspace={{ ...workspace, execution: workspace.execution }}
        publicRuntime={publicRuntime}
        languageControl={languageControl}
      />
    );
  }

  return <PreviewWorkspace mission={mission} workspace={workspace} publicRuntime={publicRuntime} />;
}
