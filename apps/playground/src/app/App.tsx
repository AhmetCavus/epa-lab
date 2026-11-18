import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ApplicationHeader, Catalog } from '../features/mission';
import { WorkspaceRoute } from './WorkspaceRoute';
import { NotFound } from './NotFound';
import { selectLanguage } from './i18n';
import { executionRuntime, privateOAuthRuntime, publicOAuthRuntime } from './runtime';

export function App() {
  const { t, i18n } = useTranslation('common');
  const location = useLocation();

  useEffect(() => {
    document.getElementById('main-content')?.focus();
  }, [location.pathname]);

  useEffect(() => {
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        t('description', { context: publicOAuthRuntime ? 'public' : undefined }),
      );
  }, [t]);

  const languageControl = (
    <label className="language-control">
      <span>{t('language.label')}</span>
      <select value={i18n.language} onChange={(event) => void selectLanguage(event.target.value)}>
        <option value="de" lang="de">
          {t('language.de')}
        </option>
        <option value="en" lang="en">
          {t('language.en')}
        </option>
      </select>
    </label>
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('common:skipLink')}
      </a>
      <ApplicationHeader languageControl={languageControl} />
      <Routes>
        <Route path="/" element={<Navigate to="/missions" replace />} />
        <Route
          path="/missions"
          element={<Catalog runtimeEnabled={executionRuntime} publicRuntime={publicOAuthRuntime} />}
        />
        <Route path="/missions/:missionId/workspace" element={<WorkspaceRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="site-footer">
        <span>
          Auth Protocol Playground <span className="footer-version">/ 001</span>
        </span>
        <span>
          {t(
            publicOAuthRuntime
              ? 'footer.publicNotice'
              : privateOAuthRuntime
                ? 'footer.privateNotice'
                : 'footer.notice',
          )}
        </span>
      </footer>
    </>
  );
}
