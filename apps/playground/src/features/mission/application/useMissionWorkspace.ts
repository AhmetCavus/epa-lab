import { useState } from 'react';
import {
  useEventFilter,
  useProtocolPlayback,
  useProtocolSelection,
} from '../../protocol-flow/selection';
import type { Mission } from '../domain/mission';
import type { useOAuthMission } from './useOAuthMission';
import type { EpaSimulation } from './useEpaSimulation';
import type { OAuthSimulation } from './useOAuthSimulation';
import { useSimulationPlayback } from './useSimulationPlayback';

type WorkspaceAnnouncement = 'loaded' | 'replayed' | 'reset' | 'fitted';

export function useMissionWorkspace(
  mission: Mission,
  execution: ReturnType<typeof useOAuthMission> | OAuthSimulation | EpaSimulation,
  playbackEnabled = false,
  inspectionEnabled = false,
) {
  const [checkpointId, setCheckpointId] = useState(mission.checkpoints[0]?.id ?? null);
  const [hasLoadedSamples, setHasLoadedSamples] = useState(false);
  const [announcement, setAnnouncement] = useState<WorkspaceAnnouncement | null>(null);
  const fixtureEvents =
    mission.preview.kind === 'fixture' && hasLoadedSamples ? mission.preview.events : [];
  const events = execution?.events ?? fixtureEvents;
  const checkpoint = mission.checkpoints.find((entry) => entry.id === checkpointId);
  const actors = mission.groups.flatMap((group) => group.actors);
  const inspection = useProtocolSelection({
    actors,
    events,
    contextActorIds: checkpoint?.actorIds ?? [],
  });
  const inspectionFilters = useEventFilter(
    events,
    inspection.event?.id ?? null,
    inspection.selectEvent,
    Boolean(execution) && inspectionEnabled,
  );
  const recordedPlayback = useProtocolPlayback({
    events,
    selectedId: inspection.event?.id ?? null,
    select: inspection.selectEvent,
    traceId: execution?.runId,
    enabled: execution?.kind === 'live' && playbackEnabled,
  });
  const simulationPlayback = useSimulationPlayback({
    execution: execution?.kind === 'simulation' ? execution : undefined,
    events,
    selectedId: inspection.event?.id ?? null,
    select: inspection.selectEvent,
    enabled: execution?.kind === 'simulation' && playbackEnabled,
  });
  const playback = execution?.kind === 'simulation' ? simulationPlayback : recordedPlayback;
  const selectedIndex = mission.checkpoints.findIndex((entry) => entry.id === checkpointId);

  function selectCheckpoint(id: string) {
    setCheckpointId(id);
    inspection.clearSelection();
  }

  function loadSamples() {
    setHasLoadedSamples(true);
    setAnnouncement('loaded');
  }

  function replayExplanation() {
    const firstEvent = events[0];
    if (firstEvent) {
      inspection.selectEvent(firstEvent.id);
      setAnnouncement('replayed');
    }
  }

  function resetWorkspace() {
    setCheckpointId(null);
    inspection.clearSelection();
    setAnnouncement('reset');
  }

  return {
    checkpointId,
    checkpoint,
    selectedIndex,
    hasLoadedSamples,
    execution,
    channels: execution?.channels ?? mission.channels,
    events,
    actors,
    announcement,
    ...inspection,
    inspectionFilters,
    playback,
    selectCheckpoint,
    loadSamples,
    replayExplanation,
    resetWorkspace,
    announce: setAnnouncement,
  };
}

export type MissionWorkspace = ReturnType<typeof useMissionWorkspace>;
