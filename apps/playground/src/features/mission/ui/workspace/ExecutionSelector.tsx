import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function ExecutionSelector({
  kind,
  liveAvailable,
  conceptual = false,
}: {
  kind: 'live' | 'simulation';
  liveAvailable: boolean;
  conceptual?: boolean;
}) {
  const { t } = useTranslation('mission');
  const [parameters] = useSearchParams();

  function destination(execution: 'live' | 'simulation') {
    const next = new URLSearchParams(parameters);
    next.delete('view');
    next.set('execution', execution);
    return `?${next.toString()}`;
  }

  return (
    <section className="mc-execution-selector" aria-label={t('execution.selection')}>
      <p className="mc-runtime-badge" data-provenance={kind}>
        {t(
          conceptual
            ? 'execution.conceptualNotice'
            : kind === 'simulation'
              ? 'execution.simulationNotice'
              : 'execution.liveNotice',
        )}
      </p>
      <nav aria-label={t('execution.selection')}>
        <Link
          to={destination('simulation')}
          aria-current={kind === 'simulation' ? 'page' : undefined}
        >
          {t('execution.simulation')}
        </Link>
        {liveAvailable && (
          <Link to={destination('live')} aria-current={kind === 'live' ? 'page' : undefined}>
            {t('execution.live')}
          </Link>
        )}
      </nav>
    </section>
  );
}
