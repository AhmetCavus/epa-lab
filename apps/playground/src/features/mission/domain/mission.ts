import type { ActorGroup, FixtureEvent, InteractionChannel } from '../../protocol-flow/contracts';

export interface Checkpoint {
  readonly id: string;
  readonly titleKey: string;
  readonly explanationKey: string;
  readonly actorIds: readonly string[];
}

export type MissionPreview =
  | {
      readonly kind: 'fixture';
      readonly noteKey: string;
      readonly loadLabelKey: string;
      readonly events: readonly FixtureEvent[];
    }
  | {
      readonly kind: 'concept';
      readonly noteKey: string;
    };

export interface Mission {
  readonly id: string;
  readonly titleKey: string;
  readonly subtitleKey: string;
  readonly outcomeKey: string;
  readonly objectiveKey: string;
  readonly topicKeys: readonly string[];
  readonly availability: 'fixture' | 'planned';
  readonly previewLabelKey: string;
  readonly illustration: 'identity' | 'protected-system';
  readonly groups: readonly ActorGroup[];
  readonly channels: readonly InteractionChannel[];
  readonly checkpoints: readonly Checkpoint[];
  readonly preview: MissionPreview;
}
