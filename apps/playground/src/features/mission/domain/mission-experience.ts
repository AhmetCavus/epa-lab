import type { FlowParticipant } from '../../protocol-flow/contracts';

export type ExecutionPhase = 'restoring' | 'ready' | 'navigating' | 'resource' | 'logout';

export type ExperienceStatus =
  | 'restoring'
  | 'anonymous'
  | 'navigating'
  | 'pending'
  | 'authenticated'
  | 'resource'
  | 'expired'
  | 'failed'
  | 'signed-out'
  | 'logout';

export interface MissionStage {
  readonly id: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly outcome: 'complete' | 'current' | 'pending' | 'unavailable' | 'failed';
}

export interface MissionExperience {
  readonly status: ExperienceStatus;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly tone: 'neutral' | 'success' | 'warning';
  readonly primaryAction: 'start' | 'resource' | null;
  readonly sessionActive: boolean;
  readonly currentRunAuthenticated: boolean;
  readonly hasRetainedAuthentication: boolean;
  readonly evidenceIncomplete: boolean;
  readonly stages: readonly MissionStage[];
  readonly participants: readonly FlowParticipant[];
}
