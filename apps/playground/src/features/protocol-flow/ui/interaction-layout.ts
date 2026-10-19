import type { Actor, ActorGroup } from '../domain/protocol-flow';

const ACTOR_LANE_WIDTH = 120;
const GROUP_GAP = 8;

export interface ActorLane {
  readonly actor: Actor;
  readonly x: number;
}

export interface CanvasLayout {
  readonly groups: readonly { group: ActorGroup; width: number }[];
  readonly lanes: readonly ActorLane[];
  readonly width: number;
}

export function createCanvasLayout(groups: readonly ActorGroup[]): CanvasLayout {
  const lanes: ActorLane[] = [];
  let nextGroupX = 0;
  const groupLayouts = groups.map((group) => {
    const width = group.actors.length * ACTOR_LANE_WIDTH;

    group.actors.forEach((actor, index) => {
      lanes.push({ actor, x: nextGroupX + ACTOR_LANE_WIDTH * (index + 0.5) });
    });

    nextGroupX += width + GROUP_GAP;
    return { group, width };
  });

  return {
    groups: groupLayouts,
    lanes,
    width: Math.max(ACTOR_LANE_WIDTH, nextGroupX - GROUP_GAP),
  };
}
