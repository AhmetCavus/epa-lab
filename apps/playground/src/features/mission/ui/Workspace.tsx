import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Mission } from '../domain/mission';
import { useMissionWorkspace } from '../application/useMissionWorkspace';
import { ActorCanvas, Inspector, Timeline } from '../../protocol-flow';

export function Workspace({ mission }: { mission: Mission }) {
  const { t } = useTranslation('mission');
  const {
    checkpointId,
    checkpoint,
    selectedIndex,
    hasLoadedSamples,
    events,
    actors,
    announcement,
    event,
    actor,
    highlightedActorIds,
    selectActor,
    selectEvent,
    selectCheckpoint,
    loadSamples,
    replayExplanation,
    resetWorkspace,
    announce,
  } = useMissionWorkspace(mission);
  const [scale, setScale] = useState(1);
  const mapViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = t('common:titles.workspace', { mission: t(mission.titleKey) });
  }, [mission.titleKey, t]);

  function resetView() {
    resetWorkspace();
    setScale(1);
  }

  function fitMap() {
    // Fit preserves the readable baseline. Narrow maps scroll instead of shrinking text.
    setScale(1);
    mapViewportRef.current?.scrollTo({ left: 0 });
    announce('fitted');
  }

  return (
    <main id="main-content" className="workspace" tabIndex={-1}>
      <Link className="back-link" to="/missions">
        {t('common:actions.backArrow')}
      </Link>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">
            {t('mission:workspace.eyebrow')} <span>{t('mission:workspace.preview')}</span>
          </p>
          <h1>{t(mission.titleKey)}</h1>
          <p>{t(mission.subtitleKey)}</p>
        </div>
        <div className="workspace-status">
          <span className={`badge ${mission.preview.kind}`}>
            {t(`availability.${mission.availability}`)}
          </span>
          <span className="metadata" role="status">
            {t('mission:workspace.noRun')}
          </span>
        </div>
      </header>
      <div className="workspace-notice">
        <span className="notice-icon" aria-hidden="true">
          i
        </span>
        <p>{t(mission.preview.noteKey)}</p>
      </div>
      <div className="workspace-grid">
        <aside className="panel mission-panel" aria-labelledby="mission-panel-title">
          <div className="panel-heading">
            <h2 id="mission-panel-title">{t('mission:workspace.mission')}</h2>
            <span className="metadata">{t('mission:workspace.learn')}</span>
          </div>
          <div className="objective">
            <p className="eyebrow">{t('mission:workspace.objective')}</p>
            <p>{t(mission.objectiveKey)}</p>
          </div>
          <div className="checkpoint-heading">
            <h3>{t('mission:workspace.checkpoints')}</h3>
            <span>
              {selectedIndex >= 0
                ? t('workspace.checkpointSelected', {
                    current: selectedIndex + 1,
                    total: mission.checkpoints.length,
                  })
                : t('workspace.noneSelected')}
            </span>
          </div>
          <ol className="checkpoints">
            {mission.checkpoints.map((entry, index) => (
              <li key={entry.id}>
                <button
                  className="checkpoint"
                  aria-pressed={checkpointId === entry.id}
                  onClick={() => selectCheckpoint(entry.id)}
                >
                  <span className="checkpoint-number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{t(entry.titleKey)}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="panel-footnote">{t('mission:workspace.checkpointNote')}</p>
        </aside>
        <section className="panel canvas-panel" aria-labelledby="canvas-title">
          <div className="panel-heading canvas-heading">
            <h2 id="canvas-title">{t('mission:workspace.actorMap')}</h2>
            <div
              className="canvas-controls"
              role="group"
              aria-label={t('mission:workspace.viewport')}
            >
              <button
                className="icon-button"
                aria-label={t('mission:workspace.zoomOut')}
                disabled={scale <= 1}
                onClick={() => setScale((current) => Math.max(1, current - 0.25))}
              >
                −
              </button>
              <output aria-label={t('mission:workspace.zoom')}>{Math.round(scale * 100)}%</output>
              <button
                className="icon-button"
                aria-label={t('mission:workspace.zoomIn')}
                disabled={scale >= 1.5}
                onClick={() => setScale((current) => Math.min(1.5, current + 0.25))}
              >
                +
              </button>
              <button className="text-button" onClick={fitMap}>
                {t('mission:workspace.fit')}
              </button>
            </div>
          </div>
          <ActorCanvas
            groups={mission.groups}
            channels={mission.channels}
            events={events}
            event={event}
            highlightedActorIds={highlightedActorIds}
            selectedActorId={actor?.id ?? null}
            scale={scale}
            viewportRef={mapViewportRef}
            onSelectActor={(id) => {
              selectActor(id);
            }}
            onSelectEvent={selectEvent}
          />
          <div className="canvas-explanation" data-selected={Boolean(event)}>
            <span
              className={`badge ${event?.visibility === 'not-observable' ? 'unobservable' : 'explained'}`}
            >
              {t(`protocol-flow:visibility.${event?.visibility ?? 'explained'}`)}
            </span>
            <h3>
              {t(event?.titleKey ?? actor?.labelKey ?? checkpoint?.titleKey ?? 'workspace.explore')}
            </h3>
            <p>
              {t(
                event?.summaryKey ??
                  actor?.descriptionKey ??
                  checkpoint?.explanationKey ??
                  'workspace.context',
              )}
            </p>
          </div>
          <div className="workspace-actions">
            {mission.preview.kind === 'fixture' && (
              <button className="button primary" disabled={hasLoadedSamples} onClick={loadSamples}>
                {t(hasLoadedSamples ? 'workspace.loaded' : mission.preview.loadLabelKey)}
              </button>
            )}
            <button
              className="button secondary"
              disabled={events.length === 0}
              onClick={replayExplanation}
            >
              {t('mission:workspace.replay')}
            </button>
            <button className="text-button" onClick={resetView}>
              {t('mission:workspace.reset')}
            </button>
          </div>
        </section>
        <Inspector
          event={event}
          actor={actor}
          contextTitle={checkpoint ? t(checkpoint.titleKey) : undefined}
          contextExplanation={checkpoint ? t(checkpoint.explanationKey) : undefined}
          actors={actors}
        />
        <Timeline events={events} selectedEventId={event?.id ?? null} onSelectEvent={selectEvent} />
      </div>
      <p className="sr-only" role="status">
        {announcement ? t(`announcements.${announcement}`) : ''}
      </p>
    </main>
  );
}
