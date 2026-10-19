import { useTranslation } from 'react-i18next';
import type { FixtureEvent } from '../domain/protocol-flow';

interface TimelineProps {
  events: readonly FixtureEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
}

export function Timeline({ events, selectedEventId, onSelectEvent }: TimelineProps) {
  const { t } = useTranslation('protocol-flow');
  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-title">
      <div className="panel-heading">
        <h2 id="timeline-title">{t('protocol-flow:timeline.heading')}</h2>
        <span className="metadata">{t('timeline.count', { count: events.length })}</span>
      </div>
      {events.length === 0 ? (
        <div className="empty-timeline">
          <span aria-hidden="true">╌ ◇ ╌</span>
          <div>
            <h3>{t('protocol-flow:timeline.empty')}</h3>
            <p>{t('protocol-flow:timeline.emptyHelp')}</p>
          </div>
        </div>
      ) : (
        <>
          <p className="timeline-note">{t('protocol-flow:timeline.orderNote')}</p>
          <ol className="timeline">
            {events.map((event, index) => (
              <li key={event.id}>
                <button
                  aria-pressed={selectedEventId === event.id}
                  onClick={() => onSelectEvent(event.id)}
                >
                  <span className="sample-number">
                    {t('timeline.sampleNumber', { number: String(index + 1).padStart(2, '0') })}
                  </span>
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
