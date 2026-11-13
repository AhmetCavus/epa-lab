import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import {
  oauthEventDocumentSchema,
  oauthSessionSchema,
} from '../src/features/mission/data/oauth-contract.ts';
import { adminApi, standardSettings } from '../../../infrastructure/keycloak/standard-client.mjs';
import { preservationSnapshot } from '../../../infrastructure/keycloak/run-verification.mjs';

if (process.env.PLAYGROUND_VERIFY_PRIVATE !== 'true') {
  throw new Error('Set PLAYGROUND_VERIFY_PRIVATE=true for this isolated real verification');
}

const environment = parseEnv(await readFile(new URL('../../../.env', import.meta.url), 'utf8'));
const backendRequire = createRequire(
  new URL('../../../services/auth-client/package.json', import.meta.url),
);
const output = resolve('.cache/oidc-runtime/real');
await mkdir(output, { recursive: true, mode: 0o700 });
const secrets = new Set(
  Object.entries(environment)
    .filter(([key, value]) => /SECRET|PASSWORD/.test(key) && value)
    .map(([, value]) => value),
);
const username = `spa-runtime-${randomBytes(8).toString('hex')}`;
const password = randomBytes(32).toString('base64url');
secrets.add(username);
secrets.add(password);
const capturedLogs = [];
const operations = [];
let assertionFailure;
let stage = 'configuration';
let app;
let vite;
let browser;
let page;
let api;
let baseline;
let identityCreated = false;
let failure = false;
let transportFailed = false;
let parCalls = 0;
let resourceCalls = 0;
let loginNavigations = 0;
let runId;
const originalFetch = globalThis.fetch;
const result = { scope: 'tasks-8.1-through-8.6-focused-private-spa', verified: false };

function check(condition, reason) {
  if (!condition) assertionFailure = reason;
  assert.ok(Boolean(condition), reason);
}

function remember(value) {
  if (typeof value === 'string' && value.length >= 8) secrets.add(value);
}

async function safeSurface(page) {
  const rendered = await page.locator('body').textContent();
  check(
    ![...secrets].some((value) => rendered?.includes(value)),
    'Rendered surface contains restricted material',
  );
  const stored = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: sessionStorage.length,
    visibleCookies: document.cookie,
  }));
  check(stored.session === 0 && stored.visibleCookies === '', 'Unexpected browser persistence');
  check(
    stored.local.every(
      ([key, value]) => key === 'auth-protocol-playground.locale' && ['de', 'en'].includes(value),
    ),
    'Unexpected local persistence',
  );
}

