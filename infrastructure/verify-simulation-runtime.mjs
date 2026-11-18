import assert from 'node:assert/strict';

/** Runs only inside the disposable real-component browser harness. */
export async function verifySimulationRuntime(page, origin, runId) {
  const traffic = [];
  let watching = false;
  const observe = (request) => {
    const url = new URL(request.url());
    if (
      watching &&
      (request.resourceType() === 'fetch' ||
        request.resourceType() === 'xhr' ||
        /\/api\/|\/realms\/|\/fhir\/|\/epa\//.test(url.pathname))
    ) {
      traffic.push({ method: request.method(), path: url.pathname });
    }
  };
  page.on('request', observe);
  try {
    await page.locator('.mc-execution-selector a').first().click();
    await page.locator('[data-execution="simulation"]').waitFor();
    watching = true;
    assert.equal(
      await page.locator('.mc-resource-result').count(),
      0,
      'Real resource survived in simulation',
    );
    assert.equal(await page.locator('[data-runtime-action="logout"]').count(), 0);
    await page.locator('[data-runtime-action="start"]').first().click();
    for (let index = 0; index < 8; index += 1) {
      await page.locator('[data-runtime-action="advance"]').first().click();
    }
    await page.locator('[data-runtime-action="resource"]').click();
    await page.locator('.mc-resource-result[data-outcome="allowed"]').waitFor();
    assert.match(await page.locator('.mc-resource-result').textContent(), /SIMULATION/);
    await page.locator('.mc-header').getByRole('link', { name: 'Inspect', exact: true }).click();
    await page.locator('.timeline button').last().waitFor();
    assert.equal(await page.locator('.timeline button').count(), 11);
    assert.equal(await page.locator('.timeline time').count(), 0);
    await page.locator('.timeline button').first().click();
    assert.match(await page.locator('.inspector').textContent(), /SIMULIERT/);
    await page.locator('[data-runtime-action="reset"]').click();
    assert.equal(await page.locator('.timeline button').count(), 0);
    await page.reload();
    await page.locator('[data-runtime-action="start"]:enabled').first().waitFor();
    assert.equal(await page.locator('.timeline button').count(), 0);
    await page.locator('.mc-header').getByRole('link', { name: 'Explore', exact: true }).click();
    await page.locator('.mc-sidebar nav a').nth(1).click();
    await page.locator('[data-runtime-action="start"]:enabled').first().waitFor();
    await page.locator('[data-runtime-action="start"]').first().click();
    for (let index = 0; index < 7; index += 1) {
      await page.locator('[data-runtime-action="advance"]').first().click();
    }
    await page.locator('[data-runtime-action="resource"]').click();
    await page.locator('.mc-resource-result[data-outcome="conceptual"]').waitFor();
    assert.equal(await page.locator('.mc-resource-result pre').count(), 0);
    assert.equal(await page.locator('.mc-execution-selector a').count(), 1);
    await page.goBack();
    await page.locator('[data-runtime-action="start"]:enabled').first().waitFor();
    await page.goForward();
    await page.locator('[data-runtime-action="start"]:enabled').first().waitFor();
    assert.deepEqual(
      traffic,
      [],
      'Simulation attempted service traffic with a real authenticated cookie context',
    );
    watching = false;
    await page.goto(`${origin}/missions/oauth-oidc/workspace?execution=live`);
    await page.locator('[data-runtime-action="resource"]:enabled').waitFor();
    const actual = await page.evaluate(
      async () => (await (await fetch('/api/oauth/session')).json()).currentRun?.runId,
    );
    assert.equal(actual, runId, 'Simulation changed the real authenticated run');
    assert.equal(
      await page.locator('.mc-resource-result').count(),
      0,
      'Simulation payload leaked to live mode',
    );
    console.info(
      JSON.stringify({
        stage: 'real-cookie-simulation-isolation',
        result: 'passed',
        simulationServiceRequests: traffic.length,
        liveRunPreserved: true,
      }),
    );
  } finally {
    page.off('request', observe);
  }
}
