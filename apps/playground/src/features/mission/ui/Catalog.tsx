import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Mission } from '../domain/mission';
import { missions } from '../application/mission-catalog';

export function Catalog() {
  useEffect(() => {
    document.title = 'Mission Catalog · Auth Protocol Playground';
  }, []);

  return (
    <main id="main-content" className="catalog" tabIndex={-1}>
      <section className="catalog-intro" aria-labelledby="catalog-title">
        <div>
          <p className="eyebrow">
            MISSION CATALOG <span>/ LEARNING LAB</span>
          </p>
          <h1 id="catalog-title">
            Understand the flow.
            <br />
            <span>See the boundaries.</span>
          </h1>
          <p className="intro-copy">
            Explore authentication and authorization through actors, explanations and safe evidence.
            Choose a preview to enter Mission Control.
          </p>
        </div>
        <div className="network-globe" aria-hidden="true">
          <svg viewBox="0 0 500 300" fill="none">
            <defs>
              <radialGradient id="globe-light" cx="35%" cy="10%" r="85%">
                <stop stopColor="#126598" />
                <stop offset="1" stopColor="#071526" />
              </radialGradient>
            </defs>
            <ellipse cx="290" cy="280" rx="230" ry="220" fill="url(#globe-light)" />
            <g stroke="#49b9ef" strokeOpacity=".35">
              <ellipse cx="290" cy="280" rx="230" ry="220" />
              <ellipse cx="290" cy="280" rx="160" ry="220" />
              <ellipse cx="290" cy="280" rx="75" ry="220" />
              <ellipse cx="290" cy="200" rx="210" ry="52" />
              <ellipse cx="290" cy="280" rx="230" ry="70" />
              <path d="M120 160 210 105 340 130 430 210 300 250 190 205 120 160 M210 105 190 205 340 130 300 250" />
            </g>
            <g fill="#98e7ff" className="globe-lights">
              {[
                [120, 160],
                [210, 105],
                [340, 130],
                [430, 210],
                [300, 250],
                [190, 205],
              ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" />
              ))}
            </g>
          </svg>
          <span>PROTOCOLS / PERSPECTIVE / PRACTICE</span>
        </div>
      </section>
      <div className="catalog-section-heading">
        <h2>Choose your mission</h2>
        <span className="metadata">{missions.length} PREVIEWS · NO LIVE INTEGRATIONS</span>
      </div>
      <div className="mission-grid">
        {missions.map((mission, index) => (
          <MissionCard key={mission.id} mission={mission} index={index} />
        ))}
      </div>
      <aside className="preview-notice">
        <span className="notice-icon" aria-hidden="true">
          i
        </span>
        <div>
          <strong>A place to explore, with honest evidence.</strong>
          <p>
            These previews use fixture content. No sign-in, protected API call or live protocol
            integration runs here. Planned missions stay planned until their real execution is
            verified.
          </p>
        </div>
      </aside>
      <section className="learning-principles" aria-label="How Mission Control works">
        <div>
          <span className="principle-number">01</span>
          <h3>Map the actors</h3>
          <p>Understand who is responsible for each part of a journey.</p>
        </div>
        <div>
          <span className="principle-number">02</span>
          <h3>Follow the explanation</h3>
          <p>Explore checkpoints at your pace, independent of execution.</p>
        </div>
        <div>
          <span className="principle-number">03</span>
          <h3>Question the evidence</h3>
          <p>Separate what can be observed from what is being explained.</p>
        </div>
      </section>
    </main>
  );
}

function MissionCard({ mission, index }: { mission: Mission; index: number }) {
  return (
    <article className={`mission-card ${mission.illustration}`}>
      <div className="mission-art" aria-hidden="true">
        <MissionArtwork illustration={mission.illustration} />
        <span className={`badge ${mission.preview.kind}`}>{mission.availability}</span>
      </div>
      <div className="card-body">
        <div className="card-kicker">
          <span className="metadata">MISSION {String(index + 1).padStart(2, '0')}</span>
          <span className="metadata">LEARNING PREVIEW</span>
        </div>
        <h3>{mission.title}</h3>
        <p>{mission.outcome}</p>
        <ul className="topic-list" aria-label="Topics">
          {mission.topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
        <Link
          className={`button ${mission.preview.kind === 'fixture' ? 'primary' : 'secondary'}`}
          to={`/missions/${mission.id}/workspace`}
        >
          {mission.previewLabel}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}

function MissionArtwork({ illustration }: { illustration: Mission['illustration'] }) {
  return (
    <svg viewBox="0 0 560 190" fill="none" className="mission-illustration">
      <g className="art-network" stroke="currentColor" strokeOpacity=".3">
        <path d="M0 165 90 90 170 130 280 40 390 130 470 90 560 165 M0 40 90 90 160 15 M90 90 60 190 M470 90 500 10 M470 90 510 190 M170 130 130 190 M390 130 430 190" />
        <path d="M0 100H560 M0 145H560 M100 0 200 190 M460 0 360 190" strokeDasharray="3 8" />
        {[90, 170, 390, 470].map((cx, index) => (
          <circle
            key={cx}
            cx={cx}
            cy={index === 1 || index === 2 ? 130 : 90}
            r="4"
            fill="currentColor"
          />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="art-focus">
        {illustration === 'identity' ? (
          <>
            <path
              d="M280 28 333 48V91C333 123 310 147 280 162 250 147 227 123 227 91V48Z"
              fill="#08283e"
            />
            <circle cx="280" cy="77" r="15" />
            <path d="M256 120V112C256 95 304 95 304 112V120Z" />
            <rect x="140" y="76" width="38" height="52" rx="5" />
            <rect x="382" y="76" width="38" height="52" rx="5" />
            <path d="M150 88H168 M150 99H168 M392 88H410 M392 99H410 M179 102H216 M344 102H381" />
          </>
        ) : (
          <>
            <path d="M280 20 349 59V137L280 176 211 137V59Z" strokeOpacity=".5" />
            <path d="M240 60H271L282 72H322V136H240Z" fill="#17283f" />
            <path d="M273 90H290V101H301V118H290V129H273V118H262V101H273Z" />
            <circle cx="170" cy="96" r="22" />
            <circle cx="390" cy="96" r="22" />
            <path d="M159 96H181 M170 85V107 M380 96H400 M390 86V106 M192 96H211 M349 96H368" />
          </>
        )}
      </g>
    </svg>
  );
}
