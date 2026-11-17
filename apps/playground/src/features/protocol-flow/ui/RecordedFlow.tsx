import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { interactionActorIds, type FlowEvent, type FlowParticipant } from '../domain/protocol-flow';
import type { ProtocolPlayback } from '../application/useProtocolPlayback';
import { PlaybackControls } from './PlaybackControls';

interface RecordedFlowProps {
  events: readonly FlowEvent[];
  participants: readonly FlowParticipant[];
  event: FlowEvent | undefined;
  select: (id: string) => void;
  playback: ProtocolPlayback;
  incomplete: boolean;
  renderIcon: (participant: FlowParticipant) => ReactNode;
}

export function RecordedFlow({
  events,
  participants,
  event,
  select,
  playback,
  incomplete,
  renderIcon,
}: RecordedFlowProps) {
  const { t } = useTranslation('protocol-flow');
  const highlighted = event ? interactionActorIds(event) : [];
  const source =
    event?.kind === 'message'
      ? participants.findIndex((entry) => entry.actorIds.includes(event.sourceActorId))
      : -1;
  const target =
    event?.kind === 'message'
      ? participants.findIndex((entry) => entry.actorIds.includes(event.targetActorId))
      : -1;
  const sourceParticipant = participants[source];
  const targetParticipant = participants[target];
  const sourceX = ((source + 0.5) / participants.length) * 1000;
  const targetX = ((target + 0.5) / participants.length) * 1000;
  const observed = event?.visibility === 'observed' ? event.observation : undefined;

  return (
    <div className="recorded-flow" data-playing={playback.playing}>
      <header className="flow-heading">
        <h2>{t('playback.title')}</h2>
        <p>{t('playback.reconstruction')}</p>
      </header>
      {incomplete && (
        <p className="flow-gap" role="status">
          {t('playback.incomplete')}
        </p>
      )}
      <div className="flow-layout">
        <div className="flow-main">
          <div
            className="flow-diagram-scroll"
            role="group"
            aria-label={t('playback.participants')}
            tabIndex={0}
          >
            <div className="flow-diagram">
              <div className="flow-participants">
                {participants.map((participant) => (
                  <div
                    className="flow-participant"
                    key={participant.id}
                    data-participant={participant.id}
                    data-active={participant.actorIds.some((id) => highlighted.includes(id))}
                  >
                    {renderIcon(participant)}
                    <strong>{t(participant.titleKey)}</strong>
                    <span>{t(participant.descriptionKey)}</span>
                  </div>
                ))}
              </div>
              <div className="flow-connection">
                {event?.kind === 'message' &&
                sourceParticipant &&
                targetParticipant &&
                source !== target ? (
                  <>
                    <svg
                      className="flow-path"
                      viewBox="0 0 1000 56"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <defs>
                        <marker
                          id="recorded-arrow"
                          markerWidth="9"
                          markerHeight="9"
                          refX="7"
                          refY="4"
                          orient="auto"
                        >
                          <path
                            d="M0 0 8 4 0 8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </marker>
                      </defs>
                      <path
                        d={`M${sourceX} 3 V27 H${targetX} V3`}
                        markerEnd="url(#recorded-arrow)"
                        data-source={event.sourceActorId}
                        data-target={event.targetActorId}
                        data-source-participant={sourceParticipant.id}
                        data-target-participant={targetParticipant.id}
                        data-channel={event.channel.kind}
                      />
                    </svg>
                    <p>
                      {t('diagram.messageDirection', {
                        source: t(sourceParticipant.titleKey),
                        target: t(targetParticipant.titleKey),
                      })}{' '}
                      · {t(event.channel.labelKey)}
                    </p>
                  </>
                ) : (
                  <p className="flow-local">{t(event ? 'playback.local' : 'playback.empty')}</p>
                )}
              </div>
            </div>
          </div>
          <label className="flow-progress">
            <span>{t('playback.recordedPosition')}</span>
            <input
              type="range"
              min="1"
              max={Math.max(1, events.length)}
              value={Math.max(1, playback.index + 1)}
              disabled={!events.length}
              onChange={(change) => {
                const next = events[Number(change.target.value) - 1];
                if (next) {
                  playback.pause();
                  select(next.id);
                }
              }}
            />
          </label>
          <section className="flow-step" aria-live="polite" aria-atomic="true">
            <div className="flow-step-heading">
              <h3>{t(event?.titleKey ?? 'playback.empty')}</h3>
              <span>
                {t('playback.position', { current: playback.index + 1, total: events.length })}
              </span>
            </div>
            <p>{t(event?.explanationKey ?? 'playback.emptyDescription')}</p>
            <p className="flow-observer">
              {observed
                ? `${t('inspector.observer')}: ${observed.observedBy}`
                : t('inspector.noObserver')}
            </p>
          </section>
        </div>
        <aside className="flow-overview" aria-labelledby="flow-overview-title">
          <h3 id="flow-overview-title">{t('playback.overview')}</h3>
          <ol>
            {events.map((entry, index) => (
              <li key={entry.id}>
                <button
                  aria-pressed={entry.id === event?.id}
                  onClick={() => {
                    playback.pause();
                    select(entry.id);
                  }}
                >
                  <span>{index + 1}</span>
                  <div>
                    <strong>{t(entry.titleKey)}</strong>
                    <small>{t(entry.channel.labelKey)}</small>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
      <PlaybackControls playback={playback} />
    </div>
  );
}
