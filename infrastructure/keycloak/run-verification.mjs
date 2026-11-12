import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import {
  adminApi,
  ownerAttribute,
  ownerValue,
  readStandardResources,
  requireCondition,
  standardDefinition,
  standardSettings,
} from './standard-client.mjs';
import { migrateStandardClient } from './migrate-standard-client.mjs';
import { verifyStandardFlow } from './verify-standard-client.mjs';

const image = 'quay.io/keycloak/keycloak:26.8.0';
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
function digest(value) {
  function normalize(entry) {
    if (Array.isArray(entry))
      return entry
        .map(normalize)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    if (entry && typeof entry === 'object')
      return Object.fromEntries(
        Object.entries(entry)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, normalize(item)]),
      );
    return entry;
  }
  return createHash('sha256')
    .update(JSON.stringify(normalize(value)))
    .digest('hex');
}

export async function preservationSnapshot(api) {
  const clients = (await api('/clients?max=10000')).filter(
    (client) => client.clientId !== 'playground-oidc',
  );
  const scopes = (await api('/client-scopes')).filter(
    (scope) => scope.attributes?.[ownerAttribute] !== ownerValue,
  );
  const users = await api('/users?max=10000&briefRepresentation=false');
  requireCondition(
    users.length === (await api('/users/count')),
    'User snapshot exceeded its bound',
  );
  const details = [];
  for (const client of clients) {
    const full = await api(`/clients/${client.id}`);
    const roles = await api(`/clients/${client.id}/roles`);
    const defaults = await api(`/clients/${client.id}/default-client-scopes`);
    const optional = await api(`/clients/${client.id}/optional-client-scopes`);
    const secret =
      !full.publicClient && !full.bearerOnly
        ? await api(`/clients/${client.id}/client-secret`)
        : null;
    details.push({ full, roles, defaults, optional, secret });
  }
  const userMappings = [];
  for (const user of users) {
    userMappings.push({
      id: user.id,
      roles: await api(`/users/${user.id}/role-mappings`),
      groups: await api(`/users/${user.id}/groups`),
    });
  }
  return digest({
    realm: await api(''),
    clients: details,
    scopes,
    users,
    userMappings,
    policies: await api('/client-policies/policies'),
    profiles: await api('/client-policies/profiles'),
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForRealm(server) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`${server}/realms/epa-demo/.well-known/openid-configuration`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        await response.body?.cancel();
        return;
      }
      await response.body?.cancel();
    } catch {
      // The disposable server has not started listening yet.
    }
    await setTimeout(1000);
  }
  throw new Error('Disposable Keycloak startup timed out');
}

