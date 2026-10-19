import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Mission } from '../domain/mission';
import { useMissionWorkspace } from '../application/useMissionWorkspace';
import { ActorCanvas, Inspector, Timeline } from '../../protocol-flow';

export function Workspace({ mission }: { mission: Mission }) {
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
    document.title = `${mission.title} · Mission Control`;
  }, [mission.title]);

  function resetView() {
    resetWorkspace();
    setScale(1);
  }

  function fitMap() {
    // Fit preserves the readable baseline. Narrow maps scroll instead of shrinking text.
    setScale(1);
    mapViewportRef.current?.scrollTo({ left: 0 });
    announce('Map at readable size. Scroll horizontally to reach additional participants.');
  }

  return (
    <main id="main-content" className="workspace" tabIndex={-1}>
      <Link className="back-link" to="/missions">
        ← Back to Missions
      </Link>
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">
            MISSION CONTROL <span>/ PREVIEW</span>
          </p>
          <h1>{mission.title}</h1>
          <p>{mission.subtitle}</p>
        </div>
        <div className="workspace-status">
          <span className={`badge ${mission.preview.kind}`}>{mission.availability}</span>
          <span className="metadata" role="status">
            No live run
          </span>
        </div>
      </header>
      <div className="workspace-notice">
        <span className="notice-icon" aria-hidden="true">
          i
        </span>
        <p>{mission.preview.note}</p>
      </div>
      <div className="workspace-grid">
        <aside className="panel mission-panel" aria-labelledby="mission-panel-title">
          <div className="panel-heading">
            <h2 id="mission-panel-title">Your mission</h2>
            <span className="metadata">LEARN</span>
          </div>
          <div className="objective">
            <p className="eyebrow">OBJECTIVE</p>
            <p>{mission.objective}</p>
          </div>
          <div className="checkpoint-heading">
            <h3>Learning checkpoints</h3>
            <span>
              {selectedIndex >= 0
                ? `${selectedIndex + 1} / ${mission.checkpoints.length} selected`
                : 'None selected'}
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
                  <span>{entry.title}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="panel-footnote">
            Checkpoint selection is learning navigation. It does not execute a flow.
          </p>
        </aside>
        <section className="panel canvas-panel" aria-labelledby="canvas-title">
          <div className="panel-heading canvas-heading">
            <h2 id="canvas-title">Actor map</h2>
            <div className="canvas-controls" role="group" aria-label="Actor map viewport">
              <button
                className="icon-button"
                aria-label="Zoom out"
                disabled={scale <= 1}
                onClick={() => setScale((current) => Math.max(1, current - 0.25))}
              >
                −
              </button>
              <output aria-label="Map zoom">{Math.round(scale * 100)}%</output>
              <button
                className="icon-button"
                aria-label="Zoom in"
                disabled={scale >= 1.5}
                onClick={() => setScale((current) => Math.min(1.5, current + 0.25))}
              >
                +
              </button>
              <button className="text-button" onClick={fitMap}>
                Fit
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
              className={`badge ${event?.visibility === 'Not observable' ? 'unobservable' : 'explained'}`}
            >
              {event?.visibility ?? 'Explained'}
            </span>
            <h3>{event?.title ?? actor?.label ?? checkpoint?.title ?? 'Explore the map'}</h3>
            <p>
              {event?.summary ??
                actor?.description ??
                checkpoint?.explanation ??
                'Select an actor, checkpoint or fixture sample to explore its context.'}
            </p>
          </div>
          <div className="workspace-actions">
            {mission.preview.kind === 'fixture' && (
              <button className="button primary" disabled={hasLoadedSamples} onClick={loadSamples}>
                {hasLoadedSamples ? 'Fixture samples loaded' : mission.preview.loadLabel}
              </button>
            )}
            <button
              className="button secondary"
              disabled={events.length === 0}
              onClick={replayExplanation}
            >
              Replay explanation
            </button>
            <button className="text-button" onClick={resetView}>
              Reset view
            </button>
          </div>
        </section>
        <Inspector
          event={event}
          actor={actor}
          contextTitle={checkpoint?.title}
          contextExplanation={checkpoint?.explanation}
          actors={actors}
        />
        <Timeline events={events} selectedEventId={event?.id ?? null} onSelectEvent={selectEvent} />
      </div>
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </main>
  );
}
