import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { matchesEventPresentation, type FlowEvent } from '../domain/protocol-flow';

interface TimelineProps {
  events: readonly FlowEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  presentation?: 'observed' | 'fixture' | 'simulated';
  compact?: boolean;
  filters?: ReactNode;
}

export function Timeline({
  events: providedEvents,
  selectedEventId,
  onSelectEvent,
  presentation = 'fixture',
  compact = false,
  filters,
}: TimelineProps) {
  const { t } = useTranslation('protocol-flow');
  const events = providedEvents.filter((event) => matchesEventPresentation(event, presentation));
  let orderKey = 'timeline.orderNote';
  let emptyKey = 'timeline.emptyHelp';
  if (presentation === 'observed') {
    orderKey = 'timeline.observedOrder';
    emptyKey = 'timeline.observedEmptyHelp';
  } else if (presentation === 'simulated') {
    orderKey = 'simulation.order';
    emptyKey = 'simulation.empty';
  }
  const eventNumberKey = compact ? 'inspection.sequenceNumber' : 'timeline.eventNumber';
  let countKey = presentation === 'observed' ? 'timeline.observedCount' : 'timeline.count';
  if (presentation === 'simulated') {
    countKey = 'simulation.count';
  }
  if (compact) countKey = 'inspection.count';
  const orderNote = <p className="timeline-note">{t(orderKey)}</p>;
  return (
    <section
      className={`panel timeline-panel${compact ? ' timeline-compact' : ''}`}
      aria-labelledby="timeline-title"
    >
      <div className="panel-heading">
        <h2 id="timeline-title">{t(compact ? 'inspection.timeline' : 'timeline.heading')}</h2>
        <span className="metadata">
          {t(countKey, {
            count: events.length,
          })}
        </span>
        {compact && filters}
      </div>
      {!compact && filters}
      {events.length === 0 ? (
        <div className="empty-timeline">
          <span aria-hidden="true">╌ ◇ ╌</span>
          <div>
            <h3>{t('protocol-flow:timeline.empty')}</h3>
            <p>{t(emptyKey)}</p>
          </div>
        </div>
      ) : (
        <>
          {!compact && orderNote}
          <ol className="timeline">
            {events.map((event, index) => {
              let sequence = index + 1;
              if (event.visibility === 'observed') {
                sequence = event.observation.sequence;
              } else if (event.visibility === 'simulated') {
                sequence = event.simulation.sequence;
              }
              return (
                <li key={event.id}>
                  <button
                    aria-pressed={selectedEventId === event.id}
                    onClick={() => onSelectEvent(event.id)}
                  >
                    <span className="sample-number">
                      {t(
                        event.visibility === 'observed' || event.visibility === 'simulated'
                          ? eventNumberKey
                          : 'timeline.sampleNumber',
                        {
                          number: String(sequence).padStart(2, '0'),
                        },
                      )}
                    </span>
                    {event.visibility === 'observed' && (
                      <>
                        <time dateTime={event.observation.observedAt}>
                          {compact
                            ? event.observation.observedAt.slice(11, 23)
                            : event.observation.observedAt}
                        </time>
                        <span>
                          {event.observation.observedBy} · {t(event.observation.outcomeKey)}
                        </span>
                      </>
                    )}
                    {event.visibility === 'simulated' && (
                      <>
                        <span>
                          {t('simulation.elapsed', { milliseconds: event.simulation.elapsedMs })}
                        </span>
                        <span>{t(event.simulation.outcomeKey)}</span>
                      </>
                    )}
                    <strong>{t(event.titleKey)}</strong>
                    <span className="timeline-channel">{t(event.channel.labelKey)}</span>
                    <span
                      className={`badge ${event.visibility === 'not-observable' ? 'unobservable' : 'explained'}`}
                    >
                      {t(`visibility.${event.visibility}`)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {compact && orderNote}
        </>
      )}
    </section>
  );
}
