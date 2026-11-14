import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createServer, request as httpsRequest } from 'node:https';
import { createServer as tcpServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import { adminApi, requireCondition, standardSettings } from './standard-client.mjs';
import { provisionDemoAccount } from './public-demo-account.mjs';
import {
  configurePublicRealm,
  publicIssuer,
  publicOrigin,
  publicRealmName,
  publicRealmSettings,
} from './public-realm.mjs';
import { preservationSnapshot } from './run-verification.mjs';
import { verifyStandardFlow } from './verify-standard-client.mjs';
import { publicTestTls } from './public-test-tls.mjs';

const image = 'sha256:b0f60d489d51c5d113390bdf5461d4c06e6051be026c05549f2e1e10ec352bcc';
const secret = () => randomBytes(32).toString('base64url');
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
export async function availablePort() {
  const server = tcpServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return value;
}

// Test transport preserves URL, Host, SNI and hostname/chain verification. Only the
// TCP destination is mapped to the isolated loopback listener; TLS is never disabled.
export function publicRequest(tlsPort, ca) {
  return async (input, options = {}) => {
    const url = new URL(input);
    requireCondition(url.origin === publicOrigin, 'Unexpected verification authority');
    return new Promise((resolve, reject) => {
      const request = httpsRequest(
        url,
        {
          method: options.method ?? 'GET',
          headers: { ...options.headers, host: url.host },
          port: tlsPort,
          lookup: (_host, _options, done) => done(null, [{ address: '127.0.0.1', family: 4 }]),
          ca,
          signal: options.signal ?? AbortSignal.timeout(10000),
        },
        (response) => {
          const chunks = [];
          let size = 0;
          response.on('data', (chunk) => {
            size += chunk.length;
            if (size > 2_000_000) request.destroy(new Error('Bounded test response exceeded'));
            chunks.push(chunk);
          });
          response.on('end', () => {
            const headers = new Headers();
            for (let index = 0; index < response.rawHeaders.length; index += 2) {
              headers.append(response.rawHeaders[index], response.rawHeaders[index + 1]);
            }
            resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers }));
          });
        },
      );
      request.on('error', reject);
      request.end(options.body?.toString());
    });
  };
}

