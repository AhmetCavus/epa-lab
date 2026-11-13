import { useTranslation } from 'react-i18next';
import type { Actor, FlowEvent } from '../domain/protocol-flow';

interface InspectorProps {
  event: FlowEvent | undefined;
  actor: Actor | undefined;
  contextTitle: string | undefined;
  contextExplanation: string | undefined;
  actors: readonly Actor[];
  presentation?: 'observed' | 'fixture';
}

export function Inspector({
  event,
  actor,
  contextTitle,
  contextExplanation,
  actors,
  presentation = 'fixture',
}: InspectorProps) {
  const { t } = useTranslation('protocol-flow');
  const observed = event?.visibility === 'observed' ? event : undefined;
  const fixtureSelection = event ? 'inspector.selected' : 'inspector.context';
  const fixtureSource = event ? 'inspector.fixtureSource' : 'inspector.conceptSource';
  const fixtureDetails = event ? 'inspector.exampleDetails' : 'inspector.noObservedEvidence';
  const explanationKey =
    presentation === 'observed'
      ? 'inspector.chooseObservedExplanation'
      : 'inspector.chooseExplanation';
  const contextKey =
    presentation === 'observed' ? 'inspector.contextOnly' : 'inspector.noOperation';
  const chooseEventKey =
    presentation === 'observed' ? 'inspector.chooseObservation' : 'inspector.chooseSample';
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
        <span className="metadata">
          {t(observed ? 'inspector.selectedObserved' : fixtureSelection)}
        </span>
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
          <p>{t(event?.summaryKey ?? contextKey)}</p>
          <dl className="provenance">
            <div>
              <dt>{t('protocol-flow:inspector.source')}</dt>
              <dd>{t(observed ? 'inspector.observedSource' : fixtureSource)}</dd>
            </div>
            <div>
              <dt>{t('protocol-flow:inspector.observer')}</dt>
              <dd>{observed?.observation.observedBy ?? t('protocol-flow:inspector.noObserver')}</dd>
            </div>
            <div>
              <dt>{t('protocol-flow:inspector.timestamp')}</dt>
              <dd>
                {observed ? (
                  <time dateTime={observed.observation.observedAt}>
                    {observed.observation.observedAt}
                  </time>
                ) : (
                  t('protocol-flow:inspector.unavailable')
                )}
              </dd>
            </div>
            {observed && (
              <>
                <div>
                  <dt>{t('inspector.outcome')}</dt>
                  <dd>
                    {t(observed.observation.outcomeKey)} (
                    <code>{observed.observation.outcome}</code>)
                  </dd>
                </div>
                <div>
                  <dt>{t('inspector.sequence')}</dt>
                  <dd>{observed.observation.sequence}</dd>
                </div>
              </>
            )}
          </dl>
        </section>
        <section className="evidence-section">
          <h3>{t('protocol-flow:inspector.safeEvidence')}</h3>
          <p className="metadata">{t(observed ? 'inspector.observedDetails' : fixtureDetails)}</p>
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
          {observed?.report && (
            <section className="interpretation">
              <h4>{t('inspector.reportHeading')}</h4>
              {observed.report.available ? (
                <>
                  <p>
                    {t('inspector.reportSource')} <code>{observed.report.reportedBy}</code>
                  </p>
                  <p className="metadata">{t('inspector.reportNote')}</p>
                  <dl className="evidence-fields">
                    {observed.report.evidence.map((field) => (
                      <div key={field.labelKey}>
                        <dt>{t(field.labelKey)}</dt>
                        <dd>
                          {field.value.kind === 'literal' ? field.value.value : t(field.value.key)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p>{t('inspector.reportUnavailable')}</p>
              )}
            </section>
          )}
        </section>
        <section className="interpretation">
          <h3>{t('protocol-flow:inspector.why')}</h3>
          <p>
            {event || actor
              ? t(event?.explanationKey ?? actor?.descriptionKey ?? explanationKey)
              : (contextExplanation ?? t(explanationKey))}
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
                : t(chooseEventKey)}
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}
