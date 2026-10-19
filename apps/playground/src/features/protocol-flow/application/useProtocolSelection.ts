import { useState } from 'react';
import type { Actor, FixtureEvent } from '../domain/protocol-flow';
import { interactionActorIds } from '../domain/protocol-flow';

type InspectionSelection =
  | { kind: 'learning' }
  | { kind: 'actor'; id: string }
  | { kind: 'interaction'; id: string };

interface ProtocolSelectionOptions {
  actors: readonly Actor[];
  events: readonly FixtureEvent[];
  contextActorIds: readonly string[];
}

export function useProtocolSelection({
  actors,
  events,
  contextActorIds,
}: ProtocolSelectionOptions) {
  const [selection, setSelection] = useState<InspectionSelection>({ kind: 'learning' });
  const event =
    selection.kind === 'interaction'
      ? events.find((entry) => entry.id === selection.id)
      : undefined;
  const actor =
    selection.kind === 'actor' ? actors.find((entry) => entry.id === selection.id) : undefined;
  const highlightedContextIds = actor ? [actor.id] : contextActorIds;
  const highlightedActorIds = event ? interactionActorIds(event) : highlightedContextIds;

  function selectActor(id: string) {
    setSelection({ kind: 'actor', id });
  }

  function selectEvent(id: string) {
    setSelection({ kind: 'interaction', id });
  }

  function clearSelection() {
    setSelection({ kind: 'learning' });
  }

  return { event, actor, highlightedActorIds, selectActor, selectEvent, clearSelection };
}
