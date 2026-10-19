/** @jsxImportSource react */
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('protocol-flow');
  const layout = createCanvasLayout(groups);

  return (
    <>
      <div
        ref={viewportRef}
        className="actor-map-scroll"
        role="region"
        aria-label={t('protocol-flow:canvas.scrollLabel')}
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
                aria-label={t(group.labelKey)}
                style={{ width: `${width / 16}em` }}
              >
                <h3>{t(group.labelKey)}</h3>
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
                      <strong>{t(actor.labelKey)}</strong>
                      <span>{t(actor.roleKey)}</span>
                      <span className="actor-context">
                        {highlightedActorIds.includes(actor.id) ? t('canvas.inContext') : '\u00a0'}
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
      <div className="channel-legend" aria-label={t('protocol-flow:canvas.legend')}>
        {channels.length > 0 ? (
          channels.map((channel) => (
            <span key={channel.kind} data-channel={channel.kind}>
              <span className="legend-symbol" aria-hidden="true" />
              {t(channel.labelKey)}
            </span>
          ))
        ) : (
          <span>{t('protocol-flow:canvas.noPaths')}</span>
        )}
        <span className="legend-note">{t('protocol-flow:canvas.fixtureNote')}</span>
      </div>
      <details className="text-alternative">
        <summary>{t('protocol-flow:canvas.textAlternative')}</summary>
        <ul>
          {groups.map((group) => (
            <li key={group.id}>
              <strong>{t(group.labelKey)}</strong>
              <ul>
                {group.actors.map((actor) => (
                  <li key={actor.id}>
                    {t('canvas.actorDescription', {
                      actor: t(actor.labelKey),
                      role: t(actor.roleKey),
                      description: t(actor.descriptionKey),
                    })}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {events.length > 0 && (
          <>
            <h3>{t('protocol-flow:canvas.interactions')}</h3>
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
                    {t('canvas.interactionDescription', {
                      title: t(interaction.titleKey),
                      direction: t(
                        interaction.kind === 'message'
                          ? 'diagram.messageDirection'
                          : 'diagram.internalExplanation',
                        {
                          source: source ? t(source.actor.labelKey) : '',
                          target: target ? t(target.actor.labelKey) : '',
                        },
                      ),
                      channel: t(interaction.channel.labelKey),
                      visibility: t(`visibility.${interaction.visibility}`),
                      summary: t(interaction.summaryKey),
                    })}
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