try {
  for (const [key, value] of Object.entries(environment)) {
    if (/^(OIDC_|PLAYGROUND_|KEYCLOAK_)/.test(key)) process.env[key] = value;
  }
  const callback = new URL(environment.PLAYGROUND_OIDC_REDIRECT_URI);
  const origin = callback.origin;
  const issuerOrigin = new URL(environment.OIDC_ISSUER).origin;
  const resourceUrl = 'http://127.0.0.1:18083/fhir/Basic/playground-demo';
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '3000';
  process.env.PLAYGROUND_OIDC_ENABLED = 'true';
  process.env.PLAYGROUND_APP_ORIGIN = origin;
  process.env.PLAYGROUND_FHIR_RESOURCE_URL = resourceUrl;
  process.env.KEYCLOAK_ADMIN_URL = 'http://127.0.0.1:5555';

  stage = 'private-provider-and-fictional-identity';
  api = await adminApi(standardSettings());
  baseline = await preservationSnapshot(api);
  await api('/users', 'POST', {
    username,
    enabled: true,
    firstName: 'Fictional',
    lastName: 'SpaVerifier',
    email: `${username}@example.invalid`,
    requiredActions: [],
    credentials: [{ type: 'password', value: password, temporary: false }],
  });
  identityCreated = true;

  stage = 'temporary-existing-bff';
  backendRequire('reflect-metadata');
  const { NestFactory } = backendRequire('@nestjs/core');
  const { AppModule } = backendRequire('./dist/app.module.js');
  const { AuthorizationErrorFilter } = backendRequire(
    './dist/common/errors/authorization-error.filter.js',
  );
  const { configureRequestLogging } = backendRequire('./dist/common/logging/request-logging.js');
  const { TokenService } = backendRequire('./dist/oidc/token.service.js');
  const { OidcClientService } = backendRequire('./dist/oidc/oidc-client.service.js');
  const logger = Object.fromEntries(
    ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'].map((name) => [
      name,
      (...args) => capturedLogs.push(args),
    ]),
  );
  app = await NestFactory.create(AppModule, { logger, abortOnError: false });
  configureRequestLogging(app);
  app.useGlobalFilters(new AuthorizationErrorFilter());
  const tokens = app.get(TokenService);
  const exchange = tokens.exchange.bind(tokens);
  tokens.exchange = async (...args) => {
    for (const value of [args[1]?.state, args[1]?.nonce, args[1]?.codeVerifier, args[2]])
      remember(value);
    const login = await exchange(...args);
    for (const key of ['access_token', 'id_token', 'refresh_token']) remember(login.tokens[key]);
    return login;
  };
  const client = app.get(OidcClientService);
  const requestJson = client.requestJson.bind(client);
  client.requestJson = (...args) => {
    if (args[1] === 201) parCalls += 1;
    remember(new Headers(args[2]?.headers).get('authorization'));
    remember(args[2]?.body);
    return requestJson(...args);
  };
  globalThis.fetch = (...args) => {
    if (args[0] === resourceUrl) resourceCalls += 1;
    remember(new Headers(args[1]?.headers).get('authorization'));
    return originalFetch(...args);
  };
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  check(address && typeof address !== 'string', 'Temporary BFF address unavailable');

  stage = 'temporary-private-vite';
  process.env.PLAYGROUND_PRIVATE_ORIGIN = origin;
  process.env.PLAYGROUND_BFF_TARGET = `http://127.0.0.1:${address.port}`;
  vite = await createServer({
    mode: 'private',
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    plugins: [
      {
        name: 'verification-canonical-browser-origin',
        configureServer(server) {
          // Browser HTTP proxy transport for this test only. Reuse Vite's existing
          // same-origin API proxy; reject every target except the configured app origin.
          server.middlewares.use((request, response, next) => {
            const incoming = new URL(request.url ?? '/', origin);
            if (incoming.origin !== origin || request.headers.host !== callback.host) {
              response.writeHead(403).end();
              return;
            }
            request.url = incoming.pathname + incoming.search;
            for (const pair of (request.headers.cookie ?? '').split(';')) {
              remember(pair.trim().split('=').slice(1).join('='));
            }
            for (const key of ['code', 'state', 'session_state']) {
              remember(incoming.searchParams.get(key));
            }
            if (incoming.pathname.startsWith('/api/oauth/')) {
              const endpoint = incoming.pathname.endsWith('/events')
                ? 'events'
                : incoming.pathname.slice('/api/oauth/'.length);
              const operation = [
                'login',
                'callback',
                'session',
                'resource',
                'logout',
                'events',
              ].includes(endpoint)
                ? endpoint
                : 'other';
              response.once('finish', () =>
                operations.push({
                  operation,
                  status: response.statusCode,
                  method: request.method,
                  contextCookie: /(?:^|;\s*)playground_context=/.test(request.headers.cookie ?? ''),
                  bindingCookie: /(?:^|;\s*)playground_login=/.test(request.headers.cookie ?? ''),
                }),
              );
            }
            next();
          });
        },
      },
    ],
  });
  await vite.listen();
  const viteAddress = vite.httpServer?.address();
  check(viteAddress && typeof viteAddress !== 'string', 'Private Vite address unavailable');
  const localViteOrigin = `http://127.0.0.1:${viteAddress.port}`;

  stage = 'isolated-browser-transport';
  browser = await chromium.launch({
    proxy: { server: localViteOrigin, bypass: new URL(environment.OIDC_ISSUER).host },
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  context.setDefaultTimeout(15000);
  context.setDefaultNavigationTimeout(20000);
  // Native browser proxying preserves the registered origin across redirect chains.
  // No request interception, callback rewrite or provider/security override is used.
  page = await context.newPage();
  page.on('request', (request) => {
    const target = new URL(request.url());
    if (
      target.origin === origin &&
      target.pathname === '/api/oauth/login' &&
      request.isNavigationRequest()
    ) {
      loginNavigations += 1;
    }
  });
  page.on('response', (response) => {
    if (
      response.request().isNavigationRequest() &&
      new URL(response.url()).origin === issuerOrigin
    ) {
      const location = response.headers().location;
      const destination = location ? new URL(location, response.url()) : undefined;
      operations.push({
        operation: 'provider-document',
        status: response.status(),
        returnsToApplication: destination?.origin === origin,
        callbackPath: destination?.pathname === '/api/oauth/callback',
      });
    }
  });
  page.on('requestfailed', (request) => {
    if (request.isNavigationRequest()) {
      const reason = request.failure()?.errorText ?? '';
      operations.push({
        operation: 'navigation-failure',
        reason: /^net::ERR_[A-Z_]+$/.test(reason) ? reason : 'unavailable',
      });
    }
  });
  page.on('console', (message) => capturedLogs.push(['browser', message.type(), message.text()]));
  page.on('pageerror', () => {
    transportFailed = true;
  });
  const workspace = `${origin}/missions/oauth-oidc/workspace`;
  await page.goto(workspace);
  await page.locator('[data-runtime-action="start"]:enabled').waitFor();
  check((await page.locator('html').getAttribute('lang')) === 'de', 'German default unavailable');
  check((await page.locator('.timeline button').count()) === 0, 'Anonymous run fabricated events');

  stage = 'real-keycloak-login-and-clean-return';
  await page.locator('[data-runtime-action="start"]').click();
  stage = 'provider-login-form';
  await page.locator('#username').waitFor();
  check(
    new URL(page.url()).origin === issuerOrigin,
    'Login is not supplied by the configured provider',
  );
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  stage = 'provider-login-submit';
  await page.locator('#kc-login').click();
  stage = 'clean-workspace-return';
  await page.waitForURL(
    (url) =>
      url.origin === origin &&
      url.pathname === '/missions/oauth-oidc/workspace' &&
      url.search === '',
  );
  stage = 'restored-authenticated-run';
  await page.locator('[data-runtime-action="resource"]:enabled').waitFor();
  check(
    (await page.locator('.timeline button').count()) === 9,
    'Login observation sequence unavailable',
  );
  const ids = await page
    .locator('.interaction-target')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute('data-event-id')));
  runId = await page.locator('.runtime-status code').textContent();
  remember(
    oauthSessionSchema.parse(
      await page.evaluate(async () =>
        (
          await fetch('/api/oauth/session', { credentials: 'same-origin', cache: 'no-store' })
        ).json(),
      ),
    ).csrfToken,
  );
  await safeSurface(page);

  stage = 'read-only-refresh-and-localization';
  await page.reload();
  await page.locator('[data-runtime-action="resource"]:enabled').waitFor();
  check(
    (await page.locator('.runtime-status code').textContent()) === runId,
    'Refresh changed the run',
  );
  check(
    JSON.stringify(
      await page
        .locator('.interaction-target')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-event-id')),
        ),
    ) === JSON.stringify(ids),
    'Refresh changed event identities',
  );
  await page.getByRole('combobox').selectOption('en');
  await page.locator('.timeline button').nth(6).click();
  check(
    (await page.locator('.inspector .provenance').textContent())?.includes('auth-client'),
    'Actual observer unavailable',
  );
  check(
    parCalls === 0 && resourceCalls === 0 && loginNavigations === 1,
    'Viewing repeated a protocol operation',
  );

  stage = 'real-secured-synthetic-resource';
  await page.locator('[data-runtime-action="resource"]').click();
  await page
    .getByText('Last resource outcome: synthetic Basic/playground-demo read allowed.', {
      exact: true,
    })
    .waitFor();
  await page.locator('[data-runtime-action="restore"]:enabled').waitFor();
  check(
    (await page.locator('.timeline button').count()) === 12,
    'Resource observations unavailable',
  );
  await page.locator('.timeline button').nth(10).click();
  check(
    (await page.locator('.inspector').textContent())?.includes('res-server'),
    'Explicit server report unavailable',
  );
  check(
    (await page.locator('.inspector').textContent())?.includes('demo-read-allowed'),
    'Allowed server report unavailable',
  );
  remember(
    oauthSessionSchema.parse(
      await page.evaluate(async () =>
        (
          await fetch('/api/oauth/session', { credentials: 'same-origin', cache: 'no-store' })
        ).json(),
      ),
    ).csrfToken,
  );
  await safeSurface(page);
  await page
    .locator('.inspector')
    .screenshot({ path: resolve(output, 'real-resource-inspector.png') });
  await page.screenshot({ path: resolve(output, 'real-authorized-workspace.png'), fullPage: true });

  stage = 'local-logout-and-owned-history';
  await page.locator('[data-runtime-action="logout"]').click();
  await page.getByText(/Locally signed out\./).waitFor();
  await page.locator('[data-runtime-action="restore"]:enabled').waitFor();
  check(
    await page.locator('[data-runtime-action="resource"]').isDisabled(),
    'Signed-out resource capability remains',
  );
  check(
    (await page.locator('.timeline button').count()) === 13,
    'Owned logout history unavailable',
  );
  const rejected = await page.evaluate(
    async () =>
      (await fetch('/api/oauth/resource', { credentials: 'same-origin', cache: 'no-store' }))
        .status,
  );
  check(
    rejected === 401 && resourceCalls === 1,
    'Post-logout request contacted protected upstream',
  );
  await page.locator('[data-runtime-action="restore"]').click();
  await page.locator('[data-runtime-action="restore"]:enabled').waitFor();
  check(
    (await page.locator('.runtime-status code').textContent()) === runId,
    'Logout lost owned run identity',
  );
  check(
    (await page.locator('.timeline button').count()) === 14,
    'Owned local rejection history unavailable',
  );
  await page.locator('.timeline button').last().click();
  check(
    (await page.locator('.inspector h4').textContent()) === 'Resource access rejected locally',
    'Local rejection attributed to upstream',
  );
  remember(
    oauthSessionSchema.parse(
      await page.evaluate(async () =>
        (
          await fetch('/api/oauth/session', { credentials: 'same-origin', cache: 'no-store' })
        ).json(),
      ),
    ).csrfToken,
  );
  await safeSurface(page);
  await page
    .locator('.inspector')
    .screenshot({ path: resolve(output, 'real-local-rejection-inspector.png') });
  await page.screenshot({ path: resolve(output, 'real-signed-out-workspace.png'), fullPage: true });
  const historyResponse = await page.evaluate(
    async (id) =>
      (
        await fetch(`/api/oauth/runs/${id}/events`, {
          credentials: 'same-origin',
          cache: 'no-store',
        })
      ).json(),
    runId,
  );
  const history = oauthEventDocumentSchema.parse(historyResponse);
  check(history.complete && history.events.length === 14, 'Complete owned history unavailable');
  check(
    history.events.every(
      (event, index) => event.sequence === index + 1 && event.observedBy === 'auth-client',
    ),
    'Observed order/provenance invalid',
  );
  for (const cookie of await context.cookies()) remember(cookie.value);
  check(!transportFailed, 'Private browser transport failed');
  Object.assign(result, {
    verified: true,
    canonicalBrowserOriginPreserved: true,
    normalLoginNavigations: loginNavigations,
    parCalls,
    stableRunAfterReload: true,
    loginEvents: 9,
    resourceEvents: 12,
    syntheticReadAllowed: true,
    resourceServerReport: 'allowed/demo-read-allowed',
    postLogoutBffStatus: rejected,
    totalResourceCalls: resourceCalls,
    retainedOwnedEvents: history.events.length,
    localRejectionIsNotHapiDenial: true,
    browserStorageLocaleOnly: true,
  });
} catch (error) {
  failure = true;
  if (page && !page.isClosed()) {
    const current = new URL(page.url());
    const messages = capturedLogs
      .filter((entry) => Array.isArray(entry) && entry[0] === 'browser')
      .map((entry) => entry[2]);
    result.browserBoundary = {
      atProvider: current.origin === new URL(environment.OIDC_ISSUER).origin,
      atApplication: current.origin === new URL(environment.PLAYGROUND_OIDC_REDIRECT_URI).origin,
      atCallback: current.pathname === '/api/oauth/callback',
      browserError: current.protocol === 'chrome-error:',
      hasLoginForm: (await page.locator('#username').count()) > 0,
      contentSecurityPolicyMessage: messages.some((message) =>
        /Content Security Policy|Content-Security-Policy/.test(message),
      ),
      mixedContentMessage: messages.some((message) => /Mixed Content|insecure/.test(message)),
    };
  }
  Object.assign(result, {
    verified: false,
    failedStage: stage,
    failure:
      assertionFailure ??
      (['TimeoutError', 'TypeError', 'Error'].includes(error?.name) ? error.name : 'unavailable'),
    operations,
  });
} finally {
  await browser?.close();
  await vite?.close();
  await app?.close();
  globalThis.fetch = originalFetch;
  if (identityCreated && api) {
    const identities = await api(`/users?username=${username}&exact=true`);
    for (const identity of identities) {
      if (identity.username === username) await api(`/users/${identity.id}`, 'DELETE');
    }
    check(
      (await preservationSnapshot(api)) === baseline,
      'Provider preservation comparison failed',
    );
    result.providerConfigurationAndUsersPreserved = true;
  }
  const hapiLogs = spawnSync('docker', ['logs', 'epa-lab-integration-res-server'], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  check(hapiLogs.status === 0, 'Private HAPI log scan unavailable');
  capturedLogs.push(hapiLogs.stdout, hapiLogs.stderr);
  const logText = JSON.stringify(capturedLogs);
  check(
    ![...secrets].some((value) => logText.includes(value)),
    'Restricted material in captured logs',
  );
  result.bffBrowserAndHapiLogsSafe = true;
  await writeFile(resolve(output, 'verification.json'), `${JSON.stringify(result, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(JSON.stringify(result));
}
if (failure) process.exitCode = 1;
