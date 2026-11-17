import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlowEvent } from '../domain/protocol-flow';

interface TimelineProps {
  events: readonly FlowEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  presentation?: 'observed' | 'fixture';
  compact?: boolean;
  filters?: ReactNode;
}

export function Timeline({
  events,
  selectedEventId,
  onSelectEvent,
  presentation = 'fixture',
  compact = false,
  filters,
}: TimelineProps) {
  const { t } = useTranslation('protocol-flow');
  const eventNumberKey = compact ? 'inspection.sequenceNumber' : 'timeline.eventNumber';
  let countKey = presentation === 'observed' ? 'timeline.observedCount' : 'timeline.count';
  if (compact) countKey = 'inspection.count';
  const orderNote = (
    <p className="timeline-note">
      {t(presentation === 'observed' ? 'timeline.observedOrder' : 'timeline.orderNote')}
    </p>
  );
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
            <p>
              {t(presentation === 'observed' ? 'timeline.observedEmptyHelp' : 'timeline.emptyHelp')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {!compact && orderNote}
          <ol className="timeline">
            {events.map((event, index) => (
              <li key={event.id}>
                <button
                  aria-pressed={selectedEventId === event.id}
                  onClick={() => onSelectEvent(event.id)}
                >
                  <span className="sample-number">
                    {t(event.visibility === 'observed' ? eventNumberKey : 'timeline.sampleNumber', {
                      number: String(
                        event.visibility === 'observed' ? event.observation.sequence : index + 1,
                      ).padStart(2, '0'),
                    })}
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
                  <strong>{t(event.titleKey)}</strong>
                  <span className="timeline-channel">{t(event.channel.labelKey)}</span>
                  <span
                    className={`badge ${event.visibility === 'not-observable' ? 'unobservable' : 'explained'}`}
                  >
                    {t(`visibility.${event.visibility}`)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          {compact && orderNote}
        </>
      )}
    </section>
  );
}
