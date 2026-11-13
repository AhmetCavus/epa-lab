import type { EvidenceField, ObservedEvent, ReportedEvidence } from '../../protocol-flow/contracts';
import type { OAuthEvent, ResourceServerReport } from './oauth-contract';

const evidenceLabels = {
  responseType: 'mission:runtime.evidence.responseType',
  pkceMethod: 'mission:runtime.evidence.pkceMethod',
  authorizationMode: 'mission:runtime.evidence.authorizationMode',
  httpStatus: 'mission:runtime.evidence.httpStatus',
  destinationActorId: 'mission:runtime.evidence.destinationActorId',
  reason: 'mission:runtime.evidence.reason',
  correlation: 'mission:runtime.evidence.correlation',
  response: 'mission:runtime.evidence.response',
  grantType: 'mission:runtime.evidence.grantType',
  tokenPurpose: 'mission:runtime.evidence.tokenPurpose',
  contextRotated: 'mission:runtime.evidence.contextRotated',
  target: 'mission:runtime.evidence.target',
  authenticationRemoved: 'mission:runtime.evidence.authenticationRemoved',
  operation: 'mission:runtime.evidence.operation',
  method: 'mission:runtime.evidence.method',
};

function projectEvidence(event: OAuthEvent): readonly EvidenceField[] {
  const evidence: Readonly<Record<string, unknown>> = event.evidence;
  return Object.entries(evidenceLabels).flatMap(([name, labelKey]) => {
    const value = evidence[name];
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      return [];
    }
    return [{ labelKey, value: { kind: 'literal' as const, value: String(value) } }];
  });
}

function projectReport(report: ResourceServerReport): ReportedEvidence {
  if (!report.available) {
    return { available: false };
  }
  return {
    available: true,
    reportedBy: report.reportedBy,
    evidence: [
      {
        labelKey: 'mission:runtime.evidence.decision',
        value: { kind: 'literal', value: report.decision },
      },
      {
        labelKey: 'mission:runtime.evidence.reason',
        value: { kind: 'literal', value: report.reason },
      },
    ],
  };
}

/** Only validated mission DTOs enter the neutral renderer; no wire object or body is retained. */
export function projectOAuthEvent(event: OAuthEvent): ObservedEvent {
  const content = {
    id: event.eventId,
    visibility: 'observed' as const,
    titleKey: `mission:runtime.events.${event.kind}.title`,
    summaryKey: `mission:runtime.events.${event.kind}.summary`,
    explanationKey: `mission:runtime.events.${event.kind}.explanation`,
    evidence: projectEvidence(event),
    observation: {
      runId: event.runId,
      sequence: event.sequence,
      observedAt: event.observedAt,
      observedBy: event.observedBy,
      outcome: event.outcome,
      outcomeKey: `mission:runtime.outcomes.${event.outcome}`,
    },
    ...(event.kind === 'resource-response-received'
      ? { report: projectReport(event.evidence.resourceServerReport) }
      : {}),
  };
  if (event.channel === 'actor-local') {
    return {
      ...content,
      kind: 'internal',
      actorId: event.actorId,
      channel: { kind: 'internal', labelKey: 'protocol-flow:channels.local' },
    };
  }
  const channel = event.channel === 'front-channel' ? 'front' : 'back';
  return {
    ...content,
    kind: 'message',
    sourceActorId: event.sourceActorId,
    targetActorId: event.targetActorId,
    channel: { kind: channel, labelKey: `protocol-flow:channels.${channel}` },
  };
}

export function lastResourceOutcome(events: readonly OAuthEvent[]): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    switch (event?.kind) {
      case 'resource-allowed':
        return 'mission:runtime.resource.allowed';
      case 'resource-denied':
        return event.evidence.httpStatus === 403
          ? 'mission:runtime.resource.permission-denied'
          : 'mission:runtime.resource.token-denied';
      case 'resource-rejected':
        return 'mission:runtime.resource.local-rejection';
      case 'resource-failed':
        return `mission:runtime.resource.${event.evidence.reason}`;
    }
  }
  return undefined;
}
