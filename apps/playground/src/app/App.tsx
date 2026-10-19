import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Catalog } from '../features/mission';
import { WorkspaceRoute } from './WorkspaceRoute';
import { NotFound } from './NotFound';

export function App() {
  const location = useLocation();

  useEffect(() => {
    document.getElementById('main-content')?.focus();
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link
          className="brand"
          to="/missions"
          aria-label="Auth Protocol Playground · Mission Catalog"
        >
          <span className="brand-mark" aria-hidden="true">
            ⌖
          </span>
          <span>
            <strong>AUTH PROTOCOL PLAYGROUND</strong>
            <span className="brand-subtitle">Explore protocols. Understand boundaries.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <Link className="nav-link" to="/missions">
            Missions
          </Link>
        </nav>
        <span className="header-label">
          UI SLICE 001 <span> / </span> PREVIEW
        </span>
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
        <span>Fixture-only learning preview · no live protocol execution</span>
      </footer>
    </>
  );
}
