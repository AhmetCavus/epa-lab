import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('protocol-flow');
  const sourceId = event?.kind === 'internal' ? event.actorId : event?.sourceActorId;
  const source = actors.find((entry) => entry.id === sourceId);
  const target =
    event?.kind === 'message'
      ? actors.find((entry) => entry.id === event.targetActorId)
      : undefined;

  return (
    <aside className="panel inspector" aria-labelledby="inspector-title">
      <div className="panel-heading">
        <h2 id="inspector-title">{t('protocol-flow:inspector.heading')}</h2>
        <span className="metadata">{t(event ? 'inspector.selected' : 'inspector.context')}</span>
      </div>
      <div className="inspector-content" aria-live="polite" aria-atomic="true">
        <span
          className={`badge ${event?.visibility === 'not-observable' ? 'unobservable' : 'explained'}`}
        >
          {t(`visibility.${event?.visibility ?? 'explained'}`)}
        </span>
        <section>
          <h3>{t('protocol-flow:inspector.whatHappened')}</h3>
          <h4>
            {event || actor
              ? t(event?.titleKey ?? actor?.labelKey ?? 'inspector.noSelection')
              : (contextTitle ?? t('inspector.noSelection'))}
          </h4>
          <p>{t(event?.summaryKey ?? 'inspector.noOperation')}</p>
          <dl className="provenance">
            <div>
              <dt>{t('protocol-flow:inspector.source')}</dt>
              <dd>{t(event ? 'inspector.fixtureSource' : 'inspector.conceptSource')}</dd>
            </div>
            <div>
              <dt>{t('protocol-flow:inspector.observer')}</dt>
              <dd>{t('protocol-flow:inspector.noObserver')}</dd>
            </div>
            <div>
              <dt>{t('protocol-flow:inspector.timestamp')}</dt>
              <dd>{t('protocol-flow:inspector.unavailable')}</dd>
            </div>
          </dl>
        </section>
        <section className="evidence-section">
          <h3>{t('protocol-flow:inspector.safeEvidence')}</h3>
          <p className="metadata">
            {t(event ? 'inspector.exampleDetails' : 'inspector.noObservedEvidence')}
          </p>
          {event && event.evidence.length > 0 ? (
            <dl className="evidence-fields">
              {event.evidence.map((field) => (
                <div key={field.labelKey}>
                  <dt>{t(field.labelKey)}</dt>
                  <dd>{field.value.kind === 'literal' ? field.value.value : t(field.value.key)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>{t('protocol-flow:inspector.emptyEvidence')}</p>
          )}
        </section>
        <section className="interpretation">
          <h3>{t('protocol-flow:inspector.why')}</h3>
          <p>
            {event || actor
              ? t(event?.explanationKey ?? actor?.descriptionKey ?? 'inspector.chooseExplanation')
              : (contextExplanation ?? t('inspector.chooseExplanation'))}
          </p>
        </section>
        <section>
          <h3>{t('protocol-flow:inspector.actorsChannel')}</h3>
          {event ? (
            <>
              <p>
                {event.kind === 'message'
                  ? t('diagram.messageDirection', {
                      source: source ? t(source.labelKey) : '',
                      target: target ? t(target.labelKey) : '',
                    })
                  : t('diagram.internalExplanation', { source: source ? t(source.labelKey) : '' })}
              </p>
              <span className="badge explained">{t(event.channel.labelKey)}</span>
            </>
          ) : (
            <p>
              {actor
                ? t('inspector.actorRole', { actor: t(actor.labelKey), role: t(actor.roleKey) })
                : t('inspector.chooseSample')}
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}
