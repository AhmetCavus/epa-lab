/** @jsxImportSource react */
import { useEffect, useId, useRef } from 'react';
import type { FixtureEvent } from '../domain/protocol-flow';
import type { CanvasLayout } from './interaction-layout';

interface InteractionPathsProps {
  layout: CanvasLayout;
  events: readonly FixtureEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
}

export function InteractionPaths({
  layout,
  events,
  selectedEventId,
  onSelectEvent,
}: InteractionPathsProps) {
  const markerId = `direction-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const viewport = container?.closest('.actor-map-scroll');
    const selectedPath = container?.querySelector('[data-selected="true"]');
    if (!(viewport instanceof HTMLElement) || !selectedPath) {
      return;
    }
    const revealSelection = () => {
      const bounds = selectedPath.getBoundingClientRect();
      const viewportBounds = viewport.getBoundingClientRect();
      viewport.scrollBy({
        left: bounds.x + bounds.width / 2 - viewportBounds.x - viewport.clientWidth / 2,
      });
    };
    revealSelection();
    const observer = new ResizeObserver(revealSelection);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [selectedEventId]);

  return (
    <div className="interaction-paths" ref={containerRef}>
      <svg className="lifeline-drawing" aria-hidden="true">
        {layout.lanes.map(({ actor, x }) => (
          <line
            className="actor-lifeline"
            data-actor-id={actor.id}
            key={actor.id}
            x1={`${(x / layout.width) * 100}%`}
            x2={`${(x / layout.width) * 100}%`}
            y1="0"
            y2="100%"
          />
        ))}
      </svg>
      {events.length === 0 && (
        <p className="diagram-empty">
          No communication samples loaded.
          <br />
          Explore actor responsibilities or learning checkpoints.
        </p>
      )}
      {events.map((event, index) => {
        const sourceId = event.kind === 'internal' ? event.actorId : event.sourceActorId;
        const source = layout.lanes.find((lane) => lane.actor.id === sourceId);
        const target =
          event.kind === 'message'
            ? layout.lanes.find((lane) => lane.actor.id === event.targetActorId)
            : undefined;
        if (!source) {
          return null;
        }
        const direction =
          event.kind === 'message'
            ? `${source.actor.label} → ${target?.actor.label}`
            : `${source.actor.label} · internal annotation`;
        const isSelected = selectedEventId === event.id;

        return (
          <button
            key={event.id}
            className="interaction-target"
            data-event-id={event.id}
            data-channel={event.channel.kind}
            aria-pressed={isSelected}
            aria-label={`Inspect ${event.title}. ${direction}. ${event.channel.label}. Fixture — ${event.visibility}.`}
            onClick={() => onSelectEvent(event.id)}
          >
            <span className="interaction-label">
              <span className="message-heading">
                <span className="message-number">{String(index + 1).padStart(2, '0')}</span>
                <strong>{event.title}</strong>
                <span className="path-selection-label">{isSelected ? 'Selected' : 'Example'}</span>
              </span>
              <span className="message-direction">{direction}</span>
              <span className="interaction-channel">
                {event.channel.label} · {event.visibility}
              </span>
            </span>
            <svg className="path-drawing" viewBox={`0 0 ${layout.width} 40`} aria-hidden="true">
              <defs>
                <marker
                  id={`${markerId}-${index}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="8"
                  refY="4"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 8 4 L 0 8 Z" fill="context-stroke" />
                </marker>
              </defs>
              <g
                className="interaction-path"
                data-event-id={event.id}
                data-kind={event.kind}
                data-channel={event.channel.kind}
                data-selected={isSelected}
                data-muted={selectedEventId !== null && !isSelected}
              >
                {event.kind === 'message' && target ? (
                  <>
                    <circle className="path-origin" cx={source.x} cy="20" r="4" />
                    <line
                      className="communication-edge"
                      data-source={source.actor.id}
                      data-target={target.actor.id}
                      x1={source.x}
                      y1="20"
                      x2={target.x}
                      y2="20"
                      markerEnd={`url(#${markerId}-${index})`}
                    />
                  </>
                ) : (
                  <rect
                    className="internal-marker"
                    x={source.x - 9}
                    y="11"
                    width="18"
                    height="18"
                    rx="4"
                  />
                )}
              </g>
            </svg>
          </button>
        );
      })}
    </div>
  );
}
