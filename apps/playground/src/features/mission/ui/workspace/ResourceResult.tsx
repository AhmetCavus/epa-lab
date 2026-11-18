import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { PresentedResourceResult } from '../../domain/synthetic-resource';
import { WorkspaceIcon } from './WorkspaceIcon';

const tabs = ['json', 'overview', 'metadata'] as const;
type Tab = (typeof tabs)[number];

export function ResourceResult({
  result: providedResult,
  loading,
  presentation = 'observed',
}: {
  result: PresentedResourceResult | null;
  loading: boolean;
  presentation?: 'observed' | 'simulated';
}) {
  const { t } = useTranslation('mission');
  const compatible = (providedResult?.source === 'simulated') === (presentation === 'simulated');
  const result = compatible ? providedResult : null;
  const [tab, setTab] = useState<Tab>('json');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const resource = result?.outcome === 'allowed' ? result.resource : undefined;
  const json = resource ? JSON.stringify(resource, null, 2) : '';
  const state = loading ? 'loading' : (result?.outcome ?? 'empty');
  const simulated = result?.source === 'simulated';

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    const selected = tabs[next];
    if (selected) {
      setTab(selected);
      tabRefs.current[next]?.focus();
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <section
      className="mc-resource-result"
      data-outcome={state}
      aria-label={t('control.results.heading')}
    >
      <div className="mc-resource-summary">
        <div className="mc-result-state" role="status" aria-atomic="true">
          <WorkspaceIcon name={state === 'allowed' ? 'check' : 'shield'} />
          <div>
            <h3>
              {simulated && t('execution.simulation')} {result?.status}{' '}
              {t(
                state === 'conceptual'
                  ? 'simulation.epa.conceptualOutcome'
                  : `control.results.states.${state}`,
              )}
            </h3>
            <p className="mc-resource-message">
              {t(result?.messageKey ?? 'control.results.loading')}
            </p>
          </div>
        </div>
        {result && (
          <dl>
            <div>
              <dt>{t('control.results.source')}</dt>
              <dd>
                {t(simulated ? 'execution.simulation' : `control.results.sources.${result.source}`)}
              </dd>
            </div>
            {resource && (
              <>
                <div>
                  <dt>{t('control.form.type')}</dt>
                  <dd>{resource.resourceType}</dd>
                </div>
                <div>
                  <dt>{t('control.form.id')}</dt>
                  <dd>{resource.id}</dd>
                </div>
              </>
            )}
          </dl>
        )}
        {result?.outcome === 'throttled' && (
          <p>
            {result.retryAfterSeconds
              ? t('control.results.retryAfter', { seconds: result.retryAfterSeconds })
              : t('control.results.retryUnknown')}
          </p>
        )}
      </div>
      {state !== 'conceptual' && (
        <div className="mc-resource-viewer">
          <div className="mc-result-tabs" role="tablist" aria-label={t('control.results.views')}>
            {tabs.map((entry, index) => (
              <button
                key={entry}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                id={`mc-result-${entry}-tab`}
                role="tab"
                aria-selected={tab === entry}
                aria-controls={`mc-result-${entry}`}
                tabIndex={tab === entry ? 0 : -1}
                onClick={() => setTab(entry)}
                onKeyDown={(event) => navigateTabs(event, index)}
              >
                {t(`control.results.tabs.${entry}`)}
              </button>
            ))}
          </div>
          <div
            className="mc-result-content"
            role="tabpanel"
            id={`mc-result-${tab}`}
            aria-labelledby={`mc-result-${tab}-tab`}
            tabIndex={0}
          >
            {tab === 'json' && (
              <>
                {resource ? (
                  <>
                    <button className="mc-button mc-copy" onClick={() => void copyJson()}>
                      {t('control.results.copy')}
                    </button>
                    <pre tabIndex={0} role="region" aria-label={t('control.results.safeJson')}>
                      <code>
                        {json.split('\n').map((line, index) => (
                          <span className="mc-json-line" key={index}>
                            {formatJsonLine(line)}
                            {'\n'}
                          </span>
                        ))}
                      </code>
                    </pre>
                  </>
                ) : (
                  <p>{t(loading ? 'control.results.loading' : 'control.results.noPayload')}</p>
                )}
              </>
            )}
            {tab === 'overview' && (
              <>
                {resource ? (
                  <>
                    <h4>{resource.code.coding[0].display}</h4>
                    <p>{resource.code.text}</p>
                    <dl>
                      <div>
                        <dt>{t('control.results.coding')}</dt>
                        <dd>{resource.code.coding[0].code}</dd>
                      </div>
                      <div>
                        <dt>{t('control.results.system')}</dt>
                        <dd>
                          <code>{resource.code.coding[0].system}</code>
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <p>{t('control.results.noPayload')}</p>
                )}
              </>
            )}
            {tab === 'metadata' && (
              <dl>
                <div>
                  <dt>{t('control.results.version')}</dt>
                  <dd>{resource?.meta?.versionId ?? t('control.results.unavailable')}</dd>
                </div>
                <div>
                  <dt>{t('control.results.updated')}</dt>
                  <dd>{resource?.meta?.lastUpdated ?? t('control.results.unavailable')}</dd>
                </div>
                <div>
                  <dt>{t('control.results.measurements')}</dt>
                  <dd>{t('control.results.unmeasured')}</dd>
                </div>
                <div>
                  <dt>{t('control.results.projection')}</dt>
                  <dd>
                    {t(
                      simulated
                        ? 'simulation.resourceDescription'
                        : 'control.results.projectionNote',
                    )}
                  </dd>
                </div>
              </dl>
            )}
            <p className="sr-only" role="status">
              {copyState !== 'idle' ? t(`control.results.${copyState}`) : ''}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function formatJsonLine(line: string) {
  const match = line.match(/^(\s*)("[^"]+")(: )(.*)$/);
  if (!match) return line;
  return (
    <>
      {match[1]}
      <span className="mc-json-key">{match[2]}</span>
      {match[3]}
      <span className={match[4]?.startsWith('"') ? 'mc-json-string' : undefined}>{match[4]}</span>
    </>
  );
}
