export interface Actor {
  readonly id: string;
  readonly label: string;
  readonly role: string;
  readonly description: string;
}

export interface ActorGroup {
  readonly id: string;
  readonly label: string;
  readonly actors: readonly Actor[];
}

export interface EvidenceField {
  readonly label: string;
  readonly value: string;
}

export interface MessageChannel {
  readonly kind: 'front' | 'back';
  readonly label: string;
}

export interface InternalChannel {
  readonly kind: 'internal';
  readonly label: string;
}

export type InteractionChannel = MessageChannel | InternalChannel;

interface FixtureContent {
  readonly id: string;
  readonly title: string;
  readonly visibility: 'Explained' | 'Not observable';
  readonly summary: string;
  readonly explanation: string;
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
        readonly visibility: 'Not observable';
      }
  );

export function interactionActorIds(interaction: FixtureEvent): readonly string[] {
  if (interaction.kind === 'internal') {
    return [interaction.actorId];
  }

  return [interaction.sourceActorId, interaction.targetActorId];
}
