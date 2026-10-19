import { useState } from 'react';
import { useProtocolSelection } from '../../protocol-flow/selection';
import type { Mission } from '../domain/mission';

export function useMissionWorkspace(mission: Mission) {
  const [checkpointId, setCheckpointId] = useState(mission.checkpoints[0]?.id ?? null);
  const [hasLoadedSamples, setHasLoadedSamples] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const events =
    mission.preview.kind === 'fixture' && hasLoadedSamples ? mission.preview.events : [];
  const checkpoint = mission.checkpoints.find((entry) => entry.id === checkpointId);
  const actors = mission.groups.flatMap((group) => group.actors);
  const inspection = useProtocolSelection({
    actors,
    events,
    contextActorIds: checkpoint?.actorIds ?? [],
  });
  const selectedIndex = mission.checkpoints.findIndex((entry) => entry.id === checkpointId);

  function selectCheckpoint(id: string) {
    setCheckpointId(id);
    inspection.clearSelection();
  }

  function loadSamples() {
    setHasLoadedSamples(true);
    setAnnouncement('Fixture samples loaded. No live operation occurred.');
  }

  function replayExplanation() {
    const firstEvent = events[0];
    if (firstEvent) {
      inspection.selectEvent(firstEvent.id);
      setAnnouncement('Explanation replayed from the first fixture sample.');
    }
  }

  function resetWorkspace() {
    setCheckpointId(null);
    inspection.clearSelection();
    setAnnouncement('View reset. Loaded fixture samples are preserved.');
  }

  return {
    checkpointId,
    checkpoint,
    selectedIndex,
    hasLoadedSamples,
    events,
    actors,
    announcement,
    ...inspection,
    selectCheckpoint,
    loadSamples,
    replayExplanation,
    resetWorkspace,
    announce: setAnnouncement,
  };
}
