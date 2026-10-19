import type { FixtureEvent } from '../domain/protocol-flow';

interface TimelineProps {
  events: readonly FixtureEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
}

export function Timeline({ events, selectedEventId, onSelectEvent }: TimelineProps) {
  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-title">
      <div className="panel-heading">
        <h2 id="timeline-title">Event timeline</h2>
        <span className="metadata">{events.length} FIXTURE SAMPLES · 0 OBSERVED EVENTS</span>
      </div>
      {events.length === 0 ? (
        <div className="empty-timeline">
          <span aria-hidden="true">╌ ◇ ╌</span>
          <div>
            <h3>No observed events</h3>
            <p>
              Nothing has executed. Conceptual learning content is separate from observed evidence.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="timeline-note">
            Fixture explanation order only. No observed timestamps or operational outcomes.
          </p>
          <ol className="timeline">
            {events.map((event, index) => (
              <li key={event.id}>
                <button
                  aria-pressed={selectedEventId === event.id}
                  onClick={() => onSelectEvent(event.id)}
                >
                  <span className="sample-number">SAMPLE {String(index + 1).padStart(2, '0')}</span>
                  <strong>{event.title}</strong>
                  <span className="timeline-channel">{event.channel.label}</span>
                  <span
                    className={`badge ${event.visibility === 'Not observable' ? 'unobservable' : 'explained'}`}
                  >
                    {event.visibility}
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
