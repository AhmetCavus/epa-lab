import { useEffect, useRef, useState } from 'react';
import type { FlowEvent } from '../../protocol-flow/contracts';
import type { ProtocolPlayback } from '../../protocol-flow/selection';
import type { EpaSimulation } from './useEpaSimulation';
import type { OAuthSimulation } from './useOAuthSimulation';

export function useSimulationPlayback({
  execution,
  events,
  selectedId,
  select,
  enabled,
}: {
  execution: OAuthSimulation | EpaSimulation | undefined;
  events: readonly FlowEvent[];
  selectedId: string | null;
  select: (id: string) => void;
  enabled: boolean;
}): ProtocolPlayback {
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const prior = useRef({ traceId: execution?.runId, count: 0 });
  const selectedIndex = events.findIndex((event) => event.id === selectedId);
  const index = selectedIndex < 0 ? events.length - 1 : selectedIndex;
  const canAdvance = Boolean(execution?.canAdvance);
  const advance = execution?.advance;
  const next = events[index + 1];

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setPlaying(false);
  }, [enabled, reducedMotion, execution?.runId]);

  useEffect(() => {
    if (!execution) {
      return;
    }
    const changed = prior.current.traceId !== execution.runId;
    if ((changed || events.length > prior.current.count) && events.at(-1)) {
      const last = events.at(-1);
      if (last) {
        select(last.id);
      }
    }
    prior.current = { traceId: execution.runId, count: events.length };
  }, [events, execution?.runId, select]);

  useEffect(() => {
    if (!playing || !enabled || reducedMotion || !execution) {
      return;
    }
    if (!next && !canAdvance) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      if (next) {
        select(next.id);
      } else {
        advance?.();
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [playing, enabled, reducedMotion, next, canAdvance, advance, select, execution?.runId]);

  function move(offset: number) {
    setPlaying(false);
    const target = events[index + offset];
    if (target) {
      select(target.id);
    } else if (offset > 0 && canAdvance) {
      advance?.();
    }
  }

  return {
    playing,
    index,
    count: events.length,
    reducedMotion,
    canPrevious: index > 0,
    canNext: Boolean(next || canAdvance),
    canPlay: Boolean(enabled && !reducedMotion && events.length && (next || canAdvance)),
    pause: () => setPlaying(false),
    toggle: () => {
      if (enabled && !reducedMotion && (next || canAdvance)) {
        setPlaying((value) => !value);
      }
    },
    previous: () => move(-1),
    next: () => move(1),
    replay: () => {
      setPlaying(false);
      const first = events[0];
      if (first) {
        select(first.id);
      }
    },
  };
}
