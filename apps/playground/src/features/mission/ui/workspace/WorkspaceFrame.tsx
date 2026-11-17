import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Mission } from '../../domain/mission';
import { missions, workspacePaths } from '../../application/mission-catalog';
import { WorkspaceIcon } from './WorkspaceIcon';

export function WorkspaceFrame({
  mission,
  languageControl,
  navigation,
  secondaryNavigation,
  mode = 'explore',
  children,
}: {
  mission: Mission;
  languageControl?: ReactNode;
  navigation: ReactNode;
  secondaryNavigation?: ReactNode;
  mode?: 'explore' | 'inspect';
  children: ReactNode;
}) {
  const { t } = useTranslation('mission');

  return (
    <div className={`mission-control mc-view-${mode}`} data-view={mode}>
      <header className="mc-header">
        <Link className="mc-brand" to="/missions" aria-label={t('common:brandLink')}>
          <svg className="mc-brand-mark" viewBox="0 0 36 38" aria-hidden="true">
            <path fill="#16b9ff" d="M2 3h10l8 12-7 9L1 8Q-1 3 2 3Z" />
            <path fill="#078bfa" d="M23 3h11q3 0 1 4L23 24l-7-10Z" />
            <path fill="#079cff" d="m13 22 5-7 5 7v10q0 5-5 5t-5-5Z" />
          </svg>
          <strong>{t('control.brand')}</strong>
          <span className="mc-brand-divider" />
          <strong className="mc-product-name">Auth Protocol Playground</strong>
          <span className="mc-beta">{t('control.beta')}</span>
        </Link>
        {navigation}
        <div className="mc-header-tools">{languageControl}</div>
      </header>
      <div className="mc-layout">
        <aside className="mc-sidebar" aria-label={t('control.missions')}>
          <Link className="mc-back" to="/missions">
            {t('common:actions.backArrow')}
          </Link>
          <h2>{t('control.missions')}</h2>
          <nav className="mc-mission-links" aria-label={t('control.missions')}>
            {missions.map((entry) => {
              const paths = workspacePaths(entry, true);
              return (
                <Link
                  key={entry.id}
                  to={paths.execution ?? paths.preview}
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
