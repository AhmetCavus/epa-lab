import { useEffect, useState } from 'react';
import { interactionActorIds, type FlowEvent } from '../domain/protocol-flow';

export function useEventFilter(
  events: readonly FlowEvent[],
  selectedId: string | null,
  select: (id: string) => void,
  autoSelect = true,
) {
  const [actor, setActor] = useState('');
  const [channel, setChannel] = useState('');
  const [outcome, setOutcome] = useState('');
  const filtered = events.filter(
    (event) =>
      (!actor || interactionActorIds(event).includes(actor)) &&
      (!channel || event.channel.kind === channel) &&
      (!outcome ||
        (event.visibility === 'observed' && event.observation.outcome === outcome) ||
        (event.visibility === 'simulated' && event.simulation.outcome === outcome)),
  );
  const selected = filtered.find((event) => event.id === selectedId) ?? filtered[0];
  const index = selected ? filtered.indexOf(selected) : -1;

  useEffect(() => {
    if (autoSelect && selected && selected.id !== selectedId) {
      select(selected.id);
    }
  }, [autoSelect, selected, selectedId, select]);

  function move(offset: number) {
    const next = filtered[index + offset];
    if (next) select(next.id);
  }

  return {
    actor,
    setActor,
    channel,
    setChannel,
    outcome,
    setOutcome,
    filtered,
    selected,
    index,
    move,
  };
}
