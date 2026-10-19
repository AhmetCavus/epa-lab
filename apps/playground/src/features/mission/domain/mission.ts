import type { ActorGroup, FixtureEvent, InteractionChannel } from '../../protocol-flow/contracts';

export interface Checkpoint {
  readonly id: string;
  readonly title: string;
  readonly explanation: string;
  readonly actorIds: readonly string[];
}

export type MissionPreview =
  | {
      readonly kind: 'fixture';
      readonly note: string;
      readonly loadLabel: string;
      readonly events: readonly FixtureEvent[];
    }
  | {
      readonly kind: 'concept';
      readonly note: string;
    };

export interface Mission {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly outcome: string;
  readonly objective: string;
  readonly topics: readonly string[];
  readonly availability: 'Fixture preview' | 'Planned';
  readonly previewLabel: string;
  readonly illustration: 'identity' | 'protected-system';
  readonly groups: readonly ActorGroup[];
  readonly channels: readonly InteractionChannel[];
  readonly checkpoints: readonly Checkpoint[];
  readonly preview: MissionPreview;
}
