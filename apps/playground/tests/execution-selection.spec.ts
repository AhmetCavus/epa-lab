import { expect, test } from '@playwright/test';
import { missions } from '../src/features/mission/application/mission-catalog';
import { resolveMissionExecution } from '../src/features/mission/domain/mission-execution';
import { privateBaseUrl, runtimeFixture, workspacePath } from './oauth-runtime-fixture';

test('execution resolution preserves bare callbacks and fixture precedence while failing closed', () => {
  for (const mission of missions) {
    const live = mission.execution === 'oauth-standard';
    expect(resolveMissionExecution(mission, true, [], false)).toBe(live ? 'live' : 'simulation');
    expect(resolveMissionExecution(mission, false, [], false)).toBe('simulation');
    expect(resolveMissionExecution(mission, true, ['live'], false)).toBe(
      live ? 'live' : 'unavailable',
    );
    expect(resolveMissionExecution(mission, false, ['live'], false)).toBe('unavailable');
    for (const values of [[''], ['invalid'], ['simulation', 'live'], ['live', 'live']]) {
      expect(resolveMissionExecution(mission, true, values, false)).toBe('unavailable');
    }
    for (const values of [[], ['live'], ['invalid'], ['live', 'simulation']]) {
      expect(resolveMissionExecution(mission, true, values, true)).toBe('simulation');
    }
    expect(resolveMissionExecution(mission, true, ['simulation'], false)).toBe('simulation');
  }
});

test.use({ baseURL: privateBaseUrl, trace: 'off' });

test('invalid and unsupported execution never initialize a live adapter', async ({ page }) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  for (const path of [
    `${workspacePath}?execution=other`,
    `${workspacePath}?execution=live&execution=simulation`,
    '/missions/epa-concept/workspace?execution=live',
    'http://127.0.0.1:4173/missions/oauth-oidc/workspace?execution=live',
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole('heading', { name: 'Ausführungsart nicht verfügbar' }),
    ).toBeVisible();
    expect(fixture.calls).toEqual([]);
  }
});

test('explicit simulation and fixture aliases survive view navigation without live reads', async ({
  page,
}) => {
  const fixture = runtimeFixture();
  await fixture.install(page);
  for (const query of ['execution=simulation', 'execution=live&view=fixture']) {
    await page.goto(`${workspacePath}?${query}`);
    const navigation = page.locator('.mc-header');
    await navigation.getByRole('link', { name: 'Inspect', exact: true }).click();
    await expect(page).toHaveURL(/mode=inspect/);
    await expect(page).toHaveURL(/execution=/);
    await page.goBack();
    await page.goForward();
    expect(fixture.calls).toEqual([]);
  }
});
