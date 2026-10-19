import type { Actor, FixtureEvent } from '../domain/protocol-flow';

interface InspectorProps {
  event: FixtureEvent | undefined;
  actor: Actor | undefined;
  contextTitle: string | undefined;
  contextExplanation: string | undefined;
  actors: readonly Actor[];
}

export function Inspector({
  event,
  actor,
  contextTitle,
  contextExplanation,
  actors,
}: InspectorProps) {
  const sourceId = event?.kind === 'internal' ? event.actorId : event?.sourceActorId;
  const source = actors.find((entry) => entry.id === sourceId);
  const target =
    event?.kind === 'message'
      ? actors.find((entry) => entry.id === event.targetActorId)
      : undefined;

  return (
    <aside className="panel inspector" aria-labelledby="inspector-title">
      <div className="panel-heading">
        <h2 id="inspector-title">Inspector</h2>
        <span className="metadata">{event ? 'SELECTED FIXTURE' : 'CONTEXT'}</span>
      </div>
      <div className="inspector-content" aria-live="polite" aria-atomic="true">
        <span
          className={`badge ${event?.visibility === 'Not observable' ? 'unobservable' : 'explained'}`}
        >
          {event?.visibility ?? 'Explained'}
        </span>
        <section>
          <h3>What happened</h3>
          <h4>{event?.title ?? actor?.label ?? contextTitle ?? 'No selection'}</h4>
          <p>
            {event?.summary ??
              'No operation occurred. This panel contains conceptual learning content.'}
          </p>
          <dl className="provenance">
            <div>
              <dt>Source</dt>
              <dd>{event ? 'Static fixture sample' : 'Conceptual content'}</dd>
            </div>
            <div>
              <dt>Actual observer</dt>
              <dd>None — not observed</dd>
            </div>
            <div>
              <dt>Observed timestamp</dt>
              <dd>Not available</dd>
            </div>
          </dl>
        </section>
        <section className="evidence-section">
          <h3>Safe Evidence</h3>
          <p className="metadata">
            {event ? 'EXAMPLE DETAILS · NOT AN OBSERVED RESULT' : 'NO OBSERVED EVIDENCE'}
          </p>
          {event && event.evidence.length > 0 ? (
            <dl className="evidence-fields">
              {event.evidence.map((field) => (
                <div key={field.label}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>No observed evidence is available for this selection.</p>
          )}
        </section>
        <section className="interpretation">
          <h3>Why it matters</h3>
          <p>
            {event?.explanation ??
              actor?.description ??
              contextExplanation ??
              'Choose a checkpoint, actor or sample to read its explanation.'}
          </p>
        </section>
        <section>
          <h3>Actors &amp; channel</h3>
          {event ? (
            <>
              <p>
                {event.kind === 'message'
                  ? `${source?.label} → ${target?.label}`
                  : `${source?.label} · internal annotation, no network request`}
              </p>
              <span className="badge explained">{event.channel.label}</span>
            </>
          ) : (
            <p>
              {actor
                ? `${actor.label} · ${actor.role}`
                : 'Select a sample to inspect its source, destination and channel.'}
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}
