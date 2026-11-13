export interface Actor {
  readonly id: string;
  readonly labelKey: string;
  readonly roleKey: string;
  readonly descriptionKey: string;
}

export interface ActorGroup {
  readonly id: string;
  readonly labelKey: string;
  readonly actors: readonly Actor[];
}

export interface EvidenceField {
  readonly labelKey: string;
  readonly value:
    | { readonly kind: 'literal'; readonly value: string }
    | { readonly kind: 'text'; readonly key: string };
}

export interface MessageChannel {
  readonly kind: 'front' | 'back';
  readonly labelKey: string;
}

export interface InternalChannel {
  readonly kind: 'internal';
  readonly labelKey: string;
}

export type InteractionChannel = MessageChannel | InternalChannel;

interface FixtureContent {
  readonly id: string;
  readonly titleKey: string;
  readonly visibility: 'explained' | 'not-observable';
  readonly summaryKey: string;
  readonly explanationKey: string;
  readonly evidence: readonly EvidenceField[];
}

export type FixtureEvent = FixtureContent &
  (
    | {
        readonly kind: 'message';
        readonly sourceActorId: string;
        readonly targetActorId: string;
        readonly channel: MessageChannel;
      }
    | {
        readonly kind: 'internal';
        readonly actorId: string;
        readonly channel: InternalChannel;
        readonly visibility: 'not-observable';
      }
  );

export type ReportedEvidence =
  | { readonly available: false }
  | {
      readonly available: true;
      readonly reportedBy: string;
      readonly evidence: readonly EvidenceField[];
    };

export interface Observation {
  readonly runId: string;
  readonly sequence: number;
  readonly observedAt: string;
  readonly observedBy: string;
  readonly outcome: string;
  readonly outcomeKey: string;
}

export type ObservedEvent = Omit<FixtureContent, 'visibility'> & {
  readonly visibility: 'observed';
  readonly observation: Observation;
  readonly report?: ReportedEvidence;
} & (
    | {
        readonly kind: 'message';
        readonly sourceActorId: string;
        readonly targetActorId: string;
        readonly channel: MessageChannel;
      }
    | {
        readonly kind: 'internal';
        readonly actorId: string;
        readonly channel: InternalChannel;
      }
  );

export type FlowEvent = FixtureEvent | ObservedEvent;

export function interactionActorIds(interaction: FlowEvent): readonly string[] {
  if (interaction.kind === 'internal') {
    return [interaction.actorId];
  }

  return [interaction.sourceActorId, interaction.targetActorId];
}
