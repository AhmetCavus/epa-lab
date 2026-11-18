import { useTranslation } from 'react-i18next';
import type { MissionWorkspace } from '../../application/useMissionWorkspace';
import { Inspector, Timeline } from '../../../protocol-flow';

type RuntimeWorkspace = MissionWorkspace & {
  execution: NonNullable<MissionWorkspace['execution']>;
};

export function InspectionView({ workspace }: { workspace: RuntimeWorkspace }) {
  const { t } = useTranslation('protocol-flow');
  const { events, actors, execution } = workspace;
  const simulated = execution.kind === 'simulation';
  const incomplete = execution.kind === 'live' && execution.experience.evidenceIncomplete;
  const filter = workspace.inspectionFilters;
  const outcomes = new Map(
    events.flatMap((event) => {
      if (event.visibility === 'observed')
        return [[event.observation.outcome, event.observation.outcomeKey] as const];
      if (event.visibility === 'simulated')
        return [[event.simulation.outcome, event.simulation.outcomeKey] as const];
      return [];
    }),
  );
  const first = simulated ? events[0] : events.find((event) => event.visibility === 'observed');
  const selected = filter.selected;

  return (
    <div className="mc-inspection">
      <Timeline
        events={filter.filtered}
        selectedEventId={selected?.id ?? null}
        onSelectEvent={workspace.selectEvent}
        presentation={simulated ? 'simulated' : 'observed'}
        compact
        filters={
          <details
            className="mc-event-filter-disclosure"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector('summary')?.focus();
              }
            }}
          >
            <summary>{t('inspection.filterToggle')}</summary>
            <fieldset className="mc-event-filters">
              <legend className="sr-only">{t('inspection.filters')}</legend>
              <label>
                {t('inspection.actor')}
                <select
                  value={filter.actor}
                  onChange={(event) => filter.setActor(event.target.value)}
                >
                  <option value="">{t('inspection.allActors')}</option>
                  {actors.map((actor) => (
                    <option key={actor.id} value={actor.id}>
                      {t(actor.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('inspection.channel')}
                <select
                  value={filter.channel}
                  onChange={(event) => filter.setChannel(event.target.value)}
                >
                  <option value="">{t('inspection.allChannels')}</option>
                  {execution.channels.map((channel) => (
                    <option key={channel.kind} value={channel.kind}>
                      {t(channel.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('inspection.outcome')}
                <select
                  value={filter.outcome}
                  onChange={(event) => filter.setOutcome(event.target.value)}
                >
                  <option value="">{t('inspection.allOutcomes')}</option>
                  {Array.from(outcomes, ([outcome, key]) => (
                    <option key={outcome} value={outcome}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          </details>
        }
      />
      <Inspector
        event={selected}
        actor={workspace.actor}
        contextTitle={undefined}
        contextExplanation={undefined}
        actors={actors}
        presentation={simulated ? 'simulated' : 'observed'}
        detail
        navigation={
          <nav className="mc-event-navigation" aria-label={t('inspection.eventNavigation')}>
            <span role="status">
              {t('inspection.position', {
                current: filter.index + 1,
                total: filter.filtered.length,
              })}
            </span>
            <button
              className="mc-button"
              aria-label={t('inspection.previous')}
              disabled={filter.index <= 0}
              onClick={() => filter.move(-1)}
            >
              ‹
            </button>
            <button
              className="mc-button"
              aria-label={t('inspection.next')}
              disabled={filter.index < 0 || filter.index >= filter.filtered.length - 1}
              onClick={() => filter.move(1)}
            >
              ›
            </button>
          </nav>
        }
      />
      <aside className="mc-panel mc-run-metadata" aria-labelledby="mc-metadata-title" tabIndex={0}>
        <header>
          <h2 id="mc-metadata-title">{t('inspection.context')}</h2>
          <p>{t('inspection.contextDescription')}</p>
        </header>
        <section>
          <h3>{t('inspection.currentRun')}</h3>
          <dl>
            <div>
              <dt>{t(simulated ? 'simulation.traceId' : 'inspection.runId')}</dt>
              <dd>
                <code>{execution.runId ?? t('inspector.unavailable')}</code>
              </dd>
            </div>
            <div>
              <dt>{t('inspection.session')}</dt>
              <dd>{t(execution.experience.titleKey)}</dd>
            </div>
            <div>
              <dt>{t(simulated ? 'simulation.time' : 'inspection.recordedStart')}</dt>
              <dd>
                {first?.visibility === 'observed' ? (
                  <time dateTime={first.observation.observedAt}>
                    {first.observation.observedAt}
                  </time>
                ) : first?.visibility === 'simulated' ? (
                  t('simulation.elapsed', { milliseconds: first.simulation.elapsedMs })
                ) : (
                  t('inspector.unavailable')
                )}
              </dd>
            </div>
            {!simulated && (
              <div>
                <dt>{t('inspection.historyExpiry')}</dt>
                <dd>{execution.runExpiresAt ?? t('inspector.unavailable')}</dd>
              </div>
            )}
            <div>
              <dt>{t('inspection.eventCount')}</dt>
              <dd>{events.length}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3>{t('inspection.evidence')}</h3>
          <p>
            {t(
              simulated
                ? 'simulation.details'
                : incomplete
                  ? 'inspection.incomplete'
                  : 'inspection.recorded',
            )}
          </p>
          <p>{t(simulated ? 'simulation.flowNote' : 'inspection.provenance')}</p>
        </section>
        <section>
          <h3>{t('inspection.credentials')}</h3>
          <p>{t('inspection.noCredentials')}</p>
        </section>
      </aside>
    </div>
  );
}
