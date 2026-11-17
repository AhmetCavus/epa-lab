import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { MissionWorkspace } from '../../application/useMissionWorkspace';
import { RuntimeActionButton } from './RuntimeActionButton';
import { WorkspaceIcon } from './WorkspaceIcon';

type Execution = NonNullable<MissionWorkspace['execution']>;

export function ExploreView({
  execution,
  selectedStageId,
  onSelectStage,
  onInvoke,
  showOverview = true,
  compactOverview = false,
  children,
}: {
  execution: Execution;
  selectedStageId: string | null;
  onSelectStage: (id: string) => void;
  onInvoke: (id: string) => void;
  showOverview?: boolean;
  compactOverview?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation('mission');
  const experience = execution.experience;
  const currentStage = experience.stages.find((stage) => stage.outcome === 'current');
  const selectedStage =
    experience.stages.find((stage) => stage.id === selectedStageId) ??
    currentStage ??
    (experience.currentRunAuthenticated ? experience.stages.at(-1) : experience.stages[0]);
  const start = execution.actions.find((action) => action.id === 'start');
  const secondary = execution.actions.filter(
    (action) =>
      action.id !== 'resource' && !(action.id === 'start' && experience.primaryAction === 'start'),
  );
  const completed = experience.stages.filter((stage) => stage.outcome === 'complete').length;

  return (
    <>
      <ol className="mc-stages" aria-label={t('control.stageNavigation')}>
        {experience.stages.map((stage, index) => (
          <li key={stage.id} data-outcome={stage.outcome}>
            <button
              aria-pressed={selectedStage?.id === stage.id}
              onClick={() => onSelectStage(stage.id)}
              className="mc-stage"
            >
              <span className="mc-stage-number" aria-hidden="true">
                {stage.outcome === 'complete' ? <WorkspaceIcon name="check" /> : index + 1}
              </span>
              <span>{t(stage.titleKey)}</span>
              <span className="sr-only">{t(`control.stageOutcomes.${stage.outcome}`)}</span>
            </button>
          </li>
        ))}
      </ol>
      {showOverview && (
        <section
          className={`mc-panel mc-auth-hero mc-tone-${experience.tone}${compactOverview ? ' mc-auth-compact' : ''}`}
          aria-labelledby="mc-auth-title"
        >
          <div className="mc-status-overview">
            <div className="mc-auth-status runtime-status" role="status" aria-atomic="true">
              <div className="mc-status-symbol" aria-hidden="true">
                <WorkspaceIcon name="shield" />
                {experience.currentRunAuthenticated && (
                  <span>
                    <WorkspaceIcon name="check" />
                  </span>
                )}
              </div>
              <div>
                <h2 id="mc-auth-title">
                  {t(
                    compactOverview && experience.currentRunAuthenticated
                      ? 'control.states.authenticated.title'
                      : experience.titleKey,
                  )}
                </h2>
                <p>
                  {t(
                    compactOverview && experience.currentRunAuthenticated
                      ? 'control.states.authenticated.description'
                      : experience.descriptionKey,
                  )}
                </p>
                {experience.hasRetainedAuthentication && (
                  <p>{t('control.retainedAuthentication')}</p>
                )}
                {experience.evidenceIncomplete && (
                  <p className="mc-trace-note">{t('control.incompleteEvidence')}</p>
                )}
                {experience.primaryAction === 'start' && start && (
                  <RuntimeActionButton action={start} onInvoke={onInvoke} />
                )}
              </div>
            </div>
            {!compactOverview && (
              <div
                className="mc-participant-overview"
                role="group"
                aria-label={t('control.participantOverview')}
              >
                {experience.participants.map((participant) => (
                  <div className="mc-participant" key={participant.id}>
                    <WorkspaceIcon name={participant.icon} />
                    <strong>{t(participant.titleKey)}</strong>
                    <span>{t(participant.descriptionKey)}</span>
                  </div>
                ))}
              </div>
            )}
            {compactOverview && (
              <div className="mc-session-actions">
                {secondary.map((action) => (
                  <RuntimeActionButton
                    key={action.id}
                    action={action}
                    labelKey={`control.actions.${action.id}`}
                    onInvoke={onInvoke}
                  />
                ))}
              </div>
            )}
          </div>
          {!compactOverview && (
            <div className="mc-explanation-band">
              <div className="mc-explanation-label">
                <h3>{t('control.flowExplanation')}</h3>
                <p>{t('control.explanationNote')}</p>
              </div>
              <div className="mc-stage-explanation" aria-live="polite">
                <h3>{selectedStage ? t(selectedStage.titleKey) : t('control.explore')}</h3>
                <p>{selectedStage ? t(selectedStage.descriptionKey) : ''}</p>
                <div
                  className="mc-stage-progress"
                  role="progressbar"
                  aria-label={t('control.recordedProgress')}
                  aria-valuenow={completed}
                  aria-valuemin={0}
                  aria-valuemax={experience.stages.length}
                >
                  <span style={{ width: `${(completed / experience.stages.length) * 100}%` }} />
                </div>
              </div>
              <div
                className="mc-session-actions"
                role="group"
                aria-label={t('control.sessionActions')}
              >
                {secondary.map((action) => (
                  <RuntimeActionButton
                    key={action.id}
                    action={action}
                    labelKey={
                      action.labelKey === 'mission:runtime.actions.cancel'
                        ? action.labelKey
                        : `control.actions.${action.id}`
                    }
                    onInvoke={onInvoke}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      {children}
    </>
  );
}
