import { useEffect, useState } from 'react';
import type { FlowEvent } from '../domain/protocol-flow';

interface PlaybackOptions {
  events: readonly FlowEvent[];
  selectedId: string | null;
  select: (id: string) => void;
  traceId: string | undefined;
  enabled: boolean;
}

export function useProtocolPlayback({
  events,
  selectedId,
  select,
  traceId,
  enabled,
}: PlaybackOptions) {
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    update();
    return () => preference.removeEventListener('change', update);
  }, []);
  const index = events.findIndex((event) => event.id === selectedId);
  const current = events[index];
  useEffect(() => {
    const first = events[0];
    if (enabled && !current && first) {
      select(first.id);
    }
  }, [current, enabled, events, select]);
  const stops =
    current?.visibility === 'observed' &&
    ['failed', 'rejected', 'denied', 'cancelled', 'signed-out'].includes(
      current.observation.outcome,
    );

  useEffect(() => {
    setPlaying(false);
  }, [traceId, enabled, reducedMotion]);
  useEffect(() => {
    const next = events[index + 1];
    if (!enabled || !playing || reducedMotion || !current || !next || stops) {
      if (playing) setPlaying(false);
      return;
    }
    // Presentation cadence only, never a claim about network timing.
    const timer = setTimeout(() => select(next.id), 1200);
    return () => clearTimeout(timer);
  }, [current, enabled, events, index, playing, reducedMotion, select, stops]);

  function move(offset: number) {
    setPlaying(false);
    const next = events[index + offset];
    if (next) select(next.id);
  }
  function replay() {
    setPlaying(false);
    const first = events[0];
    if (first) select(first.id);
  }
  function toggle() {
    if (!enabled || reducedMotion || !events.length) return;
    if (!current) {
      const first = events[0];
      if (first) select(first.id);
    }
    setPlaying((value) => !value);
  }
  return {
    playing,
    index,
    count: events.length,
    reducedMotion,
    canPrevious: index > 0,
    canNext: index >= 0 && index < events.length - 1,
    canPlay: enabled && !reducedMotion && events.length > 0 && !stops && index < events.length - 1,
    pause: () => setPlaying(false),
    toggle,
    previous: () => move(-1),
    next: () => move(1),
    replay,
  };
}

export type ProtocolPlayback = ReturnType<typeof useProtocolPlayback>;
