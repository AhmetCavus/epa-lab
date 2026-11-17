import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { request as httpRequest } from 'node:http';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import {
  availablePort,
  publicRequest,
  verifyIsolatedPublicRealm,
} from './keycloak/verify-public-realm.mjs';
import { publicIssuer, publicOrigin } from './keycloak/public-realm.mjs';

const appRequire = createRequire(new URL('../apps/playground/package.json', import.meta.url));
const { firefox } = appRequire('playwright');
const { default: AxeBuilder } = appRequire('@axe-core/playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const spaImage =
  process.env.PUBLIC_RUNTIME_SPA_IMAGE ?? 'epa-lab/playground:public-candidate-20261114';
const bffImage =
  process.env.PUBLIC_RUNTIME_BFF_IMAGE ?? 'epa-lab/auth-client:public-candidate-20261114';
const missionControl = process.env.PUBLIC_RUNTIME_MISSION_CONTROL === 'true';
if (missionControl) {
  assert.equal(
    process.env.KEYCLOAK_POSTGRES_ENV_FILE,
    undefined,
    'UX verification must use disposable storage',
  );
  process.env.KEYCLOAK_ISOLATED_IMAGE =
    'quay.io/keycloak/keycloak@sha256:4da21f9a53bcbac1026a0d654b740a81e98e5de4c45457076acc74b4d94b1551';
}
const hapiImage =
  process.env.PUBLIC_RUNTIME_HAPI_IMAGE ??
  'sha256:ba8049c9074f35f931af8878dd6eda71b728c37bc143bfdaac81a172446a4927';

function docker(...args) {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    throw new Error(`Isolated Docker operation failed: ${args[0]}`);
  }
}
async function envFile(directory, name, values) {
  const path = join(directory, `${name}.env`);
  await writeFile(
    path,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'),
    { mode: 0o600 },
  );
  return path;
}
async function waitFor(url, attempts = 120) {
  for (let count = 0; count < attempts; count += 1) {
    try {
      const result = await fetch(url, { signal: AbortSignal.timeout(1500) });
      await result.body?.cancel();
      if (result.ok) return;
    } catch {
      /* Await only the temporary candidate. */
    }
    await setTimeout(1000);
  }
  throw new Error('Isolated readiness deadline exceeded');
}

async function rawStatus(url, headers, localAddress = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      { headers, localAddress, signal: AbortSignal.timeout(10000) },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on('error', reject);
    request.end();
  });
}

