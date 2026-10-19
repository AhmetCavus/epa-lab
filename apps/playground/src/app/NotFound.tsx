import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export function NotFound() {
  const { t } = useTranslation('common');
  useEffect(() => {
    document.title = t('titles.notFound');
  }, [t]);

  return (
    <main id="main-content" className="not-found" tabIndex={-1}>
      <p className="eyebrow">{t('common:notFound.eyebrow')}</p>
      <h1>{t('common:notFound.heading')}</h1>
      <p>{t('common:notFound.description')}</p>
      <Link className="button primary" to="/missions">
        {t('common:actions.back')}
      </Link>
    </main>
  );
}
