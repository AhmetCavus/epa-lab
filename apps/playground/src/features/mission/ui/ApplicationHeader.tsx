import type { ReactNode } from 'react';
import { Link, useLocation, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { findMission } from '../application/mission-catalog';
import { useWorkspaceView } from '../application/useWorkspaceView';
import { WorkspaceIcon } from './workspace/WorkspaceIcon';

export function ApplicationHeader({ languageControl }: { languageControl: ReactNode }) {
  const { t } = useTranslation('mission');
  const match = useMatch('/missions/:missionId/workspace');
  const location = useLocation();
  const mission = findMission(match?.params.missionId);
  const view = useWorkspaceView();
  const catalogActive = location.pathname === '/missions';

  return (
    <header className="mc-header">
      <Link className="mc-brand" to="/missions" aria-label={t('common:brandLink')}>
        <img
          className="mc-brand-mark"
          src="/assets/yappai-y-icon-64.png"
          width={31}
          height={34}
          alt=""
        />
        <strong>{t('control.brand')}</strong>
        <span className="mc-brand-divider" />
        <strong className="mc-product-name">Auth Protocol Playground</strong>
        <span className="mc-beta">{t('control.beta')}</span>
      </Link>
      <nav className="mc-navigation" aria-label={t('control.navigation')}>
        <Link
          to="/missions"
          className={catalogActive ? 'mc-navigation-active' : undefined}
          aria-current={catalogActive ? 'page' : undefined}
        >
          <WorkspaceIcon name="home" />
          {t('control.missionControl')}
        </Link>
        {mission && (
          <>
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
          </>
        )}
      </nav>
      <div className="mc-header-tools">{languageControl}</div>
    </header>
  );
}
