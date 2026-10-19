/** @jsxImportSource react */
import type { RefObject } from 'react';
import type { ActorGroup, FixtureEvent, InteractionChannel } from '../domain/protocol-flow';
import { InteractionPaths } from './InteractionPaths';
import { createCanvasLayout } from './interaction-layout';

interface ActorCanvasProps {
  groups: readonly ActorGroup[];
  channels: readonly InteractionChannel[];
  events: readonly FixtureEvent[];
  event: FixtureEvent | undefined;
  highlightedActorIds: readonly string[];
  selectedActorId: string | null;
  scale: number;
  viewportRef: RefObject<HTMLDivElement | null>;
  onSelectActor: (id: string) => void;
  onSelectEvent: (id: string) => void;
}

export function ActorCanvas({
  groups,
  channels,
  events,
  event,
  highlightedActorIds,
  selectedActorId,
  scale,
  viewportRef,
  onSelectActor,
  onSelectEvent,
}: ActorCanvasProps) {
  const layout = createCanvasLayout(groups);

  return (
    <>
      <div
        ref={viewportRef}
        className="actor-map-scroll"
        role="region"
        aria-label="Scrollable actor map"
        tabIndex={0}
      >
        <div
          className="actor-map"
          style={{ fontSize: `${scale * 16}px`, width: `${layout.width * scale}px` }}
        >
          <div
            className="actor-groups"
            style={{
              gridTemplateColumns: layout.groups.map(({ width }) => `${width / 16}em`).join(' '),
            }}
          >
            {layout.groups.map(({ group, width }) => (
              <section
                className="actor-group"
                key={group.id}
                aria-label={group.label}
                style={{ width: `${width / 16}em` }}
              >
                <h3>{group.label}</h3>
                <div
                  className="group-actors"
                  style={{ gridTemplateColumns: `repeat(${group.actors.length}, minmax(0, 1fr))` }}
                >
                  {group.actors.map((actor) => (
                    <button
                      key={actor.id}
                      className={`actor ${highlightedActorIds.includes(actor.id) ? 'highlighted' : ''}`}
                      data-actor-id={actor.id}
                      aria-pressed={selectedActorId === actor.id}
                      onClick={() => onSelectActor(actor.id)}
                    >
                      <span className="actor-symbol" aria-hidden="true">
                        ◇
                      </span>
                      <strong>{actor.label}</strong>
                      <span>{actor.role}</span>
                      <span className="actor-context">
                        {highlightedActorIds.includes(actor.id) ? 'In context' : '\u00a0'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <InteractionPaths
            layout={layout}
            events={events}
            selectedEventId={event?.id ?? null}
            onSelectEvent={onSelectEvent}
          />
        </div>
      </div>
      <div className="channel-legend" aria-label="Communication channel legend">
        {channels.length > 0 ? (
          channels.map((channel) => (
            <span key={channel.kind} data-channel={channel.kind}>
              <span className="legend-symbol" aria-hidden="true" />
              {channel.label}
            </span>
          ))
        ) : (
          <span>No communication paths defined</span>
        )}
        <span className="legend-note">Fixture explanations only · no observed traffic</span>
      </div>
      <details className="text-alternative">
        <summary>Actor map text alternative</summary>
        <ul>
          {groups.map((group) => (
            <li key={group.id}>
              <strong>{group.label}</strong>
              <ul>
                {group.actors.map((actor) => (
                  <li key={actor.id}>
                    {actor.label} — {actor.role}. {actor.description}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {events.length > 0 && (
          <>
            <h3>Fixture interactions</h3>
            <ol>
              {events.map((interaction) => {
                const sourceId =
                  interaction.kind === 'internal' ? interaction.actorId : interaction.sourceActorId;
                const source = layout.lanes.find((lane) => lane.actor.id === sourceId);
                const target =
                  interaction.kind === 'message'
                    ? layout.lanes.find((lane) => lane.actor.id === interaction.targetActorId)
                    : undefined;
                return (
                  <li key={interaction.id}>
                    <strong>{interaction.title}</strong>: {source?.actor.label}
                    {interaction.kind === 'message'
                      ? ` → ${target?.actor.label}`
                      : ' · internal annotation, no network request'}
                    . {interaction.channel.label} · Fixture / {interaction.visibility}.{' '}
                    {interaction.summary}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </details>
    </>
  );
}