async function changeInitialPassword(request, password, replacement, secrets) {
  const verifier = secret();
  secrets.add(verifier);
  const url = new URL(`${publicIssuer}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({
    client_id: 'playground-oidc',
    response_type: 'code',
    redirect_uri: `${publicOrigin}/api/oauth/callback`,
    scope: 'openid',
    state: secret(),
    nonce: secret(),
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  const cookies = new Map();
  async function call(destination, options = {}) {
    const response = await request(destination, {
      ...options,
      headers: {
        ...options.headers,
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const at = pair.indexOf('=');
      cookies.set(pair.slice(0, at), pair.slice(at + 1));
      secrets.add(pair.slice(at + 1));
    }
    return response;
  }
  function action(html) {
    const value = html.match(/<form[^>]*\baction="([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&');
    requireCondition(
      value && new URL(value).origin === publicOrigin,
      'Expected same-origin form action',
    );
    return value;
  }
  const login = await call(url);
  requireCondition(login.status === 200, 'Initial login form failed');
  let required = await call(action(await login.text()), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: 'demo-a123', password, credentialId: '' }),
  });
  for (let count = 0; [302, 303].includes(required.status) && count < 5; count += 1) {
    const next = new URL(required.headers.get('location'));
    requireCondition(
      next.origin === publicOrigin && next.pathname.startsWith('/realms/playground-public/'),
      'Initial password login must stay at the required action',
    );
    required = await call(next);
  }
  requireCondition(required.status === 200, `Required action failed (HTTP ${required.status})`);
  const html = await required.text();
  requireCondition(html.includes('password-new'), 'Required password-change form is absent');
  const changed = await call(action(html), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 'password-new': replacement, 'password-confirm': replacement }),
  });
  requireCondition([302, 303].includes(changed.status), 'Required password change failed');
  const callback = new URL(changed.headers.get('location'));
  requireCondition(
    callback.origin === publicOrigin &&
      callback.pathname === '/api/oauth/callback' &&
      callback.searchParams.has('code'),
    'Password-change callback failed',
  );
  secrets.add(callback.searchParams.get('code'));
}

async function rejectPublicAccount(request, username, password, secrets) {
  const verifier = secret();
  secrets.add(verifier);
  const url = new URL(`${publicIssuer}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({
    client_id: 'playground-oidc',
    response_type: 'code',
    redirect_uri: `${publicOrigin}/api/oauth/callback`,
    scope: 'openid',
    state: secret(),
    nonce: secret(),
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  const form = await request(url);
  requireCondition(form.status === 200, 'Negative account test did not reach login');
  const html = await form.text();
  const action = html.match(/<form[^>]*\baction="([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&');
  requireCondition(
    action && new URL(action).origin === publicOrigin,
    'Negative login form authority mismatch',
  );
  const cookie = form.headers
    .getSetCookie()
    .map((entry) => entry.split(';')[0])
    .join('; ');
  secrets.add(cookie);
  const rejected = await request(action, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie,
    },
    body: new URLSearchParams({ username, password, credentialId: '' }),
  });
  requireCondition(
    rejected.status === 200 &&
      !rejected.headers.has('location') &&
      (await rejected.text()).includes('id="kc-form-login"'),
    'Unprovisioned/disabled account was not rejected',
  );
}

export async function verifyIsolatedPublicRealm(verifyRuntime) {
  const directory = await mkdtemp(join(tmpdir(), 'epa-public-keycloak-'));
  const name = `epa-public-verify-${randomBytes(5).toString('hex')}`;
  let container;
  let network;
  let gateway;
  const secrets = new Set();
  try {
    const kcPort = await availablePort();
    const tlsPort = await availablePort();
    const server = `http://127.0.0.1:${kcPort}`;
    const env = {
      KEYCLOAK_ADMIN_URL: server,
      KEYCLOAK_ADMIN_USERNAME: 'isolated-admin',
      KEYCLOAK_ADMIN_PASSWORD: secret(),
      PLAYGROUND_OIDC_CLIENT_ID: 'playground-oidc',
      PLAYGROUND_OIDC_CLIENT_SECRET: secret(),
      PLAYGROUND_OIDC_REDIRECT_URI: 'http://127.0.0.1:3000/api/oauth/callback',
      OIDC_CLIENT_ID: 'epa-auth-server',
      OIDC_CLIENT_SECRET: secret(),
      OIDC_DEFAULT_REDIRECT_URI: 'http://127.0.0.1:3000/callback',
      TEST_USER_PASSWORD: secret(),
    };
    for (const [key, value] of Object.entries(env))
      if (/PASSWORD|SECRET/.test(key)) secrets.add(value);
    const publicSecret = secret();
    secrets.add(publicSecret);
    const settings = publicRealmSettings({
      ...env,
      PLAYGROUND_OIDC_CLIENT_SECRET: publicSecret,
      PLAYGROUND_OIDC_REDIRECT_URI: `${publicOrigin}/api/oauth/callback`,
    });
    const importFile = join(directory, 'epa-demo-realm.json');
    await writeFile(importFile, await readFile(new URL('./epa-demo-realm.json', import.meta.url)), {
      mode: 0o644,
    });
    const envFile = join(directory, 'keycloak.env');
    await writeFile(
      envFile,
      Object.entries({
        ...env,
        KC_BOOTSTRAP_ADMIN_USERNAME: env.KEYCLOAK_ADMIN_USERNAME,
        KC_BOOTSTRAP_ADMIN_PASSWORD: env.KEYCLOAK_ADMIN_PASSWORD,
        KC_HOSTNAME: server,
        KC_PROXY_HEADERS: 'xforwarded',
        KC_PROXY_TRUSTED_ADDRESSES: '127.0.0.1,172.17.0.0/16',
        KC_DB: 'dev-file',
      })
        .map(([key, value]) => `${key}=${value}`)
        .join('\n'),
      { mode: 0o600 },
    );
    // An ephemeral bridge and tmpfs reproduce the pinned provider only. No live realm/volume is used.
    network = docker('network', 'create', '--label', 'epa.verification=public-playground', name);
    const gatewayIp = JSON.parse(docker('network', 'inspect', network))[0].IPAM.Config[0].Gateway;
    const envText = await readFile(envFile, 'utf8');
    await writeFile(envFile, envText.replace('127.0.0.1,172.17.0.0/16', gatewayIp), {
      mode: 0o600,
    });
    container = docker(
      'run',
      '-d',
      '--pull',
      'never',
      '--name',
      name,
      '--network',
      network,
      '--label',
      'traefik.enable=false',
      '--memory',
      '1g',
      '--cpus',
      '2',
      '-p',
      `127.0.0.1:${kcPort}:8080`,
      '--tmpfs',
      '/opt/keycloak/data:rw,uid=1000,gid=0,mode=0770',
      '--env-file',
      envFile,
      '--mount',
      `type=bind,source=${importFile},target=/opt/keycloak/data/import/epa-demo-realm.json,readonly`,
      image,
      'start-dev',
      '--import-realm',
    );
    console.info('Isolated pinned Keycloak started; loopback only, tmpfs, no existing volumes.');
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try {
        const result = await fetch(`${server}/realms/epa-demo/.well-known/openid-configuration`, {
          signal: AbortSignal.timeout(1000),
        });
        ready = result.ok;
        await result.body?.cancel();
        if (ready) break;
      } catch {
        /* Await this isolated provider only. */
      }
      await setTimeout(1000);
    }
    requireCondition(ready, 'Isolated Keycloak did not become ready');
    const legacySettings = standardSettings(env);
    let legacyApi = await adminApi(legacySettings);
    const user = (await legacyApi('/users?username=demo-versicherte&exact=true'))[0];
    await legacyApi(`/users/${user.id}`, 'PUT', {
      ...user,
      email: 'demo-versicherte@example.invalid',
    });
    const before = await preservationSnapshot(legacyApi);
    const first = await configurePublicRealm({ settings, action: 'apply' });
    requireCondition(first.status === 'created', 'Fresh public realm was not created');
    requireCondition(
      (await configurePublicRealm({ settings, action: 'apply' })).status === 'unchanged',
      'Repeat is not idempotent',
    );
    const wrongSecret = secret();
    let rejected = false;
    try {
      await configurePublicRealm({
        settings: { ...settings, secret: wrongSecret },
        action: 'apply',
      });
    } catch {
      rejected = true;
    }
    requireCondition(rejected, 'Conflicting credentials were not rejected');
    const account = { username: 'demo-a123', password: secret() };
    const replacement = secret();
    secrets.add(account.password);
    secrets.add(replacement);
    requireCondition(
      (await provisionDemoAccount({ settings, account })).status === 'created',
      'Fresh demo account failed',
    );
    let publicApi = await adminApi(settings, publicRealmName);
    const [createdAccount] = await publicApi('/users?username=demo-a123&exact=true');
    console.info(
      JSON.stringify({
        accountProvisioning: {
          enabled: createdAccount.enabled === true,
          syntheticProfile:
            createdAccount.firstName === 'Synthetic' && createdAccount.lastName === 'Demo',
          syntheticEmail: createdAccount.email === 'demo-a123@example.invalid',
          ownerPresent:
            createdAccount.attributes?.['playground.managed-by']?.[0] ===
            'public-playground-oauth-deployment',
          requiredPasswordChange: createdAccount.requiredActions?.includes('UPDATE_PASSWORD'),
        },
      }),
    );
    requireCondition(
      (await provisionDemoAccount({ settings, account })).status === 'unchanged',
      'Repeat account failed',
    );
    const { cert, leaf, keyFile } = await publicTestTls(directory);
    gateway = createServer({ key: await readFile(keyFile), cert: leaf }, (request, response) => {
      if (
        !request.url.startsWith('/realms/playground-public/') &&
        !request.url.startsWith('/resources/')
      ) {
        response.writeHead(404).end();
        return;
      }
      const upstream = httpRequest(
        `${server}${request.url}`,
        {
          method: request.method,
          headers: {
            ...request.headers,
            host: 'auth-playground.yappai.de',
            'x-forwarded-host': 'auth-playground.yappai.de',
            'x-forwarded-proto': 'https',
            'x-forwarded-port': '443',
            'x-forwarded-for': '127.0.0.1',
          },
        },
        (result) => {
          response.writeHead(result.statusCode, result.headers);
          result.pipe(response);
        },
      );
      upstream.on('error', () => response.writeHead(502).end());
      request.pipe(upstream);
    });
    await new Promise((resolve) => gateway.listen(tlsPort, '127.0.0.1', resolve));
    const request = publicRequest(tlsPort, cert);
    await changeInitialPassword(request, account.password, replacement, secrets);
    const verifiedTokens = [];
    const flow = await verifyStandardFlow(
      settings,
      { ...env, KEYCLOAK_VERIFICATION_USERNAME: account.username, TEST_USER_PASSWORD: replacement },
      secrets,
      { issuer: publicIssuer, request, onTokens: (tokens) => verifiedTokens.push(tokens) },
    );
    await rejectPublicAccount(request, 'demo-unprovisioned', replacement, secrets);
    const [activeAccount] = await publicApi('/users?username=demo-a123&exact=true');
    await publicApi(`/users/${activeAccount.id}`, 'PUT', { ...activeAccount, enabled: false });
    try {
      await rejectPublicAccount(request, account.username, replacement, secrets);
    } finally {
      await publicApi(`/users/${activeAccount.id}`, 'PUT', activeAccount);
    }
    const runtime = verifyRuntime
      ? await verifyRuntime({
          directory,
          env,
          settings,
          kcPort,
          cert,
          keyFile,
          account: { username: account.username, password: replacement },
          verifiedTokens,
          secrets,
          closeGateway: () => new Promise((resolve) => gateway.close(resolve)),
        })
      : undefined;
    requireCondition(
      (await provisionDemoAccount({ settings, account })).status === 'unchanged',
      'Repeat after password change failed',
    );
    // The full runtime suite can exceed the administrator Access Token lifetime.
    // Reauthenticate the test control plane; never extend or relax provider lifetimes.
    publicApi = await adminApi(settings, publicRealmName);
    const [completedAccount] = await publicApi('/users?username=demo-a123&exact=true');
    requireCondition(
      !completedAccount.requiredActions.includes('UPDATE_PASSWORD'),
      'Repeat restored the initial password action',
    );
    await publicApi(`/users/${completedAccount.id}`, 'PUT', {
      ...completedAccount,
      lastName: 'Conflicting',
    });
    let accountConflict = false;
    try {
      await provisionDemoAccount({ settings, account });
    } catch {
      accountConflict = true;
    }
    requireCondition(accountConflict, 'Conflicting account was not rejected');
    const [unchangedConflict] = await publicApi('/users?username=demo-a123&exact=true');
    requireCondition(
      unchangedConflict.lastName === 'Conflicting',
      'Conflicting account was overwritten',
    );
    const legacy = await verifyStandardFlow(legacySettings, env, secrets);
    legacyApi = await adminApi(legacySettings);
    requireCondition(
      (await preservationSnapshot(legacyApi)) === before,
      'Legacy realm configuration changed',
    );
    const logs = docker('logs', container);
    requireCondition(
      ![...secrets].some((value) => value.length > 12 && logs.includes(value)),
      'Provider logs disclosed protocol secrets',
    );
    const result = {
      status: 'passed',
      runtime,
      publicChecks: flow,
      legacyChecks: legacy,
      freshRepeatConflict: 'passed',
      requiredPasswordChange: 'passed',
      accountRepeatConflict: 'passed',
      unprovisionedAndDisabledAccounts: 'rejected',
      epaPreservation: 'passed',
      disclosure: 'passed',
      tls: 'private test CA, normal hostname/chain verification',
      providerProductionGate: 'open; isolated start-dev only',
    };
    await writeFile(join(directory, 'results.json'), JSON.stringify(result, null, 2), {
      mode: 0o600,
    });
    console.info(JSON.stringify({ ...result, directory }, null, 2));
    return result;
  } catch (error) {
    // Failure names are bounded local assertions; never print provider responses or request URLs.
    console.error(
      error instanceof Error && !error.cause
        ? error.message
        : 'Isolated public realm verification failed',
    );
    throw new Error('Isolated public realm/runtime verification failed');
  } finally {
    if (gateway?.listening) await new Promise((resolve) => gateway.close(resolve));
    if (container) {
      docker('stop', '--time', '10', container);
      docker('rm', container);
    }
    if (network) docker('network', 'rm', network);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await verifyIsolatedPublicRealm();
  } catch {
    process.exitCode = 1;
  }
}
