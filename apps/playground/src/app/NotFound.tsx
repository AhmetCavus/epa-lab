import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  useEffect(() => {
    document.title = 'Page not found · Auth Protocol Playground';
  }, []);

  return (
    <main id="main-content" className="not-found" tabIndex={-1}>
      <p className="eyebrow">UNKNOWN DESTINATION</p>
      <h1>That preview isn’t here.</h1>
      <p>Choose one of the mission previews in the catalog.</p>
      <Link className="button primary" to="/missions">
        Back to Missions
      </Link>
    </main>
  );
}
