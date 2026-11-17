import { useEffect, useRef, useState, type ReactNode } from 'react';
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

export function MissionControl({
  mission,
  view,
  workspace,
  publicRuntime,
  languageControl,
}: {
  mission: Mission;
  view: ReturnType<typeof useWorkspaceView>;
  workspace: MissionWorkspace & { execution: NonNullable<MissionWorkspace['execution']> };
  publicRuntime: boolean;
  languageControl?: ReactNode;
}) {
  const { t } = useTranslation('mission');
  const { execution } = workspace;
  const context = publicRuntime ? 'public' : undefined;
  const resourceAction = execution.actions.find((action) => action.id === 'resource');
  const [resourceSelection, setResourceSelection] = useState<ResourceSelection>(syntheticResource);
  const showingResult = execution.resourceResult !== null || execution.phase === 'resource';
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
  }, [execution.phase]);

  useEffect(() => {
    document.title = `${t(`control.${view.mode}`)} · ${t('common:titles.workspace', { mission: t(mission.titleKey) })}`;
  }, [mission.titleKey, t, view.mode]);

  return (
    <WorkspaceFrame
      mission={mission}
      languageControl={languageControl}
      mode={view.mode}
      navigation={
        <nav className="mc-navigation" aria-label={t('control.navigation')}>
          <Link to="/missions">
            <WorkspaceIcon name="home" />
            {t('control.missionControl')}
          </Link>
          <Link
            to={view.destination('explore')}
            className={view.mode === 'explore' ? 'mc-navigation-active' : undefined}
            aria-current={view.mode === 'explore' ? 'page' : undefined}
          >
            <WorkspaceIcon name="play" />
            {t('control.explore')}
          </Link>
          <Link
            to={view.destination('inspect')}
            className={view.mode === 'inspect' ? 'mc-navigation-active' : undefined}
            aria-current={view.mode === 'inspect' ? 'page' : undefined}
          >
            <WorkspaceIcon name="inspect" />
            {t('control.inspect')}
          </Link>
        </nav>
      }
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
          <p>
            {t(view.mode === 'inspect' ? 'control.inspectDescription' : 'control.objective', {
              context,
            })}
          </p>
        </div>
        {view.mode === 'explore' && view.panel === 'resources' ? (
          <span className="mc-runtime-badge">{t('workspace.privateRuntime', { context })}</span>
        ) : (
          <div className="mc-inspect-actions">
            <p role="status">{t(execution.experience.titleKey)}</p>
            {execution.actions
              .filter((action) => action.id !== 'resource')
              .map((action) => (
                <RuntimeActionButton
                  key={action.id}
                  action={{ ...action, primary: false }}
                  labelKey={
                    action.id === 'logout' && action.labelKey === 'mission:runtime.actions.cancel'
                      ? action.labelKey
                      : `control.actions.${action.id}`
                  }
                  onInvoke={(id) => {
                    invokedAction.current = id;
                  }}
                />
              ))}
          </div>
        )}
      </header>
      {execution.problemKey && (
        <p className="mc-feedback" role="alert">
          {t(execution.problemKey)}
        </p>
      )}
      {view.mode === 'explore' && (
        <ExploreView
          execution={execution}
          showOverview={view.panel !== 'flow'}
          compactOverview={
            view.focusedResources && (showingResult || execution.experience.currentRunAuthenticated)
          }
          selectedStageId={selectedStageId}
          onSelectStage={setSelectedStageId}
          onInvoke={(id) => {
            invokedAction.current = id;
          }}
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
                    <h2>
                      {t(view.focusedResources ? 'control.explorerTitle' : 'control.resourceTitle')}
                    </h2>
                    <p>{t('control.resourceDescription')}</p>
                  </div>
                </div>
                <div className="mc-resource-ready">
                  <p>
                    {t(
                      execution.experience.currentRunAuthenticated
                        ? 'control.firstFetch'
                        : 'control.loginRequired',
                    )}
                  </p>
                </div>
                {resourceAction && (
                  <ResourceForm
                    action={resourceAction}
                    selection={resourceSelection}
                    onChange={setResourceSelection}
                    onFetch={execution.fetchResource}
                    onInvoke={(id) => {
                      invokedAction.current = id;
                    }}
                  />
                )}
                {showingResult && (
                  <ResourceResult
                    key={
                      execution.phase === 'resource' ? 'loading' : execution.resourceResult?.outcome
                    }
                    result={execution.resourceResult}
                    loading={execution.phase === 'resource'}
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
                incomplete={execution.experience.evidenceIncomplete}
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
