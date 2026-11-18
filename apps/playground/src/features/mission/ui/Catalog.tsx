import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Mission } from '../domain/mission';
import { missions, workspacePaths } from '../application/mission-catalog';

const catalogArtwork = {
  hero: '/assets/mission-catalog-hero.jpg',
  wideHero: '/assets/mission-catalog-hero-wide.jpg',
  cards: {
    identity: '/assets/oauth-card-header.jpg',
    'protected-system': '/assets/epa-card-header.jpg',
  },
} as const;

export function Catalog({
  runtimeEnabled = false,
  publicRuntime = false,
}: {
  runtimeEnabled?: boolean;
  publicRuntime?: boolean;
}) {
  const { t } = useTranslation('mission');
  useEffect(() => {
    document.title = t('common:titles.catalog');
  }, [t]);

  return (
    <main id="main-content" className="catalog" tabIndex={-1}>
      <section className="catalog-intro" aria-labelledby="catalog-title">
        <div>
          <p className="eyebrow">
            {t('mission:catalog.eyebrow')} <span>{t('mission:catalog.lab')}</span>
          </p>
          <h1 id="catalog-title">
            {t('mission:catalog.heading')}
            <br />
            <span>{t('mission:catalog.headingAccent')}</span>
          </h1>
          <p className="intro-copy">
            {t('catalog.intro', { context: runtimeEnabled ? 'live' : undefined })}
          </p>
        </div>
        <div className="catalog-hero" aria-hidden="true">
          <picture>
            <source
              media="(min-width: 761px)"
              srcSet={catalogArtwork.wideHero}
              width={2172}
              height={724}
            />
            <img
              src={catalogArtwork.hero}
              width={1672}
              height={941}
              alt=""
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <span>{t('mission:catalog.artCaption')}</span>
        </div>
      </section>
      <div className="catalog-section-heading">
        <h2>{t('mission:catalog.choose')}</h2>
        <span className="metadata">{t('catalog.previewCount', { count: missions.length })}</span>
      </div>
      <div className="mission-grid">
        {missions.map((mission, index) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            index={index}
            runtimeEnabled={runtimeEnabled}
            publicRuntime={publicRuntime}
          />
        ))}
      </div>
      <aside className="preview-notice">
        <span className="notice-icon" aria-hidden="true">
          i
        </span>
        <div>
          <strong>{t('catalog.noticeTitle')}</strong>
          <p>{t('catalog.notice', { context: runtimeEnabled ? 'live' : undefined })}</p>
        </div>
      </aside>
      <section className="learning-principles" aria-label={t('mission:catalog.principles.label')}>
        <div>
          <span className="principle-number">01</span>
          <h3>{t('mission:catalog.principles.actorsTitle')}</h3>
          <p>{t('mission:catalog.principles.actors')}</p>
        </div>
        <div>
          <span className="principle-number">02</span>
          <h3>{t('mission:catalog.principles.explanationTitle')}</h3>
          <p>{t('mission:catalog.principles.explanation')}</p>
        </div>
        <div>
          <span className="principle-number">03</span>
          <h3>{t('mission:catalog.principles.evidenceTitle')}</h3>
          <p>{t('mission:catalog.principles.evidence')}</p>
        </div>
      </section>
    </main>
  );
}

function MissionCard({
  mission,
  index,
  runtimeEnabled,
}: {
  mission: Mission;
  index: number;
  runtimeEnabled: boolean;
  publicRuntime: boolean;
}) {
  const { t } = useTranslation('mission');
  const paths = workspacePaths(mission, runtimeEnabled);
  let availabilityKey = 'catalog.availableSimulation';
  if (mission.preview.kind === 'concept') {
    availabilityKey = 'catalog.availableConcept';
  } else if (paths.live) {
    availabilityKey = 'catalog.availableLive';
  }
  return (
    <article className={`mission-card ${mission.illustration}`}>
      <div className="mission-art" aria-hidden="true">
        <img
          className="mission-image"
          src={catalogArtwork.cards[mission.illustration]}
          width={800}
          height={400}
          alt=""
          loading="lazy"
          decoding="async"
        />
        <span className={`badge ${mission.preview.kind}`}>{t(availabilityKey)}</span>
      </div>
      <div className="card-body">
        <div className="card-kicker">
          <span className="metadata">
            {t('catalog.cardNumber', { number: String(index + 1).padStart(2, '0') })}
          </span>
          <span className="metadata">{t('mission:catalog.learningPreview')}</span>
        </div>
        <h3>{t(mission.titleKey)}</h3>
        <p>{t(mission.outcomeKey)}</p>
        <ul className="topic-list" aria-label={t('mission:catalog.topics')}>
          {mission.topicKeys.map((topic) => (
            <li key={topic}>{t(topic)}</li>
          ))}
        </ul>
        <div className="mission-actions">
          <Link className="button primary" to={paths.simulation}>
            {t('catalog.simulationAction')}
            <span aria-hidden="true">↗</span>
          </Link>
          {mission.execution &&
            (paths.live ? (
              <Link className="button secondary" to={paths.live}>
                {t('catalog.liveAction')}
                <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <div className="mission-live-unavailable">
                <button className="button secondary" disabled>
                  {t('catalog.liveAction')}
                </button>
                <small>{t('catalog.liveUnavailable')}</small>
              </div>
            ))}
        </div>
      </div>
    </article>
  );
}
