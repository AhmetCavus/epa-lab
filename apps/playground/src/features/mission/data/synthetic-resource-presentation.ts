import type { ResourceReadResult, SyntheticBasic } from '../domain/synthetic-resource';
import type { readSelectedOAuthResource } from './oauth-api';

export function presentSelectedResource({
  status,
  result,
}: Awaited<ReturnType<typeof readSelectedOAuthResource>>): ResourceReadResult {
  const common = { status, source: result.source };
  if (result.outcome === 'allowed') {
    const { meta, ...resource } = result.resource;
    const safeResource: SyntheticBasic = {
      ...resource,
      ...(meta
        ? {
            meta: {
              ...(meta.versionId !== undefined ? { versionId: meta.versionId } : {}),
              ...(meta.lastUpdated !== undefined ? { lastUpdated: meta.lastUpdated } : {}),
            },
          }
        : {}),
    };
    return {
      ...common,
      outcome: 'allowed',
      resource: safeResource,
      messageKey: 'mission:control.results.allowed',
    };
  }
  if (result.outcome === 'denied')
    return {
      ...common,
      outcome: 'denied',
      messageKey:
        status === 403
          ? 'mission:runtime.resource.permission-denied'
          : 'mission:runtime.resource.token-denied',
    };
  if (result.outcome === 'throttled')
    return {
      ...common,
      outcome: 'throttled',
      retryAfterSeconds: result.retryAfterSeconds,
      messageKey: 'mission:control.results.throttled',
    };
  if (result.outcome === 'not-found')
    return { ...common, outcome: 'not-found', messageKey: 'mission:control.results.notFound' };
  if (result.outcome === 'rejected')
    return {
      ...common,
      outcome: 'rejected',
      messageKey:
        status === 403
          ? 'mission:control.results.selectionRejected'
          : 'mission:control.results.sessionRejected',
    };
  return {
    ...common,
    outcome: 'unavailable',
    messageKey: `mission:runtime.resource.${result.reason}`,
  };
}
