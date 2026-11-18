import { expect, test } from '@playwright/test';
import { missions, workspacePaths } from '../src/features/mission/application/mission-catalog';

test('catalog declares simulation for both missions and live only for enabled OAuth', () => {
  for (const mission of missions) {
    const paths = workspacePaths(mission, true);
    expect(paths.simulation).toBe(`/missions/${mission.id}/workspace?execution=simulation`);
    expect(paths.live).toBe(
      mission.execution ? `/missions/${mission.id}/workspace?execution=live` : undefined,
    );
    const disabled = workspacePaths(mission, false);
    expect(disabled.simulation).toBe(paths.simulation);
    expect(disabled.live).toBeUndefined();
  }
});

test('legacy path helpers keep bare live destinations and fixture aliases compatible', () => {
  const oauth = missions.find((mission) => mission.id === 'oauth-oidc');
  const epa = missions.find((mission) => mission.id === 'epa-concept');
  expect(oauth).toBeDefined();
  expect(epa).toBeDefined();
  if (!oauth || !epa) {
    throw new Error('Missing existing mission');
  }
  expect(workspacePaths(oauth, true).execution).toBe('/missions/oauth-oidc/workspace');
  expect(workspacePaths(oauth, true).preview).toBe('/missions/oauth-oidc/workspace?view=fixture');
  expect(workspacePaths(epa, true).execution).toBeUndefined();
  expect(workspacePaths(epa, true).preview).toBe('/missions/epa-concept/workspace');
});