async function verifyRuntime(context) {
  const { directory, env, settings, kcPort, cert, keyFile, account, secrets } = context;
  const owned = [];
  const prefix = `epa-public-runtime-${randomBytes(5).toString('hex')}`;
  let browser;
  let stage = 'configuration';
  let failed = false;
  function start(name, image, args, command = []) {
    const id = docker(
      'run',
      '-d',
      '--pull',
      'never',
      '--name',
      `${prefix}-${name}`,
      '--label',
      'traefik.enable=false',
      '--network',
      'host',
      ...args,
      image,
      ...command,
    );
    owned.push({ name, id });
    return id;
  }
  const check = (value, name) => assert.ok(value, name);
  try {
    const nginxPort = await availablePort();
    const traefikPort = await availablePort();
    const bffPort = await availablePort();
    const hapiPort = await availablePort();
    const nginxConfig = (
      await readFile(join(root, 'apps/playground/nginx/public-runtime.conf.template'), 'utf8')
    )
      .replaceAll('${PLAYGROUND_TRAEFIK_ADDRESS}', '127.0.0.1')
      .replaceAll('${PLAYGROUND_BFF_UPSTREAM}', `127.0.0.1:${bffPort}`)
      .replaceAll('${PLAYGROUND_KEYCLOAK_UPSTREAM}', `127.0.0.1:${kcPort}`)
      .replace('listen 80;', `listen 127.0.0.1:${nginxPort};`);
    const nginxFile = join(directory, 'nginx-candidate.conf');
    await writeFile(nginxFile, nginxConfig, { mode: 0o600 });
    stage = 'actual-nginx-configuration';
    const composeFile = join(directory, 'candidate-compose.json');
    const composeModel = {
      services: {
        playground: {
          image: docker('image', 'inspect', '--format', '{{.Id}}', spaImage),
          container_name: `${prefix}-nginx`,
          network_mode: 'host',
          labels: { 'traefik.enable': 'false' },
          entrypoint: ['nginx'],
          command: ['-g', 'daemon off;'],
          volumes: [
            {
              type: 'bind',
              source: nginxFile,
              target: '/etc/nginx/conf.d/default.conf',
              read_only: true,
            },
          ],
        },
      },
    };
    async function applySpa() {
      await writeFile(composeFile, JSON.stringify(composeModel), { mode: 0o600 });
      docker(
        'compose',
        '--project-name',
        prefix,
        '--file',
        composeFile,
        'up',
        '--detach',
        '--no-deps',
        '--no-build',
        '--pull',
        'never',
        'playground',
      );
      return docker(
        'compose',
        '--project-name',
        prefix,
        '--file',
        composeFile,
        'ps',
        '--quiet',
        'playground',
      );
    }
    const nginx = await applySpa();
    const nginxRecord = { name: 'nginx', id: nginx };
    owned.push(nginxRecord);
    await waitFor(`http://127.0.0.1:${nginxPort}/health`, 15);
    const route = (
      await readFile(join(root, 'infrastructure/traefik/epa-lab-public.yml.template'), 'utf8')
    )
      .replaceAll('${PUBLIC_CLOUDFLARED_ADDRESS}', '127.0.0.2')
      .replace('http://epa-lab-playground:80', `http://127.0.0.1:${nginxPort}`);
    const routeFile = join(directory, 'route.yml');
    await writeFile(routeFile, route, { mode: 0o600 });
    const traefikImage = docker('inspect', '--format', '{{.Image}}', 'shared-traefik');
    start(
      'traefik',
      traefikImage,
      ['--mount', `type=bind,source=${routeFile},target=/test/route.yml,readonly`],
      [
        `--entrypoints.web.address=127.0.0.1:${traefikPort}`,
        '--providers.file.filename=/test/route.yml',
        '--api=false',
        '--log.level=ERROR',
      ],
    );
    const tlsFile = join(directory, 'loopback-tls.conf');
    await writeFile(
      tlsFile,
      `server {
      listen 127.0.0.1:443 ssl;
      server_name auth-playground.yappai.de;
      ssl_certificate /test/cert.pem;
      ssl_certificate_key /test/key.pem;
      access_log off;
      error_log /dev/null;
      location / {
        proxy_bind 127.0.0.2;
        proxy_set_header Host auth-playground.yappai.de;
        proxy_set_header CF-Connecting-IP 127.0.0.2;
        proxy_set_header CF-Visitor '{"scheme":"https"}';
        proxy_set_header X-Forwarded-Proto https;
        proxy_pass http://127.0.0.1:${traefikPort};
      }
    }`,
      { mode: 0o600 },
    );
    start(
      'tls',
      spaImage,
      [
        '--entrypoint',
        'nginx',
        '--mount',
        `type=bind,source=${tlsFile},target=/etc/nginx/conf.d/default.conf,readonly`,
        '--mount',
        `type=bind,source=${join(directory, 'test-cert.pem')},target=/test/cert.pem,readonly`,
        '--mount',
        `type=bind,source=${keyFile},target=/test/key.pem,readonly`,
      ],
      ['-g', 'daemon off;'],
    );
    const request = publicRequest(443, cert);
    stage = 'real-https-discovery-through-traefik-nginx';
    let discovered = false;
    for (let count = 0; count < 15; count += 1) {
      try {
        const result = await request(`${publicIssuer}/.well-known/openid-configuration`);
        discovered = result.ok && (await result.json()).issuer === publicIssuer;
        if (discovered) break;
      } catch {
        /* Candidate route may be loading. */
      }
      await setTimeout(1000);
    }
    check(discovered, 'HTTPS discovery through actual proxies failed');
    stage = 'isolated-hapi-https-trust';
    const trustFile = join(directory, 'test-trust.p12');
    execFileSync(
      'keytool',
      [
        '-importcert',
        '-noprompt',
        '-alias',
        'isolated-playground',
        '-file',
        join(directory, 'test-ca.pem'),
        '-keystore',
        trustFile,
        '-storetype',
        'PKCS12',
        '-storepass',
        'isolated-test-trust',
      ],
      { stdio: 'ignore' },
    );
    await chmod(trustFile, 0o644);
    start('hapi', hapiImage, [
      '--memory',
      '3g',
      '--cpus',
      '2',
      '--add-host',
      'auth-playground.yappai.de:127.0.0.1',
      '--env-file',
      await envFile(directory, 'hapi', {
        SERVER_ADDRESS: '127.0.0.1',
        SERVER_PORT: hapiPort,
        JAVA_TOOL_OPTIONS:
          '-Xms128m -Xmx2g -Djavax.net.ssl.trustStore=/test/trust.p12 -Djavax.net.ssl.trustStorePassword=isolated-test-trust',
        FHIR_OIDC_ISSUER: publicIssuer,
        FHIR_OIDC_JWKS_URI: `${publicIssuer}/protocol/openid-connect/certs`,
        PLAYGROUND_SECURITY_ALLOW_PRIVATE_HTTP: 'false',
        PLAYGROUND_DEMO_SEED: 'true',
        SPRING_DATASOURCE_URL: 'jdbc:h2:mem:public_binding;DB_CLOSE_DELAY=-1',
        SPRING_DATASOURCE_USERNAME: 'sa',
        SPRING_DATASOURCE_PASSWORD: '',
        SPRING_DATASOURCE_DRIVER_CLASS_NAME: 'org.h2.Driver',
        HIBERNATE_DIALECT: 'ca.uhn.fhir.jpa.model.dialect.HapiFhirH2Dialect',
      }),
      '--mount',
      `type=bind,source=${trustFile},target=/test/trust.p12,readonly`,
    ]);
    await waitFor(`http://127.0.0.1:${hapiPort}/actuator/health/readiness`, 180);
    check(
      (await fetch(`http://127.0.0.1:${hapiPort}/fhir/Basic/playground-demo`)).status === 401,
      'HAPI anonymous read is not denied',
    );
    for (const tokens of context.verifiedTokens) {
      const response = await fetch(`http://127.0.0.1:${hapiPort}/fhir/Basic/playground-demo`, {
        headers: { authorization: `Bearer ${tokens.accessToken}` },
      });
      check(
        response.status === (tokens.scope.includes('demo.fhir.read') ? 200 : 403),
        'HAPI permission decision failed',
      );
      await response.body?.cancel();
      const identity = await fetch(`http://127.0.0.1:${hapiPort}/fhir/Basic/playground-demo`, {
        headers: { authorization: `Bearer ${tokens.idToken}` },
      });
      check(identity.status === 401, 'HAPI accepted an ID Token');
      await identity.body?.cancel();
    }
    console.info(
      JSON.stringify({
        stage: 'real-HAPI-public-issuer',
        result: '200 with permission, 403 without permission, 401 missing token/ID Token',
      }),
    );
    stage = 'candidate-bff';
    const bff = start('bff', bffImage, [
      '--memory',
      '512m',
      '--add-host',
      'auth-playground.yappai.de:127.0.0.1',
      '--env-file',
      await envFile(directory, 'bff', {
        HOST: '127.0.0.1',
        PORT: bffPort,
        OIDC_ISSUER: `${settings.server}/realms/epa-demo`,
        OIDC_CLIENT_ID: env.OIDC_CLIENT_ID,
        OIDC_CLIENT_SECRET: env.OIDC_CLIENT_SECRET,
        OIDC_ALLOW_PRIVATE_NETWORK_HTTP: env.OIDC_ALLOW_PRIVATE_NETWORK_HTTP ?? 'false',
        OIDC_DEFAULT_REDIRECT_URI: env.OIDC_DEFAULT_REDIRECT_URI,
        OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify([env.OIDC_DEFAULT_REDIRECT_URI]),
        PLAYGROUND_OIDC_ENABLED: 'true',
        PLAYGROUND_PUBLIC_RUNTIME: 'true',
        PLAYGROUND_PUBLIC_PROXY_ADDRESSES: '127.0.0.1',
        PLAYGROUND_APP_ORIGIN: publicOrigin,
        PLAYGROUND_OIDC_ISSUER: publicIssuer,
        PLAYGROUND_OIDC_CLIENT_ID: 'playground-oidc',
        PLAYGROUND_OIDC_CLIENT_SECRET: settings.secret,
        PLAYGROUND_OIDC_REDIRECT_URI: `${publicOrigin}/api/oauth/callback`,
        PLAYGROUND_FHIR_RESOURCE_URL: `http://127.0.0.1:${hapiPort}/fhir/Basic/playground-demo`,
        NODE_EXTRA_CA_CERTS: '/test/cert.pem',
      }),
      '--mount',
      `type=bind,source=${join(directory, 'test-ca.pem')},target=/test/cert.pem,readonly`,
    ]);
    await waitFor(`http://127.0.0.1:${bffPort}/health/ready`, 30);
    check(
      (await request(`${publicOrigin}/api/oauth/session`)).status === 200,
      'Proxied BFF session failed',
    );

    stage = 'private-browser-ca';
    const profile = join(directory, 'firefox-profile');
    await mkdir(profile);
    execFileSync(
      'python3',
      [
        join(root, 'infrastructure/keycloak/trust-test-certificate.py'),
        profile,
        join(directory, 'test-ca.pem'),
      ],
      { stdio: 'pipe' },
    );
    // A CONNECT proxy maps the fixed authority to loopback. Firefox still validates
    // hostname and the private CA in its isolated profile; no ignoreHTTPS errors.
    const { createServer, connect } = await import('node:net');
    const browserProxy = createServer((socket) => {
      socket.once('data', (data) => {
        if (!data.toString().startsWith('CONNECT auth-playground.yappai.de:443 HTTP/1.1')) {
          socket.end();
          return;
        }
        const upstream = connect(443, '127.0.0.1', () => {
          socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          upstream.pipe(socket);
          socket.pipe(upstream);
        });
        upstream.on('error', () => socket.destroy());
        socket.on('error', () => upstream.destroy());
      });
    });
    await new Promise((resolve) => browserProxy.listen(0, '127.0.0.1', resolve));
    try {
      stage = 'real-browser-launch';
      browser = await firefox.launchPersistentContext(profile, {
        headless: true,
        proxy: { server: `http://127.0.0.1:${browserProxy.address().port}` },
        viewport: { width: 1366, height: 768 },
      });
      const page = await browser.newPage();
      const consoleOutput = [];
      const executionCounts = { login: 0, resource: 0, logout: 0 };
      const selections = [];
      const unexpectedCatalog = [];
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (url.origin !== publicOrigin) return;
        const operation = url.pathname.slice('/api/oauth/'.length);
        if (operation in executionCounts) executionCounts[operation] += 1;
        if (operation === 'resource') selections.push([...url.searchParams]);
        if (url.pathname.startsWith('/api/') && /catalog|eligibility/.test(url.pathname))
          unexpectedCatalog.push(url.pathname);
      });
      const runIdentity = () =>
        page.evaluate(
          async () => (await (await fetch('/api/oauth/session')).json()).currentRun?.runId,
        );
      page.on('console', (message) => consoleOutput.push(message.text()));
      page.setDefaultTimeout(20000);
      stage = 'mission-catalog-navigation';
      await page.goto(`${publicOrigin}/missions`);
      stage = 'mission-launch-link';
      await page.getByRole('link', { name: 'OAuth-Mission starten' }).click();
      stage = 'workspace-ready';
      await page.locator('[data-runtime-action="start"]:enabled').waitFor();
      await page.locator('[data-runtime-action="start"]').click();
      stage = 'keycloak-login';
      await page.locator('#username').fill(account.username);
      await page.locator('#password').fill(account.password);
      await page.locator('#kc-login').click();
      await page.waitForURL(`${publicOrigin}/missions/oauth-oidc/workspace`);
      stage = 'workspace-refresh-and-resource';
      await page.locator('[data-runtime-action="resource"]:enabled').waitFor();
      const runId = missionControl
        ? await runIdentity()
        : await page.locator('.runtime-status code').textContent();
      check(runId, 'Current run unavailable');
      if (missionControl) {
        check(executionCounts.resource === 0, 'Preliminary FHIR read before explicit fetch');
        assert.deepEqual(unexpectedCatalog, []);
      }
      await page.reload();
      await page.locator('[data-runtime-action="resource"]:enabled').waitFor();
      check(
        (missionControl
          ? await runIdentity()
          : await page.locator('.runtime-status code').textContent()) === runId,
        'Refresh changed current run',
      );
      await page.locator('[data-runtime-action="resource"]').click();
      if (missionControl) {
        await page.locator('.mc-resource-result[data-outcome="allowed"]').waitFor();
        check(executionCounts.resource === 1, 'Resource action not explicit-only');
        assert.deepEqual(selections, [
          [
            ['resourceType', 'Basic'],
            ['resourceId', 'playground-demo'],
          ],
        ]);
        check(new URL(page.url()).search === '', 'Callback material remained in workspace URL');
        await page.screenshot({
          path: join(directory, 'mission-control-real-explore.png'),
          fullPage: true,
        });
        await page.locator('.mc-navigation a').last().click();
      } else {
        await page
          .getByText(
            'Letztes Ressourcenergebnis: synthetischer Lesezugriff auf Basic/playground-demo erlaubt.',
            { exact: true },
          )
          .waitFor();
      }
      const document = await page.evaluate(
        async (id) => (await fetch(`/api/oauth/runs/${id}/events`)).json(),
        runId,
      );
      check(
        (await request(`${publicOrigin}/api/oauth/runs/${runId}/events`)).status === 404,
        'A run ID authorized an unrelated browser context',
      );
      check(
        document.events.some((event) => event.kind === 'resource-allowed'),
        'Real HAPI success observation missing',
      );
      check(
        document.events.every((event, index) => event.sequence === index + 1),
        'Event sequence broken',
      );
      check(
        document.events.every((event) => event.observedBy === 'auth-client'),
        'Unexpected observer',
      );
      const reportIndex = document.events.findIndex(
        (event) => event.kind === 'resource-response-received',
      );
      check(
        reportIndex >= 0 && document.events[reportIndex].evidence.resourceServerReport.available,
        'HAPI reported evidence unavailable',
      );
      await page.locator('.timeline button').nth(reportIndex).click();
      check(
        (await page.locator('.inspector').textContent()).includes('res-server'),
        'Reported HAPI evidence absent from Inspector',
      );
      if (missionControl) {
        stage = 'mission-control-inspect-and-recorded-playback';
        const beforePresentation = { ...executionCounts };
        await page.screenshot({
          path: join(directory, 'mission-control-real-inspect.png'),
          fullPage: true,
        });
        stage = 'mission-control-inspect-filter-toggle';
        await page.locator('.mc-event-filter-disclosure summary').click();
        await page.locator('.mc-event-filters select').first().selectOption('bff');
        await page.locator('.mc-event-filters select').first().selectOption('');
        await page.locator('.mc-event-filter-disclosure summary').click();
        stage = 'mission-control-explore-navigation';
        await page.locator('.mc-navigation a').nth(1).click();
        await page.locator('.mc-quick-links a').nth(1).click();
        await page.locator('.flow-transport[data-playing="false"]').waitFor();
        stage = 'mission-control-callback-frame';
        await page.locator('.flow-overview button').nth(2).click();
        check(
          (await page.locator('.flow-path > path').getAttribute('data-source')) === 'browser',
          'Callback source fabricated',
        );
        check(
          (await page.locator('.flow-path > path').getAttribute('data-target')) === 'bff',
          'Callback target fabricated',
        );
        stage = 'mission-control-manual-playback';
        await page.locator('.flow-transport button').last().click();
        await page.locator('.flow-transport button').first().click();
        stage = 'mission-control-play';
        await page.locator('.flow-transport button').nth(1).click();
        await page.locator('.flow-transport[data-playing="true"]').waitFor();
        await page.locator('.flow-transport button').nth(1).click();
        await page.locator('.flow-transport[data-playing="false"]').waitFor();
        stage = 'mission-control-locale-presentation';
        await page.locator('.language-control select:visible').selectOption('en');
        await page.locator('.language-control select:visible').selectOption('de');
        assert.deepEqual(
          executionCounts,
          beforePresentation,
          'Presentation initiated protocol execution',
        );
        check((await runIdentity()) === runId, 'Presentation changed owning run');
        await page.screenshot({
          path: join(directory, 'mission-control-real-flow.png'),
          fullPage: true,
        });
        stage = 'mission-control-retained-resource-panel';
        await page.locator('.mc-panel-tabs a').first().click();
        await page.locator('.mc-resource-result[data-outcome="allowed"]').waitFor();
        await page.screenshot({
          path: join(directory, 'mission-control-real-resource.png'),
          fullPage: true,
        });
      }
      const oldCookies = await browser.cookies();
      const session = await page.evaluate(async () => (await fetch('/api/oauth/session')).json());
      secrets.add(session.csrfToken);
      stage = 'missing-csrf-rejection';
      const rejectedCsrf = await page.evaluate(
        async () => (await fetch('/api/oauth/logout', { method: 'POST' })).status,
      );
      check(rejectedCsrf === 403, 'Missing CSRF was accepted');
      stage = 'ui-local-logout';
      await page.locator('[data-runtime-action="logout"]').click();
      await page.locator('[data-runtime-action="start"]:enabled').waitFor();
      if (missionControl)
        check(
          (await page.locator('.mc-resource-result').count()) === 0,
          'Resource payload survived logout',
        );
      stage = 'logout-authentication-invalidated';
      const restored = await page.evaluate(async () => {
        const response = await fetch('/api/oauth/session');
        return { status: response.status, body: response.ok ? await response.json() : undefined };
      });
      check(restored.status === 200, 'Post-logout session restoration failed');
      const after = restored.body;
      check(!after.authenticated, 'Authentication survived logout');
      stage = 'owned-history-after-logout';
      const history = await page.evaluate(
        async (id) => (await fetch(`/api/oauth/runs/${id}/events`)).status,
        runId,
      );
      check(history === 200, 'Owned safe observations unavailable after logout');
      stage = 'old-authentication-denied';
      const oldCookie = oldCookies
        .filter((cookie) => cookie.path === '/api/oauth')
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; ');
      secrets.add(oldCookie);
      check(
        (await request(`${publicOrigin}/api/oauth/resource`, { headers: { cookie: oldCookie } }))
          .status === 401,
        'Old authentication survived logout',
      );
      stage = 'browser-disclosure-check';
      check(
        (await page.evaluate(() => document.cookie)) === '',
        'Credential cookie exposed to JavaScript',
      );
      check(
        (await page.evaluate(() => sessionStorage.length)) === 0,
        'Session storage contains protocol material',
      );
      check(
        (await page.evaluate(() => Object.keys(localStorage))).every(
          (key) => key === 'auth-protocol-playground.locale',
        ),
        'Unexpected browser persistence',
      );
      const safeText = (await page.locator('body').textContent()) + JSON.stringify(consoleOutput);
      check(
        ![...secrets].some((value) => value.length > 12 && safeText.includes(value)),
        'Browser disclosed a protocol secret',
      );
      await page.screenshot({
        path: join(directory, 'public-candidate-workspace.png'),
        fullPage: true,
      });
      stage = 'public-localization-and-accessibility';
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const locale of ['de', 'en']) {
        await page.locator('.language-control select:visible').selectOption(locale);
        check(
          (missionControl
            ? await runIdentity()
            : await page.locator('.runtime-status code').textContent()) === runId,
          'Language change lost the current run',
        );
        for (const width of [1366, 390]) {
          await page.setViewportSize({ width, height: 844 });
          check(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            'Public copy overflows the page',
          );
          const scan = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze();
          check(scan.violations.length === 0, 'Public workspace accessibility violation');
          await page.screenshot({
            path: join(directory, `public-${locale}-${width}.png`),
            fullPage: true,
          });
        }
      }
      await browser.close();
      browser = undefined;
    } finally {
      if (browser) {
        await browser.close();
        browser = undefined;
      }
      await new Promise((resolve) => browserProxy.close(resolve));
    }

    stage = 'actual-proxy-negative-matrix';
    for (const path of [
      '/api/oauth/unknown',
      '/admin/',
      '/realms/master/',
      '/realms/epa-demo/',
      '/realms/playground-public/account',
      '/fhir/Basic/playground-demo',
      '/api/oauth/%73ession',
      '/api/oauth/session/extra',
      '/session',
    ]) {
      check(
        (await request(`${publicOrigin}${path}`)).status === 404,
        'Undeclared public route was not denied',
      );
    }
    check(
      (await request(`${publicOrigin}/api/oauth/session`, { method: 'POST' })).status === 405,
      'Wrong API method accepted',
    );
    check(
      (await request(`${publicOrigin}/api/oauth/logout`)).status === 405,
      'GET logout accepted',
    );
    check(
      (
        await fetch(`http://127.0.0.1:${nginxPort}/api/oauth/session`, {
          headers: { host: 'auth-playground.yappai.de' },
        })
      ).status === 403,
      'Direct Nginx bypass accepted',
    );
    check(
      (await rawStatus(`http://127.0.0.1:${traefikPort}/api/oauth/session`, {
        host: 'auth-playground.yappai.de',
        'x-forwarded-for': '127.0.0.2',
      })) === 403,
      'Traefik source bypass accepted',
    );
    check(
      (await rawStatus(
        `http://127.0.0.1:${traefikPort}/api/oauth/session`,
        {
          host: 'auth-playground.yappai.de',
          'cf-connecting-ip': '127.0.0.2',
          'cf-visitor': '{"scheme":"http"}',
        },
        '127.0.0.2',
      )) === 403,
      'Plaintext edge authentication accepted',
    );
    const sessionResponse = await request(`${publicOrigin}/api/oauth/session`);
    check(
      sessionResponse.headers.get('cache-control') === 'no-store',
      'Authenticated API may be cached',
    );
    const loginStatuses = [];
    for (let count = 0; count < 5; count += 1)
      loginStatuses.push((await request(`${publicOrigin}/api/oauth/login`)).status);
    check(loginStatuses.includes(429), 'Login limit did not trigger');
    check(
      (await request(`${publicOrigin}/api/oauth/logout`, { method: 'POST' })).status === 403,
      'Login exhaustion blocked independent logout validation',
    );
    await setTimeout(11000);
    check(
      (await request(`${publicOrigin}/api/oauth/login`)).status === 302,
      'Login did not recover after its rate window',
    );
    stage = 'real-epa-bff-regression';
    const legacyValues = {
      ...env,
      OIDC_ISSUER: `${settings.server}/realms/epa-demo`,
      OIDC_ALLOWED_REDIRECT_URIS: JSON.stringify([env.OIDC_DEFAULT_REDIRECT_URI]),
      PLAYGROUND_OIDC_ENABLED: 'false',
      PLAYGROUND_PUBLIC_RUNTIME: 'false',
    };
    const legacyFile = await envFile(directory, 'legacy-regression', legacyValues);
    const legacyRun = execFileSync(
      'node',
      [
        '--env-file',
        legacyFile,
        fileURLToPath(
          new URL('../services/auth-client/node_modules/jest/bin/jest.js', import.meta.url),
        ),
        '--config',
        'test/jest.integration.config.cjs',
        '--runInBand',
        '--runTestsByPath',
        'test/keycloak.integration.ts',
      ],
      {
        cwd: join(root, 'services/auth-client'),
        env: { ...process.env, ...legacyValues, KEYCLOAK_TEST_ENV_FILE: legacyFile },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120000,
      },
    );
    void legacyRun;
    console.info(JSON.stringify({ stage: 'real-epa-bff-regression', result: 'passed' }));
    stage = 'safe-upstream-failure';
    docker('stop', '--time', '5', bff);
    const marker = randomBytes(20).toString('hex');
    secrets.add(marker);
    check(
      (await request(`${publicOrigin}/api/oauth/callback?code=${marker}&state=${marker}`))
        .status === 502,
      'BFF transport failure status unavailable',
    );
    const nginxLogs = docker('logs', nginx);
    check(!nginxLogs.includes(marker), 'Proxy error logs include raw callback material');
    for (const service of owned) {
      const logs = docker('logs', service.id);
      check(
        ![...secrets].some((value) => value.length > 12 && logs.includes(value)),
        'Candidate logs disclosed protocol secrets',
      );
    }
    stage = 'targeted-fixture-withdrawal';
    const fixtureFile = join(directory, 'fixture-withdrawal.conf');
    await writeFile(
      fixtureFile,
      (await readFile(join(root, 'apps/playground/nginx/fixture-withdrawal.conf'), 'utf8')).replace(
        'listen 80;',
        `listen 127.0.0.1:${nginxPort};`,
      ),
      { mode: 0o600 },
    );
    composeModel.services.playground.image =
      'sha256:6226f17b300586fae1ea71149cb94c30d1bc0c231e99872b46c77d4b1277fa25';
    composeModel.services.playground.volumes[0].source = fixtureFile;
    nginxRecord.id = await applySpa();
    await waitFor(`http://127.0.0.1:${nginxPort}/health`, 15);
    check(
      (await request(`${publicOrigin}/missions`)).status === 200,
      'Fixture catalog not restored',
    );
    check(
      (await request(`${publicOrigin}/missions/epa-concept/workspace`)).status === 200,
      'Conceptual ePA not restored',
    );
    check(
      (await request(`${publicOrigin}/api/oauth/session`)).status === 404,
      'Rollback left the OAuth API exposed',
    );
    check(
      (await request(`${publicIssuer}/.well-known/openid-configuration`)).status === 404,
      'Rollback left provider routing exposed',
    );
    check(!docker('logs', nginxRecord.id).includes(marker), 'Rollback logged callback material');
    const result = {
      status: 'passed',
      images: {
        spa: docker('image', 'inspect', '--format', '{{.Id}}', spaImage),
        bff: docker('image', 'inspect', '--format', '{{.Id}}', bffImage),
        hapi: hapiImage,
      },
      journey: 'real HTTPS login/callback/refresh/read/Inspector/CSRF logout/old-auth/history',
      proxy: 'actual Traefik/Nginx, path/method/trust/limit/cache/error-log negatives',
      publicAccessibility:
        'DE/EN, 1366/390px, reduced motion, WCAG 2A/AA/2.1AA/2.2AA, stable run on language change',
      withdrawal:
        'targeted Compose recreation to saved fixture image; catalog/ePA restored, OAuth/provider forwarding closed',
      missionControl: missionControl
        ? {
            explicitSelectedRead: true,
            preliminaryResourceRequests: 0,
            stableRun: true,
            presentationExecutionRequests: 0,
            safeHistoryAfterLogout: true,
            resourceClearedOnLogout: true,
          }
        : undefined,
      limitations:
        'Loopback staging with temporary test CA and disposable provider/HAPI data. This is not public deployment or public-host acceptance.',
    };
    await writeFile(join(directory, 'runtime-results.json'), JSON.stringify(result, null, 2), {
      mode: 0o600,
    });
    return result;
  } catch (error) {
    failed = true;
    let diagnostic = error instanceof Error ? error.message : 'Verification error';
    for (const secret of secrets)
      if (secret.length > 8) diagnostic = diagnostic.replaceAll(secret, '[redacted]');
    await writeFile(join(directory, 'runtime-private-failure.txt'), diagnostic, { mode: 0o600 });
    throw new Error(`Candidate runtime verification failed at stage: ${stage}`);
  } finally {
    if (browser) await browser.close();
    for (const service of owned.toReversed()) {
      if (failed)
        await writeFile(
          join(directory, `${service.name}-private.log`),
          docker('logs', service.id),
          { mode: 0o600 },
        );
      docker('stop', '--time', '10', service.id);
      docker('rm', service.id);
    }
  }
}

try {
  await verifyIsolatedPublicRealm(verifyRuntime);
} catch {
  process.exitCode = 1;
}
