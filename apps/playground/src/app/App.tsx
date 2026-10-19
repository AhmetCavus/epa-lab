import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Catalog } from '../features/mission';
import { WorkspaceRoute } from './WorkspaceRoute';
import { NotFound } from './NotFound';
import { selectLanguage } from './i18n';

export function App() {
  const { t, i18n } = useTranslation('common');
  const location = useLocation();

  useEffect(() => {
    document.getElementById('main-content')?.focus();
  }, [location.pathname]);

  useEffect(() => {
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('description'));
  }, [t]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('common:skipLink')}
      </a>
      <header className="site-header">
        <Link className="brand" to="/missions" aria-label={t('common:brandLink')}>
          <span className="brand-mark" aria-hidden="true">
            ⌖
          </span>
          <span>
            <strong>AUTH PROTOCOL PLAYGROUND</strong>
            <span className="brand-subtitle">{t('common:tagline')}</span>
          </span>
        </Link>
        <nav aria-label={t('common:navigation.label')}>
          <Link className="nav-link" to="/missions">
            {t('common:navigation.missions')}
          </Link>
        </nav>
        <span className="header-label">
          {t('common:header.slice')}
          <span> / </span>
          {t('common:header.preview')}
        </span>
        <label className="language-control">
          <span>{t('language.label')}</span>
          <select
            value={i18n.language}
            onChange={(event) => void selectLanguage(event.target.value)}
          >
            <option value="de" lang="de">
              {t('language.de')}
            </option>
            <option value="en" lang="en">
              {t('language.en')}
            </option>
          </select>
        </label>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/missions" replace />} />
        <Route path="/missions" element={<Catalog />} />
        <Route path="/missions/:missionId/workspace" element={<WorkspaceRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="site-footer">
        <span>
          Auth Protocol Playground <span className="footer-version">/ 001</span>
        </span>
        <span>{t('common:footer.notice')}</span>
      </footer>
    </>
  );
}
