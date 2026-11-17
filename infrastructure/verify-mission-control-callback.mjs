import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { availablePort, verifyIsolatedPublicRealm } from './keycloak/verify-public-realm.mjs';
import { adminApi, standardSettings } from './keycloak/standard-client.mjs';

// Never attach this UX verification to a prepared/live PostgreSQL database.
assert.equal(process.env.KEYCLOAK_POSTGRES_ENV_FILE, undefined);
process.env.KEYCLOAK_ISOLATED_IMAGE =
  'quay.io/keycloak/keycloak@sha256:4da21f9a53bcbac1026a0d654b740a81e98e5de4c45457076acc74b4d94b1551';
const uiRequire = createRequire(new URL('../apps/playground/package.json', import.meta.url));
const backendRequire = createRequire(
  new URL('../services/auth-client/package.json', import.meta.url),
);
const { chromium } = uiRequire('playwright');
const { createServer } = await import('../apps/playground/node_modules/vite/dist/node/index.js');
const root = fileURLToPath(new URL('../apps/playground/', import.meta.url));

try {
  await verifyIsolatedPublicRealm(async ({ env, kcPort, directory, secrets }) => {
    const port = await availablePort();
    const origin = `http://127.0.0.1:${port}`;
    const issuer = `http://127.0.0.1:${kcPort}/realms/epa-demo`;
    const api = await adminApi(standardSettings(env));
    const [client] = await api('/clients?clientId=playground-oidc');
    const prior = await api(`/clients/${client.id}`);
    const diagnostics = [];
    const counts = { login: 0, resource: 0, logout: 0 };
    let app, vite, browser;
    let stage = 'isolated-binding';
    try {
      // Only the disposable provider's exact callback is rebound for this loopback test.
      await api(`/clients/${client.id}`, 'PUT', { redirectUris: [`${origin}/api/oauth/callback`] });
      Object.assign(process.env, {
        HOST: '127.0.0.1',
        PORT: String(port),
        OIDC_ISSUER: issuer,
        OIDC_CLIENT_ID: env.OIDC_CLIENT_ID,
        OIDC_CLIENT_SECRET: env.OIDC_CLIENT_SECRET,
        OIDC_DEFAULT_REDIRECT_URI: env.OIDC_DEFAULT_REDIRECT_URI,
        OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify([env.OIDC_DEFAULT_REDIRECT_URI]),
        OIDC_ALLOW_PRIVATE_NETWORK_HTTP: 'false',
        PLAYGROUND_OIDC_ENABLED: 'true',
        PLAYGROUND_PUBLIC_RUNTIME: 'false',
        PLAYGROUND_APP_ORIGIN: origin,
        PLAYGROUND_OIDC_ISSUER: issuer,
        PLAYGROUND_OIDC_CLIENT_ID: 'playground-oidc',
        PLAYGROUND_OIDC_CLIENT_SECRET: env.PLAYGROUND_OIDC_CLIENT_SECRET,
        PLAYGROUND_OIDC_REDIRECT_URI: `${origin}/api/oauth/callback`,
        PLAYGROUND_FHIR_RESOURCE_URL: 'http://127.0.0.1:1/fhir/Basic/playground-demo',
      });
      delete process.env.PLAYGROUND_PUBLIC_PROXY_ADDRESSES;
      backendRequire('reflect-metadata');
      const { NestFactory } = backendRequire('@nestjs/core');
      const { AppModule } = backendRequire('./dist/app.module.js');
      const { AuthorizationErrorFilter } = backendRequire(
        './dist/common/errors/authorization-error.filter.js',
      );
      const { configureRequestLogging } = backendRequire(
        './dist/common/logging/request-logging.js',
      );
      const logger = Object.fromEntries(
        ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'].map((key) => [
          key,
          (...args) => diagnostics.push(args),
        ]),
      );
      app = await NestFactory.create(AppModule, { logger, abortOnError: false });
      app.useGlobalFilters(new AuthorizationErrorFilter());
      configureRequestLogging(app);
      await app.listen(0, '127.0.0.1');
      const backendPort = app.getHttpServer().address().port;
      process.env.PLAYGROUND_PRIVATE_ORIGIN = origin;
      process.env.PLAYGROUND_BFF_TARGET = `http://127.0.0.1:${backendPort}`;
      vite = await createServer({
        root,
        mode: 'private',
        server: { host: '127.0.0.1', port, strictPort: true },
      });
      await vite.listen();
      browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
      page.on('console', (message) => diagnostics.push(message.text()));
      page.on('request', (request) => {
        const url = new URL(request.url());
        const operation = url.pathname.slice('/api/oauth/'.length);
        if (url.origin === origin && operation in counts) counts[operation] += 1;
      });
      const workspace = `${origin}/missions/oauth-oidc/workspace`;
      stage = 'real-provider-redirect';
      await page.goto(workspace);
      await page.locator('[data-runtime-action="start"]:enabled').click();
      await page.locator('#username').waitFor();
      assert.equal(new URL(page.url()).origin, new URL(issuer).origin);
      await page.locator('#username').fill('demo-versicherte');
      await page.locator('#password').fill(env.TEST_USER_PASSWORD);
      await page.locator('#kc-login').click();
      stage = 'clean-return';
      await page.waitForURL((url) => url.href === workspace);
      await page.locator('[data-runtime-action="resource"]:enabled').waitFor();
      assert.deepEqual(counts, { login: 1, resource: 0, logout: 0 });
      await page
        .getByRole('navigation', { name: 'Explore-Bereiche', exact: true })
        .getByRole('link', { name: 'Ablauf & Details', exact: true })
        .click();
      stage = 'recorded-callback-reconstruction';
      await page.waitForFunction(
        () =>
          document.querySelector('.flow-transport')?.getAttribute('data-playback-index') === '0',
      );
      assert.equal(await page.locator('.flow-transport').getAttribute('data-playing'), 'false');
      assert.equal(await page.locator('.flow-overview button').count(), 9);
      await page.locator('.flow-overview button').nth(2).click();
      assert.equal(await page.locator('.flow-path > path').getAttribute('data-source'), 'browser');
      assert.equal(await page.locator('.flow-path > path').getAttribute('data-target'), 'bff');
      await page.reload();
      await page.waitForFunction(
        () =>
          document.querySelector('.flow-transport')?.getAttribute('data-playback-index') === '0',
      );
      assert.equal(await page.locator('.flow-transport').getAttribute('data-playing'), 'false');
      assert.deepEqual(counts, { login: 1, resource: 0, logout: 0 });
      const rendered = await page.locator('body').textContent();
      assert.ok(![...secrets].some((secret) => secret.length > 12 && rendered.includes(secret)));
      assert.ok(
        ![...secrets].some(
          (secret) => secret.length > 12 && JSON.stringify(diagnostics).includes(secret),
        ),
      );
      await page.screenshot({
        path: `${directory}/mission-control-real-callback.png`,
        fullPage: true,
      });
      const result = {
        verified: true,
        provider: 'isolated Keycloak 26.8.2; tmpfs only',
        realBff: true,
        cleanReturn: true,
        recordedEvents: 9,
        pausedAfterCallbackAndReload: true,
        callback: 'Browser -> BFF',
        noPreliminaryResourceRequest: true,
        counts,
      };
      await writeFile(
        `${directory}/mission-control-callback.json`,
        JSON.stringify(result, null, 2),
        { mode: 0o600 },
      );
      console.info(
        JSON.stringify({ missionControlCallback: result, evidenceDirectory: directory }),
      );
      return result;
    } catch {
      throw new Error(`Mission Control callback verification failed at ${stage}`);
    } finally {
      await browser?.close();
      await vite?.close();
      await app?.close();
      const cleanupApi = await adminApi(standardSettings(env));
      await cleanupApi(`/clients/${client.id}`, 'PUT', { redirectUris: prior.redirectUris });
    }
  });
} catch {
  process.exitCode = 1;
}