async function scenario(kind, directory) {
  const suffix = randomBytes(6).toString('hex');
  const network = `epa-keycloak-verify-${suffix}`;
  const container = network;
  const port = await availablePort();
  const server = `http://127.0.0.1:${port}`;
  const secret = () => randomBytes(32).toString('base64url');
  const env = {
    KEYCLOAK_ADMIN_URL: server,
    KEYCLOAK_ADMIN_USERNAME: 'verification-admin',
    KEYCLOAK_ADMIN_PASSWORD: secret(),
    PLAYGROUND_OIDC_CLIENT_ID: 'playground-oidc',
    PLAYGROUND_OIDC_CLIENT_SECRET: secret(),
    PLAYGROUND_OIDC_REDIRECT_URI: 'http://127.0.0.1:3000/api/oauth/callback',
    OIDC_CLIENT_ID: 'epa-auth-server',
    OIDC_CLIENT_SECRET: secret(),
    OIDC_DEFAULT_REDIRECT_URI: 'http://127.0.0.1:3000/callback',
    TEST_USER_PASSWORD: secret(),
  };
  const settings = standardSettings(env);
  const definition = await standardDefinition(settings);
  const realm = JSON.parse(
    await readFile(new URL('./epa-demo-realm.json', import.meta.url), 'utf8'),
  );
  if (kind === 'existing') {
    realm.clients = realm.clients.filter((client) => client.clientId !== 'playground-oidc');
    delete realm.clientScopes;
  }
  const importFile = join(directory, `${kind}-realm.json`);
  const envFile = join(directory, `${kind}.env`);
  await writeFile(importFile, JSON.stringify(realm), { mode: 0o644 });
  const containerEnv = {
    ...env,
    KC_BOOTSTRAP_ADMIN_USERNAME: env.KEYCLOAK_ADMIN_USERNAME,
    KC_BOOTSTRAP_ADMIN_PASSWORD: env.KEYCLOAK_ADMIN_PASSWORD,
    KC_HOSTNAME: server,
    KC_HEALTH_ENABLED: 'true',
    KC_DB: 'dev-file',
  };
  await writeFile(
    envFile,
    Object.entries(containerEnv)
      .map(([name, value]) => `${name}=${value}`)
      .join('\n'),
    { mode: 0o600 },
  );
  const secrets = new Set(
    Object.entries(env)
      .filter(([name]) => name.includes('SECRET') || name.includes('PASSWORD'))
      .map(([, value]) => value),
  );
  let containerId;
  let networkId;
  try {
    networkId = docker('network', 'create', '--label', 'epa.verification=001-oidc-pkce', network);
    containerId = docker(
      'run',
      '--detach',
      '--pull',
      'never',
      '--name',
      container,
      '--network',
      network,
      '--label',
      'traefik.enable=false',
      '--memory',
      '1g',
      '--cpus',
      '2',
      '--publish',
      `127.0.0.1:${port}:8080`,
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
    console.info(`${kind}: disposable Keycloak started on loopback; waiting for realm import`);
    await waitForRealm(server);
    const inspected = JSON.parse(docker('inspect', containerId))[0];
    requireCondition(
      inspected.HostConfig.PortBindings['8080/tcp'][0].HostIp === '127.0.0.1',
      'Verification publication is not loopback-only',
    );
    requireCondition(
      !inspected.Mounts.some((mount) => mount.Type === 'volume'),
      'Verification must not mount a Docker volume',
    );
    requireCondition(
      !Object.hasOwn(inspected.NetworkSettings.Networks, 'dev-proxy'),
      'Verification joined the public proxy network',
    );
    const api = await adminApi(settings);
    // Complete only the disposable identity; retain Keycloak's VERIFY_PROFILE validation.
    const testIdentity = (await api('/users?username=demo-versicherte&exact=true'))[0];
    await api(`/users/${testIdentity.id}`, 'PUT', {
      ...testIdentity,
      email: 'demo-versicherte@example.invalid',
    });
    const journal = join(directory, `${kind}-migration.json`);
    let baseline;
    if (kind === 'existing') {
      await api('/users', 'POST', {
        username: 'migration-preservation-user',
        enabled: true,
        attributes: { fixture: ['not-patient-data'] },
      });
      await api('/clients', 'POST', {
        clientId: 'migration-preservation-client',
        enabled: false,
        publicClient: true,
      });
      baseline = await preservationSnapshot(api);
      await api('/client-scopes', 'POST', { name: 'demo.fhir.read', protocol: 'openid-connect' });
      let refused = false;
      try {
        await migrateStandardClient({ settings, stateFile: journal });
      } catch (error) {
        refused =
          error.message === 'Client scope name is already used by a conflicting configuration';
      }
      requireCondition(refused, 'Migration accepted an unowned conflicting scope');
      const collision = (await api('/client-scopes')).find(
        (scope) => scope.name === 'demo.fhir.read',
      );
      requireCondition(
        !(await readStandardResources(api, definition)).client,
        'Conflict preflight created a client',
      );
      await api(`/client-scopes/${collision.id}`, 'DELETE');
    }
    const first = await migrateStandardClient({ settings, stateFile: journal });
    requireCondition(
      first.created === (kind === 'existing' ? 3 : 0),
      'Unexpected migration creation count',
    );
    if (baseline)
      requireCondition(
        (await preservationSnapshot(api)) === baseline,
        'Migration changed pre-existing realm configuration/users',
      );
    const managedBefore = digest(await readStandardResources(api, definition));
    const second = await migrateStandardClient({ settings, stateFile: journal });
    requireCondition(
      second.created === 0 && second.status === 'unchanged',
      'Repeated migration was not a no-op',
    );
    requireCondition(
      digest(await readStandardResources(api, definition)) === managedBefore,
      'Repeated migration changed managed resource identities/configuration',
    );
    if (baseline)
      requireCondition(
        (await preservationSnapshot(api)) === baseline,
        'Repeated migration changed pre-existing data',
      );
    let rollbackVerified = false;
    if (kind === 'existing') {
      const resources = await readStandardResources(api, definition);
      const unrelated = (await api('/clients?clientId=migration-preservation-client'))[0];
      await api(`/clients/${unrelated.id}/optional-client-scopes/${resources.scopes[1].id}`, 'PUT');
      let protectedReference = false;
      try {
        await migrateStandardClient({ settings, stateFile: journal, action: 'rollback' });
      } catch (error) {
        protectedReference =
          error.message === 'Rollback refused: another client uses a created scope';
      }
      requireCondition(protectedReference, 'Rollback ignored another client using its scope');
      await api(
        `/clients/${unrelated.id}/optional-client-scopes/${resources.scopes[1].id}`,
        'DELETE',
      );
      await migrateStandardClient({ settings, stateFile: journal, action: 'rollback' });
      requireCondition(
        (await preservationSnapshot(api)) === baseline,
        'Rollback changed pre-existing realm data',
      );
      const removed = await readStandardResources(api, definition);
      requireCondition(
        !removed.client && removed.scopes.every((scope) => !scope),
        'Rollback did not remove only the created resources',
      );
      const repeatedRollback = await migrateStandardClient({
        settings,
        stateFile: journal,
        action: 'rollback',
      });
      requireCondition(repeatedRollback.removed === 0, 'Repeated rollback was not a no-op');
      await migrateStandardClient({ settings, stateFile: join(directory, `${kind}-reapply.json`) });
      requireCondition(
        (await preservationSnapshot(api)) === baseline,
        'Reapplication changed pre-existing realm data',
      );
      rollbackVerified = true;
    }
    const flows = await verifyStandardFlow(settings, env, secrets);
    const logs = docker('logs', containerId);
    requireCondition(
      ![...secrets].some((value) => logs.includes(value)),
      'Disposable Keycloak logs contain a protocol secret',
    );
    return {
      scenario: kind,
      passed: flows.passed,
      checks: flows.checks,
      migrationRepeated: true,
      preserved: kind === 'existing',
      rollbackVerified,
      secretLogScan: 'passed',
    };
  } catch (error) {
    if (containerId) {
      await writeFile(join(directory, `${kind}-private-server.log`), docker('logs', containerId), {
        mode: 0o600,
      });
    }
    throw error;
  } finally {
    if (containerId) {
      docker('stop', '--time', '15', containerId);
      docker('rm', containerId);
    }
    if (networkId) docker('network', 'rm', networkId);
  }
}

if (
  process.argv[1]?.endsWith('/run-verification.mjs') ||
  process.argv[1] === 'infrastructure/keycloak/run-verification.mjs'
) {
  const directory = await mkdtemp(join(tmpdir(), 'epa-keycloak-verification-'));
  try {
    docker('image', 'inspect', image);
    const results = [];
    for (const kind of ['fresh', 'existing']) {
      results.push(await scenario(kind, directory));
    }
    await writeFile(join(directory, 'results.json'), JSON.stringify(results, null, 2), {
      mode: 0o600,
    });
    console.info(JSON.stringify({ status: 'passed', directory, results }, null, 2));
  } catch (error) {
    console.error(
      error instanceof Error && !error.cause
        ? error.message
        : 'Isolated Keycloak verification failed',
    );
    console.error(`Private diagnostic files: ${directory}`);
    process.exitCode = 1;
  }
}
