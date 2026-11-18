import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { MissionWorkspace } from '../../application/useMissionWorkspace';
import type { Mission } from '../../domain/mission';
import { InspectionView } from './InspectionView';
import { WorkspaceFrame } from './WorkspaceFrame';
import { WorkspaceIcon } from './WorkspaceIcon';
import type { useWorkspaceView } from '../../application/useWorkspaceView';
import { RecordedFlow } from '../../../protocol-flow';
import { ExploreView } from './ExploreView';
import { syntheticResource, type ResourceSelection } from '../../domain/synthetic-resource';
import { ResourceResult } from './ResourceResult';
import { ResourceForm } from './ResourceForm';
import { RuntimeActionButton } from './RuntimeActionButton';
import { ExecutionSelector } from './ExecutionSelector';

export function MissionControl({
  mission,
  view,
  workspace,
  publicRuntime,
  liveAvailable = true,
}: {
  mission: Mission;
  view: ReturnType<typeof useWorkspaceView>;
  workspace: MissionWorkspace & { execution: NonNullable<MissionWorkspace['execution']> };
  publicRuntime: boolean;
  liveAvailable?: boolean;
}) {
  const { t } = useTranslation('mission');
  const { execution } = workspace;
  const simulated = execution.kind === 'simulation';
  const conceptual = execution.kind === 'simulation' && execution.conceptual;
  let resourceReady = false;
  let incomplete = false;
  if (execution.kind === 'simulation') {
    resourceReady = execution.experience.simulatedSessionEstablished;
  } else {
    resourceReady = execution.experience.currentRunAuthenticated;
    incomplete = execution.experience.evidenceIncomplete;
  }
  const context = publicRuntime ? 'public' : undefined;
  const resourceAction = execution.actions.find((action) => action.id === 'resource');
  const [resourceSelection, setResourceSelection] = useState<ResourceSelection>(syntheticResource);
  const showingResult = execution.resourceResult !== null || execution.phase === 'resource';
  let objectiveKey = view.mode === 'inspect' ? 'control.inspectDescription' : 'control.objective';
  let resourceTitleKey = view.focusedResources ? 'control.explorerTitle' : 'control.resourceTitle';
  let resourceStatusKey = resourceReady ? 'control.firstFetch' : 'control.loginRequired';
  if (simulated) {
    objectiveKey = 'simulation.objective';
    resourceTitleKey = 'simulation.resourceTitle';
    resourceStatusKey = resourceReady ? 'simulation.resourceReady' : 'simulation.resourceWaiting';
    if (showingResult) {
      resourceStatusKey = 'simulation.resourceFinished';
    }
  }
  if (conceptual) {
    objectiveKey = 'simulation.epa.objective';
    resourceTitleKey = 'simulation.epa.protectedTitle';
  }
  let resourceDescriptionKey = 'control.resourceDescription';
  if (simulated) {
    resourceDescriptionKey = 'simulation.resourceDescription';
  }
  if (conceptual) {
    resourceDescriptionKey = 'simulation.epa.protectedDescription';
  }
  let headingKey = mission.titleKey;
  if (view.mode === 'inspect') {
    headingKey = 'control.inspectHeading';
  } else if (view.panel === 'flow' || view.focusedResources) {
    headingKey = 'control.exploreHeading';
  }
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const invokedAction = useRef<string | null>(null);

  useEffect(() => {
    if (execution.phase !== 'ready' || !invokedAction.current) {
      return;
    }
    const active = document.activeElement;
    const canRestore =
      active === document.body ||
      (active instanceof HTMLElement && Boolean(active.dataset.runtimeAction));
    if (canRestore) {
      const actions = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[data-runtime-action]'),
      );
      const target =
        actions.find(
          (button) => button.dataset.runtimeAction === invokedAction.current && !button.disabled,
        ) ?? actions.find((button) => button.classList.contains('mc-primary') && !button.disabled);
      target?.focus();
    }
    invokedAction.current = null;
  }, [execution.phase, execution.experience.titleKey]);

  function onInvoke(id: string) {
    invokedAction.current = id;
    if (simulated) {
      workspace.playback.pause();
    }
  }

  useEffect(() => {
    document.title = `${t(`control.${view.mode}`)} · ${t('common:titles.workspace', { mission: t(mission.titleKey) })}`;
  }, [mission.titleKey, t, view.mode]);

  return (
    <WorkspaceFrame
      mission={mission}
      mode={view.mode}
      executionKind={execution.kind}
      liveAvailable={liveAvailable}
      secondaryNavigation={
        <nav className="mc-quick-links" aria-label={t('control.quickAccess')}>
          <Link to={view.destination('explore', 'resources')}>
            <WorkspaceIcon name="layers" />
            {t('control.resourceExplorer')}
          </Link>
          <Link to={view.destination('explore', 'flow')}>
            <WorkspaceIcon name="play" />
            {t('control.flow')}
          </Link>
          <Link to={view.destination('inspect')}>
            <WorkspaceIcon name="inspect" />
            {t('control.inspect')}
          </Link>
        </nav>
      }
    >
      <header className="mc-page-heading">
        <div>
          <p className="mc-eyebrow">{t('control.missionLabel')}</p>
          <h1>{t(headingKey)}</h1>
          <p>{t(objectiveKey, { context })}</p>
        </div>
        <ExecutionSelector
          kind={execution.kind}
          liveAvailable={liveAvailable}
          conceptual={conceptual}
        />
        {!(view.mode === 'explore' && view.panel === 'resources') && (
          <div className="mc-inspect-actions">
            <p role="status">{t(execution.experience.titleKey)}</p>
            {execution.actions
              .filter((action) => action.id !== 'resource')
              .map((action) => (
                <RuntimeActionButton
                  key={action.id}
                  action={{ ...action, primary: false }}
                  labelKey={
                    simulated ||
                    (action.id === 'logout' && action.labelKey === 'mission:runtime.actions.cancel')
                      ? action.labelKey
                      : `control.actions.${action.id}`
                  }
                  onInvoke={onInvoke}
                />
              ))}
          </div>
        )}
      </header>
      {execution.kind === 'simulation' && (
        <div className="mc-simulation-options">
          <label>
            {t('simulation.scenario')}
            <select
              value={execution.state.scenario}
              disabled={execution.state.phase !== 'idle'}
              onChange={(event) => execution.chooseScenario(event.target.value)}
            >
              {execution.scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {t(scenario.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <p>{t(conceptual ? 'simulation.epa.disclaimer' : 'simulation.disclaimer')}</p>
        </div>
      )}
      {execution.problemKey && (
        <p className="mc-feedback" role="alert">
          {t(execution.problemKey)}
        </p>
      )}
      {view.mode === 'explore' && (
        <ExploreView
          execution={execution}
          showOverview={view.panel !== 'flow'}
          compactOverview={view.focusedResources && (showingResult || resourceReady)}
          selectedStageId={selectedStageId}
          onSelectStage={setSelectedStageId}
          onInvoke={onInvoke}
        >
          <section
            className={`mc-panel mc-secondary-panel${view.panel === 'resources' && view.focusedResources ? ' mc-explorer-result' : ''}${showingResult && !view.focusedResources && view.panel === 'resources' ? ' mc-explore-result' : ''}`}
            data-panel={view.panel}
            aria-label={t('control.details')}
          >
            <nav className="mc-panel-tabs" aria-label={t('control.panels')}>
              <Link
                to={view.destination('explore', 'resources')}
                aria-current={view.panel === 'resources' ? 'page' : undefined}
              >
                <WorkspaceIcon name="layers" />
                {t('control.resourceExplorer')}
              </Link>
              <Link
                to={view.destination('explore', 'flow')}
                aria-current={view.panel === 'flow' ? 'page' : undefined}
              >
                <WorkspaceIcon name="play" />
                {t('control.flow')}
              </Link>
            </nav>
            {view.panel === 'resources' ? (
              <div className="mc-panel-body mc-resource-intro">
                <div className="mc-section-title">
                  <WorkspaceIcon name="database" />
                  <div>
                    <h2>{t(resourceTitleKey)}</h2>
                    <p>{t(resourceDescriptionKey)}</p>
                  </div>
                </div>
                <div className="mc-resource-ready">
                  <p>{t(resourceStatusKey)}</p>
                </div>
                {resourceAction && conceptual && (
                  <RuntimeActionButton action={resourceAction} onInvoke={onInvoke} />
                )}
                {resourceAction && !conceptual && (
                  <ResourceForm
                    action={resourceAction}
                    selection={resourceSelection}
                    onChange={setResourceSelection}
                    onFetch={execution.fetchResource}
                    onInvoke={onInvoke}
                    simulated={simulated}
                  />
                )}
                {showingResult && (
                  <ResourceResult
                    key={
                      execution.phase === 'resource' ? 'loading' : execution.resourceResult?.outcome
                    }
                    result={execution.resourceResult}
                    loading={execution.phase === 'resource'}
                    presentation={simulated ? 'simulated' : 'observed'}
                  />
                )}
              </div>
            ) : (
              <RecordedFlow
                events={workspace.events}
                participants={execution.experience.participants}
                event={workspace.event}
                select={workspace.selectEvent}
                playback={workspace.playback}
                incomplete={incomplete}
                presentation={simulated ? 'simulated' : 'observed'}
                renderIcon={(participant) => <WorkspaceIcon name={participant.icon} />}
              />
            )}
          </section>
        </ExploreView>
      )}
      {view.mode === 'inspect' && <InspectionView workspace={workspace} />}
    </WorkspaceFrame>
  );
}
