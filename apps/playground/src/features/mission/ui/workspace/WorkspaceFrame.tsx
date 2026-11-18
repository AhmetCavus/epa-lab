import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Mission } from '../../domain/mission';
import { missions, workspacePaths } from '../../application/mission-catalog';
import { WorkspaceIcon } from './WorkspaceIcon';

export function WorkspaceFrame({
  mission,
  secondaryNavigation,
  mode = 'explore',
  executionKind = 'live',
  liveAvailable = true,
  children,
}: {
  mission: Mission;
  secondaryNavigation?: ReactNode;
  mode?: 'explore' | 'inspect';
  executionKind?: 'live' | 'simulation';
  liveAvailable?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation('mission');

  return (
    <div
      className={`mission-control mc-view-${mode}`}
      data-view={mode}
      data-execution={executionKind}
    >
      <div className="mc-layout">
        <aside className="mc-sidebar" aria-label={t('control.missions')}>
          <Link className="mc-back" to="/missions">
            {t('common:actions.backArrow')}
          </Link>
          <h2>{t('control.missions')}</h2>
          <nav className="mc-mission-links" aria-label={t('control.missions')}>
            {missions.map((entry) => {
              const paths = workspacePaths(entry, liveAvailable);
              return (
                <Link
                  key={entry.id}
                  to={executionKind === 'live' && paths.live ? paths.live : paths.simulation}
                  aria-current={entry.id === mission.id ? 'page' : undefined}
                >
                  <WorkspaceIcon name={entry.preview.kind === 'concept' ? 'layers' : 'play'} />
                  <span>
                    <strong>{t(entry.titleKey)}</strong>
                    <small>
                      {entry.topicKeys
                        .slice(0, 2)
                        .map((key) => t(key))
                        .join(' · ')}
                    </small>
                  </span>
                </Link>
              );
            })}
          </nav>
          {secondaryNavigation && (
            <section className="mc-quick-access">
              <h2>{t('control.quickAccess')}</h2>
              {secondaryNavigation}
            </section>
          )}
          <div className="mc-sidebar-note">
            <WorkspaceIcon name="shield" />
            <p>{t('control.syntheticNotice')}</p>
          </div>
        </aside>
        <main id="main-content" className="mc-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
