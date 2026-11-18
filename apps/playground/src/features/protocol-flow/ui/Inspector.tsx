import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { matchesEventPresentation, type Actor, type FlowEvent } from '../domain/protocol-flow';

interface InspectorProps {
  event: FlowEvent | undefined;
  actor: Actor | undefined;
  contextTitle: string | undefined;
  contextExplanation: string | undefined;
  actors: readonly Actor[];
  presentation?: 'observed' | 'fixture' | 'simulated';
  detail?: boolean;
  navigation?: ReactNode;
}

export function Inspector({
  event: providedEvent,
  actor,
  contextTitle,
  contextExplanation,
  actors,
  presentation = 'fixture',
  detail = false,
  navigation,
}: InspectorProps) {
  const { t } = useTranslation('protocol-flow');
  const event =
    providedEvent && matchesEventPresentation(providedEvent, presentation)
      ? providedEvent
      : undefined;
  const observed = event?.visibility === 'observed' ? event : undefined;
  const simulated = event?.visibility === 'simulated' ? event : undefined;
  const outcome = observed?.observation ?? simulated?.simulation;
  let sourceKey = event ? 'inspector.fixtureSource' : 'inspector.conceptSource';
  if (observed) {
    sourceKey = 'inspector.observedSource';
  } else if (simulated || presentation === 'simulated') {
    sourceKey = simulated?.simulation.conceptual
      ? 'simulation.conceptualSource'
      : 'simulation.source';
  }
  const fixtureSelection = event ? 'inspector.selected' : 'inspector.context';
  const fixtureDetails = event ? 'inspector.exampleDetails' : 'inspector.noObservedEvidence';
  let selectedKey = fixtureSelection;
  let detailsKey = fixtureDetails;
  if (observed) {
    selectedKey = 'inspector.selectedObserved';
    detailsKey = 'inspector.observedDetails';
  } else if (simulated) {
    selectedKey = 'visibility.simulated';
    detailsKey = 'simulation.details';
  }
  let unobservedTime = t('protocol-flow:inspector.unavailable');
  if (simulated) {
    unobservedTime = t('simulation.elapsed', { milliseconds: simulated.simulation.elapsedMs });
  }
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

  const provenance = (
    <dl className="provenance">
      <div>
        <dt>{t('protocol-flow:inspector.source')}</dt>
        <dd>{t(sourceKey)}</dd>
      </div>
      <div>
        <dt>{t('protocol-flow:inspector.observer')}</dt>
        <dd>
          {observed?.observation.observedBy ??
            t(
              presentation === 'simulated'
                ? 'simulation.noObserver'
                : 'protocol-flow:inspector.noObserver',
            )}
        </dd>
      </div>
      <div>
        <dt>
          {t(
            presentation === 'simulated' ? 'simulation.time' : 'protocol-flow:inspector.timestamp',
          )}
        </dt>
        <dd>
          {observed ? (
            <time dateTime={observed.observation.observedAt}>
              {observed.observation.observedAt}
            </time>
          ) : (
            unobservedTime
          )}
        </dd>
      </div>
      {outcome && (
        <>
          <div>
            <dt>{t('inspector.outcome')}</dt>
            <dd>
              {t(outcome.outcomeKey)} (<code>{outcome.outcome}</code>)
            </dd>
          </div>
          <div>
            <dt>{t('inspector.sequence')}</dt>
            <dd>{outcome.sequence}</dd>
          </div>
        </>
      )}
    </dl>
  );

  return (
    <aside
      className={`panel inspector${detail ? ' inspector-detail' : ''}`}
      aria-labelledby="inspector-title"
    >
      <div className="panel-heading">
        {detail ? (
          <div>
            <h2 id="inspector-title">{t(event?.titleKey ?? 'inspection.eventDetail')}</h2>
            <p className="mc-event-caption">
              {event
                ? t(
                    event.kind === 'message'
                      ? 'diagram.messageDirection'
                      : 'diagram.internalExplanation',
                    {
                      source: source ? t(source.labelKey) : '',
                      target: target ? t(target.labelKey) : '',
                    },
                  )
                : t('inspector.noSelection')}
            </p>
          </div>
        ) : (
          <h2 id="inspector-title">{t('inspector.heading')}</h2>
        )}
        <span className="metadata">{t(selectedKey)}</span>
        {navigation}
      </div>
      <div
        className="inspector-content"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={detail ? 0 : undefined}
        role={detail ? 'region' : undefined}
        aria-label={detail ? t('inspection.eventDetail') : undefined}
      >
        {!detail && (
          <span
            className={`badge ${event?.visibility === 'not-observable' ? 'unobservable' : 'explained'}`}
          >
            {t(`visibility.${event?.visibility ?? 'explained'}`)}
          </span>
        )}
        <section>
          {detail ? (
            <div className="mc-event-summary-heading">
              <h3>{t('protocol-flow:inspector.whatHappened')}</h3>
              {detail && (
                <span
                  className={`badge ${event?.visibility === 'not-observable' ? 'unobservable' : 'explained'}`}
                >
                  {t(`visibility.${event?.visibility ?? 'explained'}`)}
                </span>
              )}
            </div>
          ) : (
            <h3>{t('protocol-flow:inspector.whatHappened')}</h3>
          )}
          {!detail && (
            <h4>
              {event || actor
                ? t(event?.titleKey ?? actor?.labelKey ?? 'inspector.noSelection')
                : (contextTitle ?? t('inspector.noSelection'))}
            </h4>
          )}
          <p>{t(event?.summaryKey ?? contextKey)}</p>
          {!detail && provenance}
        </section>
        {detail && (
          <section className="mc-event-provenance">
            <h3>
              {t(presentation === 'simulated' ? 'simulation.evidence' : 'inspector.observedSource')}
            </h3>
            {provenance}
          </section>
        )}
        <EvidenceSection key={event?.id} collapsible={detail} title={t('inspector.safeEvidence')}>
          <p className="metadata">{t(detailsKey)}</p>
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
        </EvidenceSection>
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

function EvidenceSection({
  collapsible,
  title,
  children,
}: {
  collapsible: boolean;
  title: string;
  children: ReactNode;
}) {
  if (collapsible) {
    return (
      <details className="evidence-section">
        <summary>{title}</summary>
        <div>{children}</div>
      </details>
    );
  }
  return (
    <section className="evidence-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
