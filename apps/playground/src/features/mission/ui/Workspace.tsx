import type { Mission } from '../domain/mission';
import type { ExecutionKind } from '../domain/mission-execution';
import { useTranslation } from 'react-i18next';
import { useMissionWorkspace } from '../application/useMissionWorkspace';
import { useWorkspaceView } from '../application/useWorkspaceView';
import { MissionControl } from './workspace/MissionControl';
import { useEpaSimulation } from '../application/useEpaSimulation';
import { useOAuthMission } from '../application/useOAuthMission';
import { useOAuthSimulation } from '../application/useOAuthSimulation';
import { useEffect } from 'react';

export function Workspace({
  mission,
  execution,
  publicRuntime = false,
  liveAvailable = false,
}: {
  mission: Mission;
  execution: ExecutionKind;
  publicRuntime?: boolean;
  liveAvailable?: boolean;
}) {
  useEffect(() => {
    document.getElementById('main-content')?.focus();
  }, []);
  if (execution === 'unavailable') {
    return <UnavailableWorkspace />;
  }
  if (execution === 'live') {
    return <LiveWorkspace mission={mission} publicRuntime={publicRuntime} />;
  }
  if (mission.execution === 'oauth-standard') {
    return (
      <OAuthSimulationWorkspace
        mission={mission}
        publicRuntime={publicRuntime}
        liveAvailable={liveAvailable}
      />
    );
  }
  return <SimulationWorkspace mission={mission} publicRuntime={publicRuntime} />;
}

function OAuthSimulationWorkspace({
  mission,
  publicRuntime,
  liveAvailable,
}: {
  mission: Mission;
  publicRuntime: boolean;
  liveAvailable: boolean;
}) {
  const view = useWorkspaceView();
  const execution = useOAuthSimulation();
  const workspace = useMissionWorkspace(
    mission,
    execution,
    view.mode === 'explore' && view.panel === 'flow',
    view.mode === 'inspect',
  );
  return (
    <MissionControl
      mission={mission}
      view={view}
      workspace={{ ...workspace, execution }}
      publicRuntime={publicRuntime}
      liveAvailable={liveAvailable}
    />
  );
}

function UnavailableWorkspace() {
  const { t } = useTranslation('mission');
  return (
    <main id="main-content" className="catalog" tabIndex={-1}>
      <h1>{t('execution.unavailableTitle')}</h1>
      <p role="status">{t('execution.unavailableDescription')}</p>
    </main>
  );
}

function LiveWorkspace({ mission, publicRuntime }: { mission: Mission; publicRuntime: boolean }) {
  const view = useWorkspaceView();
  const execution = useOAuthMission(true);
  const workspace = useMissionWorkspace(
    mission,
    execution,
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
      />
    );
  }

  return null;
}

function SimulationWorkspace({
  mission,
  publicRuntime,
}: {
  mission: Mission;
  publicRuntime: boolean;
}) {
  const view = useWorkspaceView();
  const execution = useEpaSimulation();
  const workspace = useMissionWorkspace(
    mission,
    execution,
    view.mode === 'explore' && view.panel === 'flow',
    view.mode === 'inspect',
  );
  return (
    <MissionControl
      mission={mission}
      view={view}
      workspace={{ ...workspace, execution }}
      publicRuntime={publicRuntime}
      liveAvailable={false}
    />
  );
}
