import { useTranslation } from 'react-i18next';
import type { FlowEvent } from '../domain/protocol-flow';

interface TimelineProps {
  events: readonly FlowEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  presentation?: 'observed' | 'fixture';
}

export function Timeline({
  events,
  selectedEventId,
  onSelectEvent,
  presentation = 'fixture',
}: TimelineProps) {
  const { t } = useTranslation('protocol-flow');
  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-title">
      <div className="panel-heading">
        <h2 id="timeline-title">{t('protocol-flow:timeline.heading')}</h2>
        <span className="metadata">
          {t(presentation === 'observed' ? 'timeline.observedCount' : 'timeline.count', {
            count: events.length,
          })}
        </span>
      </div>
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
          <p className="timeline-note">
            {t(presentation === 'observed' ? 'timeline.observedOrder' : 'timeline.orderNote')}
          </p>
          <ol className="timeline">
            {events.map((event, index) => (
              <li key={event.id}>
                <button
                  aria-pressed={selectedEventId === event.id}
                  onClick={() => onSelectEvent(event.id)}
                >
                  <span className="sample-number">
                    {t(
                      event.visibility === 'observed'
                        ? 'timeline.eventNumber'
                        : 'timeline.sampleNumber',
                      {
                        number: String(
                          event.visibility === 'observed' ? event.observation.sequence : index + 1,
                        ).padStart(2, '0'),
                      },
                    )}
                  </span>
                  {event.visibility === 'observed' && (
                    <>
                      <time dateTime={event.observation.observedAt}>
                        {event.observation.observedAt}
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
        </>
      )}
    </section>
  );
}
